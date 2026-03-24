interface Env {
  BIZ_API_BASE_URL?: string
  BIZ_API_FALLBACK_BASE_URL?: string
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

async function forwardRequest(request: Request, requestUrl: URL, targetUrl: string): Promise<Response> {
  const headers = new Headers(request.headers)
  headers.set('host', new URL(targetUrl).host)
  headers.set('x-forwarded-host', requestUrl.host)
  headers.set('x-forwarded-proto', requestUrl.protocol.replace(':', ''))
  headers.delete('content-length')

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
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

  let upstreamResponse: Response
  try {
    upstreamResponse = await forwardRequest(request, requestUrl, targetUrl)
  } catch (primaryError) {
    const fallbackUrl = buildFallbackTargetUrl(requestUrl, env)
    if (!fallbackUrl) {
      return new Response(JSON.stringify({ error: 'Biz upstream unreachable', detail: String(primaryError) }), {
        status: 525,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })
    }

    upstreamResponse = await forwardRequest(request, requestUrl, fallbackUrl)
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
