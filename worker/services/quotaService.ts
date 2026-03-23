import type { UserDTO } from '../types/dto'
import { HttpError } from '../utils/http'
import { isSameUtcDay, nowIso } from '../utils/time'
import { UserRepository } from '../repositories/userRepo'

const FREE_DAILY_QUOTA = 3

export class QuotaService {
  constructor(private readonly userRepo: UserRepository) {}

  private isPaidActive(user: UserDTO): boolean {
    return user.plan_type === 'pro' && !!user.plan_expire_at && new Date(user.plan_expire_at).getTime() > Date.now()
  }

  async refreshUser(userId: string): Promise<UserDTO> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new HttpError(401, '用户不存在')
    if (user.status !== 'active') throw new HttpError(403, '用户状态不可用')

    if (user.plan_type === 'pro' && user.plan_expire_at && new Date(user.plan_expire_at).getTime() <= Date.now()) {
      await this.userRepo.updatePlan(user.id, 'free', null, FREE_DAILY_QUOTA)
      await this.userRepo.updateQuota(user.id, FREE_DAILY_QUOTA, nowIso())
      return (await this.userRepo.findById(user.id)) as UserDTO
    }

    if (this.isPaidActive(user)) {
      if (user.quota_left !== -1) {
        await this.userRepo.updateQuota(user.id, -1, user.last_quota_reset_at)
      }
      return ((await this.userRepo.findById(user.id)) || user) as UserDTO
    }

    if (!isSameUtcDay(user.last_quota_reset_at)) {
      await this.userRepo.updateQuota(user.id, FREE_DAILY_QUOTA, nowIso())
      return (await this.userRepo.findById(user.id)) as UserDTO
    }
    return user
  }

  async consumeTopicQuota(user: UserDTO): Promise<UserDTO> {
    const latest = await this.refreshUser(user.id)
    if (latest.plan_type === 'pro') return latest
    if (latest.quota_left <= 0) {
      throw new HttpError(429, '今日免费额度已用完，请前往套餐页升级')
    }
    await this.userRepo.updateQuota(latest.id, latest.quota_left - 1, latest.last_quota_reset_at || nowIso())
    return (await this.userRepo.findById(latest.id)) as UserDTO
  }

  async ensureCanUseWorkflow(user: UserDTO): Promise<UserDTO> {
    const latest = await this.refreshUser(user.id)
    if (latest.plan_type === 'pro') return latest
    if (latest.quota_left <= 0) {
      throw new HttpError(429, '今日免费额度已用完，请先升级后继续生成')
    }
    return latest
  }
}
