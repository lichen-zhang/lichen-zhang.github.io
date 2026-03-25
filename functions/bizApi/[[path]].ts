const PRIMARY_BIZ_BASE_URL = 'https://stackout.work'

function buildTargetUrl(requestUrl: URL, base: string): string {
  const normalizedBase = base.replace(/\/$/, '')
  const mappedPath = requestUrl.pathname
  return `${normalizedBase}${mappedPath}${requestUrl.search}`
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

export const onRequest = async (context: { request: Request }) => {
  const { request } = context
  const requestUrl = new URL(request.url)

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

  const targetUrl = buildTargetUrl(requestUrl, PRIMARY_BIZ_BASE_URL)
  const upstreamResponse = await forwardRequest(request, requestUrl, targetUrl, bodyBuffer)

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
