import type { D1DatabaseLike, PlanType } from '../types/env'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export class SubscriptionLogRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  async create(params: {
    userId: string
    action: string
    planType: PlanType
    expireAt: string | null
    sourceOrderId: string | null
  }): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO subscriptions_log (id, user_id, action, plan_type, expire_at, source_order_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(createId(), params.userId, params.action, params.planType, params.expireAt, params.sourceOrderId, nowIso())
      .run()
  }
}
