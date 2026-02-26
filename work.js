/**
 * Stackout AI Backend - Cloudflare Worker
 * 集成：D1 鉴权、JWT 签发、模型权限控制、DeepSeek 流式代理
 */

// 预设常量 (建议在 Cloudflare 控制台通过 Environment Variables 覆盖)
const JWT_SECRET = 'stackout-secret-default'
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

// --- 辅助函数：JWT 签发 ---
async function signJWT(payload, secret) {
  const encoder = new TextEncoder()
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const data = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 * 7 })) // 7天过期

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${data}`))
  const b64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return `${header}.${data}.${b64Signature}`
}

// --- 辅助函数：JWT 校验 ---
async function verifyJWT(token, secret) {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.')
    const encoder = new TextEncoder()
    const data = `${headerB64}.${payloadB64}`

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const sigArray = new Uint8Array(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => c.charCodeAt(0)),
    )
    const isValid = await crypto.subtle.verify('HMAC', key, sigArray, encoder.encode(data))

    if (!isValid) return null
    const payload = JSON.parse(atob(payloadB64))
    if (payload.exp < Date.now() / 1000) return null
    return payload
  } catch (e) {
    return null
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin')
    const allowedOrigins = [
      'https://stackout.work',
      'https://www.stackout.work',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ]

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin)
        ? origin
        : 'https://stackout.work',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization', // 必须允许 Authorization
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)

    // 1. 登录接口逻辑 [对接 D1 数据库]
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      try {
        const { username, password } = await request.json()

        // 查询数据库中的用户
        const user = await env.DB.prepare(
          'SELECT id, username, password_hash, display_name, role FROM users WHERE username = ?',
        )
          .bind(username)
          .first()

        // 验证密码 (此处逻辑需与你 schema.sql 中存入的哈希方式一致)
        const encoder = new TextEncoder()
        const data = encoder.encode(password)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const inputHash = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')

        if (!user || user.password_hash !== inputHash) {
          return new Response(JSON.stringify({ error: '账号或密码错误' }), {
            status: 401,
            headers: corsHeaders,
          })
        }

        // 签发 JWT Token (包含用户角色)
        const token = await signJWT(
          { id: user.id, role: user.role || 'user' },
          env.JWT_SECRET || JWT_SECRET,
        )

        return new Response(
          JSON.stringify({
            token,
            user: {
              id: user.id,
              username: user.username,
              displayName: user.display_name,
              role: user.role || 'user',
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: corsHeaders,
        })
      }
    }

    // 2. 聊天接口逻辑 [增加权限校验]
    if (url.pathname === '/chat/completions' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization')
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

        // 校验 JWT
        const userData = token ? await verifyJWT(token, env.JWT_SECRET || JWT_SECRET) : null
        const body = await request.json()

        // 权限规则拦截
        // - 仅 admin 可以使用推理模型 (R1)
        if (body.model === 'deepseek-reasoner' && userData?.role !== 'admin') {
          return new Response(
            JSON.stringify({
              error: 'Forbidden',
              message: 'DeepSeek-R1 (推理) 模型仅限管理员使用。',
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }

        // - 未登录用户无法进行对话（或者你可以设定仅限 guest 访问特定模型）
        if (!userData && !['deepseek-chat'].includes(body.model)) {
          return new Response(JSON.stringify({ error: '请登录后使用该模型' }), {
            status: 401,
            headers: corsHeaders,
          })
        }

        // 转发请求到 DeepSeek
        const dsResponse = await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify(body),
        })

        const { readable, writable } = new TransformStream()
        dsResponse.body.pipeTo(writable)

        return new Response(readable, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
          },
        })
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: corsHeaders,
        })
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders })
  },
}
