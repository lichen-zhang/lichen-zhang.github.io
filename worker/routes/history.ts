import type { Env, GenerationType } from '../types/env'
import { json, parsePageParams, HttpError } from '../utils/http'
import { requireAuthUser } from '../middleware/auth'
import { AuthService } from '../services/authService'
import { HistoryService } from '../services/historyService'

function parseType(value: string | null): GenerationType | undefined {
  if (!value) return undefined
  if (value === 'topics' || value === 'article' || value === 'titles') return value
  throw new HttpError(400, 'type 参数不合法')
}

export async function handleHistoryList(
  request: Request,
  env: Env,
  authService: AuthService,
  historyService: HistoryService,
): Promise<Response> {
  const user = await requireAuthUser(request, authService)
  const url = new URL(request.url)
  const { page, pageSize } = parsePageParams(url)
  const type = parseType(url.searchParams.get('type'))
  const data = await historyService.list(user, { page, pageSize, type })
  return json(request, env, data)
}

export async function handleHistoryDetail(
  request: Request,
  env: Env,
  authService: AuthService,
  historyService: HistoryService,
  id: string,
): Promise<Response> {
  const user = await requireAuthUser(request, authService)
  const data = await historyService.detail(user, id)
  return json(request, env, { item: data })
}
