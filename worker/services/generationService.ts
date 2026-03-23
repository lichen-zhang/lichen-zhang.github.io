import type { Env } from '../types/env'
import type { GenerateArticleBody, GenerateTitlesBody, GenerateTopicsBody, UserDTO } from '../types/dto'
import { GenerationRepository } from '../repositories/generationRepo'
import { UserRepository } from '../repositories/userRepo'
import { buildArticlePrompt, buildTitlePrompt, buildTopicPrompt } from './promptService'
import { callChatModel, parseJsonStringArray } from './aiService'
import { QuotaService } from './quotaService'
import { HttpError } from '../utils/http'
import { createId } from '../utils/id'
import { requireText } from '../utils/validator'

export class GenerationService {
  private readonly generationRepo: GenerationRepository
  private readonly quotaService: QuotaService

  constructor(private readonly env: Env) {
    this.generationRepo = new GenerationRepository(env.DB)
    this.quotaService = new QuotaService(new UserRepository(env.DB))
  }

  private async enforceRateLimit(userId: string): Promise<void> {
    const latest = await this.generationRepo.latestCreatedAt(userId)
    if (!latest) return
    const diff = Date.now() - new Date(latest).getTime()
    if (diff < 1500) {
      throw new HttpError(429, '请求过于频繁，请稍后再试')
    }
  }

  async generateTopics(user: UserDTO, body: GenerateTopicsBody): Promise<{ topics: string[]; workflowId: string; quotaLeft: number }> {
    const topic = requireText(body.topic, 'topic')
    const style = requireText(body.style, 'style')
    const length = requireText(body.length, 'length')
    await this.enforceRateLimit(user.id)
    const currentUser = await this.quotaService.consumeTopicQuota(user)
    const workflowId = createId()

    const prompt = buildTopicPrompt({
      topic,
      accountType: body.accountType,
      style,
      length,
    })
    const aiResult = await callChatModel(this.env, 'kimi', prompt)
    const topics = parseJsonStringArray(aiResult.text, 10)
    if (topics.length === 0) {
      throw new HttpError(502, '模型未返回有效选题')
    }

    await this.generationRepo.create({
      userId: currentUser.id,
      type: 'topics',
      inputPayload: { topic, accountType: body.accountType || '', style, length, workflowId },
      outputPayload: { topics },
      modelName: aiResult.modelName,
      promptVersion: prompt.version,
    })

    return {
      topics,
      workflowId,
      quotaLeft: currentUser.quota_left,
    }
  }

  async generateArticle(user: UserDTO, body: GenerateArticleBody): Promise<{ article: string }> {
    const selectedTopic = requireText(body.selectedTopic, 'selectedTopic')
    const topic = requireText(body.topic, 'topic')
    const style = requireText(body.style, 'style')
    const length = requireText(body.length, 'length')
    await this.enforceRateLimit(user.id)

    await this.quotaService.ensureCanUseWorkflow(user)
    if (user.plan_type !== 'pro') {
      const workflowId = requireText(body.workflowId, 'workflowId')
      const exists = await this.generationRepo.hasTopicWorkflow(user.id, workflowId)
      if (!exists) {
        throw new HttpError(403, '请先完成选题生成，再生成正文')
      }
    }

    const prompt = buildArticlePrompt({
      workflowId: body.workflowId,
      selectedTopic,
      topic,
      accountType: body.accountType,
      style,
      length,
    })
    const aiResult = await callChatModel(this.env, 'kimi', prompt)
    const article = aiResult.text.trim()

    await this.generationRepo.create({
      userId: user.id,
      type: 'article',
      inputPayload: {
        workflowId: body.workflowId || null,
        selectedTopic,
        topic,
        accountType: body.accountType || '',
        style,
        length,
      },
      outputPayload: { article },
      modelName: aiResult.modelName,
      promptVersion: prompt.version,
    })

    return { article }
  }

  async generateTitles(user: UserDTO, body: GenerateTitlesBody): Promise<{ titles: string[] }> {
    const article = requireText(body.article, 'article')
    await this.enforceRateLimit(user.id)
    await this.quotaService.ensureCanUseWorkflow(user)
    if (user.plan_type !== 'pro') {
      const workflowId = requireText(body.workflowId, 'workflowId')
      const exists = await this.generationRepo.hasTopicWorkflow(user.id, workflowId)
      if (!exists) {
        throw new HttpError(403, '请先完成选题生成，再生成标题')
      }
    }

    const prompt = buildTitlePrompt({
      workflowId: body.workflowId,
      article,
      topic: body.topic,
      style: body.style,
    })
    const aiResult = await callChatModel(this.env, 'kimi', prompt)
    const titles = parseJsonStringArray(aiResult.text, 10)
    if (titles.length === 0) {
      throw new HttpError(502, '模型未返回有效标题')
    }

    await this.generationRepo.create({
      userId: user.id,
      type: 'titles',
      inputPayload: {
        workflowId: body.workflowId || null,
        topic: body.topic || '',
        style: body.style || '',
        article,
      },
      outputPayload: { titles },
      modelName: aiResult.modelName,
      promptVersion: prompt.version,
    })

    return { titles }
  }
}
