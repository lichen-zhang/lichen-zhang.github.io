interface Env {
  BIZ_API_BASE_URL?: string
}

function buildTargetUrl(requestUrl: URL, env: Env): string {
  const base = (env.BIZ_API_BASE_URL || 'https://biz.stackout.work').replace(/\/$/, '')
  const mappedPath = requestUrl.pathname.replace(/^\/bizApi/, '/api')
  return `${base}${mappedPath}${requestUrl.search}`
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

  const headers = new Headers(request.headers)
  headers.set('host', new URL(targetUrl).host)
  headers.set('x-forwarded-host', requestUrl.host)
  headers.set('x-forwarded-proto', requestUrl.protocol.replace(':', ''))
  headers.delete('content-length')

  const upstreamResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  })

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
