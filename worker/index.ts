import type { Env } from './types/env'
import { buildCorsHeaders, json } from './utils/http'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: buildCorsHeaders(request, env) })
    }

    const url = new URL(request.url)

    // Business APIs are fully migrated to Docker biz-backend and frozen in Worker.
    if (url.pathname.startsWith('/api/')) {
      const bizBaseUrl = (env.BIZ_API_BASE_URL || 'https://biz.stackout.work').replace(/\/$/, '')
      return json(
        request,
        env,
        {
          error: '业务接口已迁移到独立后端',
          code: 'BIZ_API_MOVED',
          movedTo: bizBaseUrl,
          docs: '请改用独立业务域名访问 /api/*'
        },
        410
      )
    }

    return json(request, env, { error: 'Not Found' }, 404)
  },
}
