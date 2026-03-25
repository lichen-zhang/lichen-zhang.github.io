const PRIMARY_BIZ_BASE_URL = 'https://biz.stackout.work'
const HTTP_DOWNGRADE_BIZ_BASE_URL = 'http://biz.stackout.work'
const FALLBACK_BIZ_BASE_URL = 'http://origin-biz.stackout.work:8080'
const FALLBACK_HOST_HEADER = '121.37.42.98'

function buildTargetUrl(requestUrl: URL, base: string): string {
  const normalizedBase = base.replace(/\/$/, '')
  const mappedPath = requestUrl.pathname.replace(/^\/bizApi/, '/api')
  return `${normalizedBase}${mappedPath}${requestUrl.search}`
}

function getHostOverrideForTarget(targetUrl: string): string | null {
  if (!targetUrl.startsWith(FALLBACK_BIZ_BASE_URL)) return null
  return FALLBACK_HOST_HEADER
}

function shouldRetryByStatus(status: number): boolean {
  return status === 525 || status === 526 || status === 530
}

function shouldRetryByResponse(response: Response): boolean {
  if (shouldRetryByStatus(response.status)) return true
  if (response.status !== 403) return false
  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  return contentType.includes('text/html')
}

function uniqueTargets(targets: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of targets) {
    if (!item) continue
    if (seen.has(item)) continue
    seen.add(item)
    result.push(item)
  }
  return result
}

async function forwardRequest(
  request: Request,
  requestUrl: URL,
  targetUrl: string,
  hostOverride: string | null,
  bodyBuffer?: ArrayBuffer,
): Promise<Response> {
  const headers = new Headers(request.headers)
  headers.set('host', hostOverride || new URL(targetUrl).host)
  headers.set('x-forwarded-host', requestUrl.host)
  headers.set('x-forwarded-proto', requestUrl.protocol.replace(':', ''))
  headers.delete('content-length')

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : bodyBuffer,
    redirect: 'manual',
  })
}

export const onRequest = async (context: { request: Request }) => {
  const { request } = context
  const requestUrl = new URL(request.url)

  if (requestUrl.pathname === '/bizApi/health' || requestUrl.pathname === '/bizApi/health/') {
    return new Response(JSON.stringify({
      ok: true,
      service: 'biz-edge',
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization',
      },
    })
  }

  const bodyBuffer = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : await request.arrayBuffer()

  const candidateTargets = uniqueTargets([
    buildTargetUrl(requestUrl, PRIMARY_BIZ_BASE_URL),
    buildTargetUrl(requestUrl, HTTP_DOWNGRADE_BIZ_BASE_URL),
    buildTargetUrl(requestUrl, FALLBACK_BIZ_BASE_URL),
  ])

  let upstreamResponse: Response | null = null
  let lastError: unknown = null

  for (const candidate of candidateTargets) {
    try {
      const hostOverride = getHostOverrideForTarget(candidate)
      const response = await forwardRequest(request, requestUrl, candidate, hostOverride, bodyBuffer)
      if (shouldRetryByResponse(response) && candidate !== candidateTargets[candidateTargets.length - 1]) {
        continue
      }
      upstreamResponse = response
      break
    } catch (error) {
      lastError = error
    }
  }

  if (!upstreamResponse) {
    return new Response(JSON.stringify({ error: 'Biz upstream unreachable', detail: String(lastError || 'unknown') }), {
      status: 525,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const responseHeaders = new Headers(upstreamResponse.headers)
  const origin = request.headers.get('Origin')
  if (origin) {
    responseHeaders.set('Access-Control-Allow-Origin', origin)
    responseHeaders.set('Vary', 'Origin')
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
}
