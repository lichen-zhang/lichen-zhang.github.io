import type { D1DatabaseLike, PlanType } from '../types/env'
import type { UserDTO } from '../types/dto'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export class UserRepository {
  constructor(private readonly db: D1DatabaseLike) { }

  async findById(userId: string): Promise<UserDTO | null> {
    return this.db
      .prepare(
        'SELECT id, email, phone, nickname, avatar, status, plan_type, plan_expire_at, quota_left, last_quota_reset_at, created_at, updated_at FROM users WHERE id = ?',
      )
      .bind(userId)
      .first<UserDTO>()
  }

  async findByEmail(email: string): Promise<UserDTO | null> {
    return this.db
      .prepare(
        'SELECT id, email, phone, nickname, avatar, status, plan_type, plan_expire_at, quota_left, last_quota_reset_at, created_at, updated_at FROM users WHERE email = ?',
      )
      .bind(email)
      .first<UserDTO>()
  }

  async findByPhone(phone: string): Promise<UserDTO | null> {
    return this.db
      .prepare(
        'SELECT id, email, phone, nickname, avatar, status, plan_type, plan_expire_at, quota_left, last_quota_reset_at, created_at, updated_at FROM users WHERE phone = ?',
      )
      .bind(phone)
      .first<UserDTO>()
  }

  async createByEmail(email: string): Promise<UserDTO> {
    const id = createId()
    const now = nowIso()
    await this.db
      .prepare(
        'INSERT INTO users (id, email, status, plan_type, quota_left, last_quota_reset_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(id, email, 'active', 'free', 3, now, now, now)
      .run()
    return (await this.findById(id)) as UserDTO
  }

  async createByPhone(phone: string): Promise<UserDTO> {
    const id = createId()
    const now = nowIso()
    await this.db
      .prepare(
        'INSERT INTO users (id, phone, status, plan_type, quota_left, last_quota_reset_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(id, phone, 'active', 'free', 3, now, now, now)
      .run()
    return (await this.findById(id)) as UserDTO
  }

  async updateQuota(userId: string, quotaLeft: number, lastQuotaResetAt: string | null): Promise<void> {
    await this.db
      .prepare('UPDATE users SET quota_left = ?, last_quota_reset_at = ?, updated_at = ? WHERE id = ?')
      .bind(quotaLeft, lastQuotaResetAt, nowIso(), userId)
      .run()
  }

  async updatePlan(userId: string, planType: PlanType, planExpireAt: string | null, quotaLeft: number): Promise<void> {
    await this.db
      .prepare('UPDATE users SET plan_type = ?, plan_expire_at = ?, quota_left = ?, updated_at = ? WHERE id = ?')
      .bind(planType, planExpireAt, quotaLeft, nowIso(), userId)
      .run()
  }
}
