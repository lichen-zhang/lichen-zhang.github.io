export type PlanType = 'free' | 'pro'
export type PlanCode = 'pro_month' | 'pro_quarter'
export type GenerationType = 'topics' | 'article' | 'titles'

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
  run(): Promise<unknown>
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike
}

export interface Env {
  DB: D1DatabaseLike
  JWT_SECRET?: string
  ALLOWED_ORIGINS?: string
  EMAIL_AUTH_BASE_URL?: string
  EMAIL_AUTH_MAX_ATTEMPTS?: string
  EMAIL_AUTH_TIMEOUT_MS?: string
  EMAIL_AUTH_RETRY_BASE_DELAY_MS?: string
  EMAIL_AUTH_CIRCUIT_FAILURE_THRESHOLD?: string
  EMAIL_AUTH_CIRCUIT_OPEN_MS?: string
  EXPOSE_DEV_CODE?: string
  WECHAT_CALLBACK_SECRET?: string
  AI_GATEWAY_BASE_URL?: string
  AI_GATEWAY_API_KEY?: string
  BIZ_API_BASE_URL?: string
  DEEPSEEK_API_URL?: string
  DEEPSEEK_API_KEY?: string
  DEEPSEEK_MODEL?: string
  KIMI_API_URL?: string
  KIMI_API_KEY?: string
  KIMI_MODEL?: string
}
