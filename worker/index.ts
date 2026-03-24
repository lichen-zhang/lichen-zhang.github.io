import type { Env } from './types/env'
import { buildCorsHeaders, json } from './utils/http'

function buildProxyUrl(requestUrl: URL, env: Env): URL {
  const bizBaseUrl = (env.BIZ_API_BASE_URL || 'https://biz.stackout.work').replace(/\/$/, '')
  return new URL(`${bizBaseUrl}${requestUrl.pathname}${requestUrl.search}`)
}

async function proxyBizRequest(request: Request, env: Env): Promise<Response> {
  const requestUrl = new URL(request.url)
  const targetUrl = buildProxyUrl(requestUrl, env)
  const headers = new Headers(request.headers)

  headers.set('host', targetUrl.host)
  headers.set('x-forwarded-host', requestUrl.host)
  headers.set('x-forwarded-proto', requestUrl.protocol.replace(':', ''))

  const proxiedRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  })

  const upstreamResponse = await fetch(proxiedRequest)
  const responseHeaders = new Headers(upstreamResponse.headers)
  const corsHeaders = buildCorsHeaders(request, env)

  Object.entries(corsHeaders).forEach(([key, value]) => {
    responseHeaders.set(key, value)
  })

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: buildCorsHeaders(request, env) })
      }

      return proxyBizRequest(request, env)
    }

    return json(request, env, { error: 'Not Found' }, 404)
  },
}
