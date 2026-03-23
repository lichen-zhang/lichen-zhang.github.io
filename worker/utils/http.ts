import type { Env } from '../types/env'

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function buildCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin')
  const envOrigins = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const allowList = envOrigins.length
    ? envOrigins
    : ['https://stackout.work', 'https://www.stackout.work', 'https://lichen-zhang-github-io.pages.dev']

  let allowOrigin = allowList[0] || '*'
  if (origin) {
    allowOrigin = allowList.includes(origin) ? origin : allowList[0] || '*'
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wechat-Sign',
  }
}

export function json(request: Request, env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(request, env),
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

export async function parseJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new HttpError(400, '请求体必须是合法 JSON')
  }
}

export function parsePageParams(url: URL): { page: number; pageSize: number } {
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const pageSizeRaw = Number(url.searchParams.get('pageSize') || '20')
  const pageSize = Math.min(50, Math.max(1, pageSizeRaw))
  return { page, pageSize }
}
