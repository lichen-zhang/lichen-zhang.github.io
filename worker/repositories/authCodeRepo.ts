import type { D1DatabaseLike } from '../types/env'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

interface AuthCodeRow {
  id: string
  phone: string
  code: string
  expired_at: string
  used: number
  created_at: string
}

export class AuthCodeRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  async findLatestByPhone(phone: string): Promise<AuthCodeRow | null> {
    return this.db
      .prepare('SELECT id, phone, code, expired_at, used, created_at FROM auth_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1')
      .bind(phone)
      .first<AuthCodeRow>()
  }

  async create(phone: string, code: string, expiredAt: string): Promise<void> {
    await this.db
      .prepare('INSERT INTO auth_codes (id, phone, code, expired_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)')
      .bind(createId(), phone, code, expiredAt, nowIso())
      .run()
  }

  async findValid(phone: string, code: string): Promise<AuthCodeRow | null> {
    return this.db
      .prepare(
        "SELECT id, phone, code, expired_at, used, created_at FROM auth_codes WHERE phone = ? AND code = ? AND used = 0 AND expired_at > datetime('now') ORDER BY created_at DESC LIMIT 1",
      )
      .bind(phone, code)
      .first<AuthCodeRow>()
  }

  async markUsed(id: string): Promise<void> {
    await this.db.prepare('UPDATE auth_codes SET used = 1 WHERE id = ?').bind(id).run()
  }
}
