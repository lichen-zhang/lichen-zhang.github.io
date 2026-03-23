import type { D1DatabaseLike, PlanCode } from '../types/env'
import type { OrderRow } from '../types/dto'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export class OrderRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  async create(params: {
    userId: string
    planCode: PlanCode
    amount: number
    currency?: string
    wxOrderNo: string
  }): Promise<OrderRow> {
    const id = createId()
    const createdAt = nowIso()
    const currency = params.currency || 'CNY'
    await this.db
      .prepare(
        'INSERT INTO orders (id, user_id, plan_code, amount, currency, status, wx_order_no, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(id, params.userId, params.planCode, params.amount, currency, 'pending', params.wxOrderNo, createdAt, createdAt)
      .run()

    return {
      id,
      user_id: params.userId,
      plan_code: params.planCode,
      amount: params.amount,
      currency,
      status: 'pending',
      wx_order_no: params.wxOrderNo,
      paid_at: null,
      created_at: createdAt,
      updated_at: createdAt,
    }
  }

  async findByWxOrderNo(wxOrderNo: string): Promise<OrderRow | null> {
    return this.db
      .prepare(
        'SELECT id, user_id, plan_code, amount, currency, status, wx_order_no, paid_at, created_at, updated_at FROM orders WHERE wx_order_no = ? LIMIT 1',
      )
      .bind(wxOrderNo)
      .first<OrderRow>()
  }

  async markPaid(orderId: string, paidAt: string): Promise<void> {
    await this.db
      .prepare('UPDATE orders SET status = ?, paid_at = ?, updated_at = ? WHERE id = ?')
      .bind('paid', paidAt, nowIso(), orderId)
      .run()
  }

  async markFailed(orderId: string): Promise<void> {
    await this.db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').bind('failed', nowIso(), orderId).run()
  }

  async listByUser(userId: string): Promise<OrderRow[]> {
    const result = await this.db
      .prepare(
        'SELECT id, user_id, plan_code, amount, currency, status, wx_order_no, paid_at, created_at, updated_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      )
      .bind(userId)
      .all<OrderRow>()
    return result.results || []
  }
}
