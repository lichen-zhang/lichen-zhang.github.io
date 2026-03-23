import type { Env } from '../types/env'
import type { GenerateArticleBody, GenerateTitlesBody, GenerateTopicsBody } from '../types/dto'
import { json, parseJson } from '../utils/http'
import { requireAuthUser } from '../middleware/auth'
import { AuthService } from '../services/authService'
import { GenerationService } from '../services/generationService'

export async function handleGenerateTopics(
  request: Request,
  env: Env,
  authService: AuthService,
  generationService: GenerationService,
): Promise<Response> {
  const user = await requireAuthUser(request, authService)
  const body = await parseJson<GenerateTopicsBody>(request)
  const result = await generationService.generateTopics(user, body)
  return json(request, env, result)
}

export async function handleGenerateArticle(
  request: Request,
  env: Env,
  authService: AuthService,
  generationService: GenerationService,
): Promise<Response> {
  const user = await requireAuthUser(request, authService)
  const body = await parseJson<GenerateArticleBody>(request)
  const result = await generationService.generateArticle(user, body)
  return json(request, env, result)
}

export async function handleGenerateTitles(
  request: Request,
  env: Env,
  authService: AuthService,
  generationService: GenerationService,
): Promise<Response> {
  const user = await requireAuthUser(request, authService)
  const body = await parseJson<GenerateTitlesBody>(request)
  const result = await generationService.generateTitles(user, body)
  return json(request, env, result)
}
