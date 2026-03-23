import type { D1DatabaseLike, GenerationType } from '../types/env'
import type { GenerationRow, HistoryQuery } from '../types/dto'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export class GenerationRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  async create(params: {
    userId: string
    type: GenerationType
    inputPayload: unknown
    outputPayload: unknown
    modelName: string
    promptVersion: string
  }): Promise<GenerationRow> {
    const id = createId()
    const createdAt = nowIso()
    await this.db
      .prepare(
        'INSERT INTO generations (id, user_id, type, input_payload, output_payload, model_name, prompt_version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        id,
        params.userId,
        params.type,
        JSON.stringify(params.inputPayload),
        JSON.stringify(params.outputPayload),
        params.modelName,
        params.promptVersion,
        createdAt,
      )
      .run()
    return {
      id,
      user_id: params.userId,
      type: params.type,
      input_payload: JSON.stringify(params.inputPayload),
      output_payload: JSON.stringify(params.outputPayload),
      model_name: params.modelName,
      prompt_version: params.promptVersion,
      created_at: createdAt,
    }
  }

  async countTodayTopics(userId: string): Promise<number> {
    const row = await this.db
      .prepare(
        "SELECT COUNT(*) as cnt FROM generations WHERE user_id = ? AND type = 'topics' AND date(created_at) = date('now')",
      )
      .bind(userId)
      .first<{ cnt: number | string }>()
    return Number(row?.cnt || 0)
  }

  async listByUser(userId: string, query: HistoryQuery): Promise<{ items: GenerationRow[]; total: number }> {
    const where = ['user_id = ?']
    const values: unknown[] = [userId]
    if (query.type) {
      where.push('type = ?')
      values.push(query.type)
    }
    const whereSql = where.join(' AND ')
    const offset = (query.page - 1) * query.pageSize

    const totalRow = await this.db
      .prepare(`SELECT COUNT(*) as total FROM generations WHERE ${whereSql}`)
      .bind(...values)
      .first<{ total: number | string }>()

    const result = await this.db
      .prepare(
        `SELECT id, user_id, type, input_payload, output_payload, model_name, prompt_version, created_at
         FROM generations
         WHERE ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(...values, query.pageSize, offset)
      .all<GenerationRow>()

    return {
      items: result.results || [],
      total: Number(totalRow?.total || 0),
    }
  }

  async findById(userId: string, id: string): Promise<GenerationRow | null> {
    return this.db
      .prepare(
        'SELECT id, user_id, type, input_payload, output_payload, model_name, prompt_version, created_at FROM generations WHERE user_id = ? AND id = ? LIMIT 1',
      )
      .bind(userId, id)
      .first<GenerationRow>()
  }

  async hasTopicWorkflow(userId: string, workflowId: string): Promise<boolean> {
    const row = await this.db
      .prepare(
        "SELECT COUNT(*) as cnt FROM generations WHERE user_id = ? AND type = 'topics' AND json_extract(input_payload, '$.workflowId') = ?",
      )
      .bind(userId, workflowId)
      .first<{ cnt: number | string }>()
    return Number(row?.cnt || 0) > 0
  }

  async latestCreatedAt(userId: string): Promise<string | null> {
    const row = await this.db
      .prepare('SELECT created_at FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(userId)
      .first<{ created_at: string }>()
    return row?.created_at || null
  }
}
