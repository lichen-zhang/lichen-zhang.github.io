import type { Env } from '../types/env'
import type { LoginBody, SendCodeBody, UserDTO } from '../types/dto'
import { UserRepository } from '../repositories/userRepo'
import { HttpError } from '../utils/http'
import { signJwt, verifyJwt } from '../utils/jwt'
import { requireEmail, requireText } from '../utils/validator'
import { QuotaService } from './quotaService'

type CircuitStatus = 'closed' | 'open' | 'half-open'

interface CircuitState {
  status: CircuitStatus
  failures: number
  openedUntil: number
  halfOpenProbeInFlight: boolean
}

const emailAuthCircuits = new Map<string, CircuitState>()

export class AuthService {
  private readonly userRepo: UserRepository
  private readonly quotaService: QuotaService

  constructor(private readonly env: Env) {
    this.userRepo = new UserRepository(env.DB)
    this.quotaService = new QuotaService(this.userRepo)
  }

  private jwtSecret(): string {
    const value = (this.env.JWT_SECRET || '').trim()
    if (!value) {
      throw new HttpError(500, '未配置 JWT_SECRET')
    }
    return value
  }

  private emailAuthBaseUrl(): string {
    const value = (this.env.EMAIL_AUTH_BASE_URL || '').trim()
    if (!value) {
      throw new HttpError(500, '未配置 EMAIL_AUTH_BASE_URL')
    }
    return value.replace(/\/$/, '')
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  private emailAuthMaxAttempts(): number {
    const value = Number(this.env.EMAIL_AUTH_MAX_ATTEMPTS || 3)
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 3
  }

  private emailAuthTimeoutMs(): number {
    const value = Number(this.env.EMAIL_AUTH_TIMEOUT_MS || 5000)
    return Number.isFinite(value) && value >= 500 ? Math.floor(value) : 5000
  }

  private emailAuthRetryBaseDelayMs(): number {
    const value = Number(this.env.EMAIL_AUTH_RETRY_BASE_DELAY_MS || 150)
    return Number.isFinite(value) && value >= 10 ? Math.floor(value) : 150
  }

  private emailAuthCircuitFailureThreshold(): number {
    const value = Number(this.env.EMAIL_AUTH_CIRCUIT_FAILURE_THRESHOLD || 5)
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 5
  }

  private emailAuthCircuitOpenMs(): number {
    const value = Number(this.env.EMAIL_AUTH_CIRCUIT_OPEN_MS || 30000)
    return Number.isFinite(value) && value >= 1000 ? Math.floor(value) : 30000
  }

  private circuitState(path: string): CircuitState {
    const key = path.trim().toLowerCase() || '/'
    let state = emailAuthCircuits.get(key)
    if (!state) {
      state = {
        status: 'closed',
        failures: 0,
        openedUntil: 0,
        halfOpenProbeInFlight: false,
      }
      emailAuthCircuits.set(key, state)
    }
    return state
  }

  private beginCircuit(path: string): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
    const state = this.circuitState(path)
    const now = Date.now()

    if (state.status === 'open') {
      if (state.openedUntil > now) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((state.openedUntil - now) / 1000)),
        }
      }
      state.status = 'half-open'
      state.halfOpenProbeInFlight = false
      state.failures = 0
    }

    if (state.status === 'half-open') {
      if (state.halfOpenProbeInFlight) {
        return { allowed: false, retryAfterSeconds: 1 }
      }
      state.halfOpenProbeInFlight = true
      return { allowed: true }
    }

    return { allowed: true }
  }

  private recordCircuitSuccess(path: string): void {
    const state = this.circuitState(path)
    state.status = 'closed'
    state.failures = 0
    state.openedUntil = 0
    state.halfOpenProbeInFlight = false
  }

  private recordCircuitNeutral(path: string): void {
    const state = this.circuitState(path)
    if (state.status === 'half-open') {
      state.status = 'closed'
      state.failures = 0
      state.openedUntil = 0
    }
    state.halfOpenProbeInFlight = false
  }

  private recordCircuitFailure(path: string): void {
    const state = this.circuitState(path)
    const now = Date.now()

    if (state.status === 'half-open') {
      state.status = 'open'
      state.failures = 0
      state.openedUntil = now + this.emailAuthCircuitOpenMs()
      state.halfOpenProbeInFlight = false
      return
    }

    state.failures += 1
    if (state.failures >= this.emailAuthCircuitFailureThreshold()) {
      state.status = 'open'
      state.failures = 0
      state.openedUntil = now + this.emailAuthCircuitOpenMs()
    }
    state.halfOpenProbeInFlight = false
  }

  private shouldRetryStatus(status: number): boolean {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504
  }

  private isLikelyNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false
    if (error.name === 'AbortError') return true
    const message = error.message.toLowerCase()
    return message.includes('network') || message.includes('fetch') || message.includes('timeout')
  }

  private extractClientIp(request: Request | undefined): string {
    if (!request) return ''
    const forwardedFor = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || ''
    if (forwardedFor.includes(',')) {
      return forwardedFor.split(',')[0]?.trim() || ''
    }
    return forwardedFor.trim()
  }

  private isExposeDevCodeEnabled(): boolean {
    return String(this.env.EXPOSE_DEV_CODE || '').toLowerCase() === 'true'
  }

  private async callEmailAuth(
    path: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
  ): Promise<Record<string, unknown>> {
    const maxAttempts = this.emailAuthMaxAttempts()
    const timeoutMs = this.emailAuthTimeoutMs()
    const retryBaseDelayMs = this.emailAuthRetryBaseDelayMs()
    const circuitGate = this.beginCircuit(path)

    if (!circuitGate.allowed) {
      throw new HttpError(503, `邮箱服务短暂熔断，请在 ${circuitGate.retryAfterSeconds} 秒后重试`)
    }

    let lastError: unknown = null
    let upstreamFailure = false

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const resp = await fetch(`${this.emailAuthBaseUrl()}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        const payload = (await resp.json().catch(() => ({}))) as Record<string, unknown>
        if (resp.ok) {
          this.recordCircuitSuccess(path)
          return payload
        }

        const message = typeof payload.message === 'string' ? payload.message : '邮箱服务请求失败'
        const err = new HttpError(resp.status, message)
        const canRetry = this.shouldRetryStatus(resp.status) && attempt < maxAttempts
        if (!canRetry) {
          if (this.shouldRetryStatus(resp.status) || resp.status >= 500) {
            upstreamFailure = true
            this.recordCircuitFailure(path)
          } else {
            this.recordCircuitNeutral(path)
          }
          throw err
        }

        upstreamFailure = true
        lastError = err
      } catch (error: unknown) {
        if (error instanceof HttpError) {
          throw error
        }

        upstreamFailure = true
        lastError =
          error instanceof Error
            ? error
            : new Error('邮箱服务网络异常')
      } finally {
        clearTimeout(timer)
      }

      if (attempt < maxAttempts) {
        const jitter = Math.floor(Math.random() * 40)
        await this.delay(retryBaseDelayMs * 2 ** (attempt - 1) + jitter)
      }
    }

    if (upstreamFailure) {
      this.recordCircuitFailure(path)
    } else {
      this.recordCircuitNeutral(path)
    }

    const finalMessage =
      lastError instanceof Error ? lastError.message : '邮箱服务暂时不可用'
    throw new HttpError(502, this.isLikelyNetworkError(lastError) ? '邮箱服务网络波动，请稍后重试' : finalMessage)
  }

  async sendCode(
    body: SendCodeBody,
    request?: Request,
  ): Promise<{ success: true; cooldownSeconds?: number; expireSeconds?: number; debugCode?: string }> {
    const email = requireEmail(body.email)
    const clientIp = this.extractClientIp(request)
    const userAgent = request?.headers.get('user-agent') || ''

    const payload = await this.callEmailAuth(
      '/api/auth/email-code/send',
      {
        email,
        behaviorStartedAt: typeof body.behaviorStartedAt === 'number' ? body.behaviorStartedAt : undefined,
        behaviorSubmitAt: typeof body.behaviorSubmitAt === 'number' ? body.behaviorSubmitAt : Date.now(),
        website: typeof body.website === 'string' ? body.website : '',
      },
      {
        ...(clientIp ? { 'x-forwarded-for': clientIp } : {}),
        ...(userAgent ? { 'user-agent': userAgent } : {}),
        'x-worker-request-id': crypto.randomUUID(),
      },
    )
    return {
      success: true,
      cooldownSeconds: typeof payload.cooldownSeconds === 'number' ? payload.cooldownSeconds : undefined,
      expireSeconds: typeof payload.expireSeconds === 'number' ? payload.expireSeconds : undefined,
      debugCode:
        this.isExposeDevCodeEnabled() && typeof payload.debugCode === 'string'
          ? payload.debugCode
          : undefined,
    }
  }

  async login(body: LoginBody): Promise<{ token: string; user: UserDTO }> {
    const email = requireEmail(body.email)
    const code = requireText(body.code, 'code')
    await this.callEmailAuth('/api/auth/email-code/verify', { email, code })

    let user = await this.userRepo.findByEmail(email)
    if (!user) {
      user = await this.userRepo.createByEmail(email)
    }
    const latestUser = await this.quotaService.refreshUser(user.id)
    const token = await signJwt({ userId: latestUser.id, email: latestUser.email, iat: Math.floor(Date.now() / 1000) }, this.jwtSecret())
    return { token, user: latestUser }
  }

  async getUserFromToken(token: string): Promise<UserDTO> {
    const payload = await verifyJwt(token, this.jwtSecret())
    if (!payload || typeof payload.userId !== 'string') {
      throw new HttpError(401, '登录状态已失效，请重新登录')
    }
    const user = await this.quotaService.refreshUser(payload.userId)
    return user
  }

  async me(userId: string): Promise<UserDTO> {
    const user = await this.quotaService.refreshUser(userId)
    return user
  }
}
