interface Env {
  BIZ_API_BASE_URL?: string
  BIZ_API_FALLBACK_BASE_URL?: string
  BIZ_API_IP_FALLBACK_BASE_URL?: string
}

function buildTargetUrl(requestUrl: URL, env: Env): string {
  const base = (env.BIZ_API_BASE_URL || 'https://biz.stackout.work').replace(/\/$/, '')
  const mappedPath = requestUrl.pathname.replace(/^\/bizApi/, '/api')
  return `${base}${mappedPath}${requestUrl.search}`
}

function buildFallbackTargetUrl(requestUrl: URL, env: Env): string | null {
  if (!env.BIZ_API_FALLBACK_BASE_URL) return null
  const base = env.BIZ_API_FALLBACK_BASE_URL.replace(/\/$/, '')
  const mappedPath = requestUrl.pathname.replace(/^\/bizApi/, '/api')
  return `${base}${mappedPath}${requestUrl.search}`
}

function buildIpFallbackTargetUrl(requestUrl: URL, env: Env): string {
  const configured = env.BIZ_API_IP_FALLBACK_BASE_URL
  const base = (configured || 'http://121.37.42.98:8080').replace(/\/$/, '')
  const mappedPath = requestUrl.pathname.replace(/^\/bizApi/, '/api')
  return `${base}${mappedPath}${requestUrl.search}`
}

function buildHttpDowngradeUrl(targetUrl: string): string | null {
  if (!targetUrl.startsWith('https://')) return null
  return targetUrl.replace(/^https:/, 'http:')
}

function shouldRetryByStatus(status: number): boolean {
  return status === 525 || status === 526
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
  bodyBuffer?: ArrayBuffer,
): Promise<Response> {
  const headers = new Headers(request.headers)
  headers.set('host', new URL(targetUrl).host)
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

export const onRequest = async (context: { request: Request; env: Env }) => {
  const { request, env } = context
  const requestUrl = new URL(request.url)
  const targetUrl = buildTargetUrl(requestUrl, env)

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
    targetUrl,
    buildFallbackTargetUrl(requestUrl, env),
    buildHttpDowngradeUrl(targetUrl),
    buildIpFallbackTargetUrl(requestUrl, env),
  ])

  let upstreamResponse: Response | null = null
  let lastError: unknown = null

  for (const candidate of candidateTargets) {
    try {
      const response = await forwardRequest(request, requestUrl, candidate, bodyBuffer)
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
