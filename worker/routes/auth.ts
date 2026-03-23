import type { Env } from '../types/env'
import type { LoginBody, SendCodeBody } from '../types/dto'
import { json, parseJson } from '../utils/http'
import { AuthService } from '../services/authService'
import { requireAuthUser } from '../middleware/auth'

export async function handleSendCode(request: Request, env: Env, authService: AuthService): Promise<Response> {
  const body = await parseJson<SendCodeBody>(request)
  const result = await authService.sendCode(body, request)
  return json(request, env, result)
}

export async function handleLogin(request: Request, env: Env, authService: AuthService): Promise<Response> {
  const body = await parseJson<LoginBody>(request)
  const result = await authService.login(body)
  return json(request, env, result)
}

export async function handleMe(request: Request, env: Env, authService: AuthService): Promise<Response> {
  const user = await requireAuthUser(request, authService)
  return json(request, env, { user })
}
