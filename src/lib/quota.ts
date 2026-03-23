import type { PlanType, User } from '../types/api'

export function formatPlanLabel(planType: PlanType) {
  return planType === 'pro' ? 'Pro' : '免费版'
}

export function formatPlanCode(planCode: string) {
  if (planCode === 'pro_month') return 'Pro 月卡'
  if (planCode === 'pro_quarter') return 'Pro 季卡'
  return planCode || '--'
}

export function formatOrderStatus(status: string) {
  if (status === 'paid') return '已支付'
  if (status === 'pending') return '待支付'
  if (status === 'failed') return '支付失败'
  return status || '--'
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatQuotaValue(user: User | null) {
  if (!user) return '--'
  return user.plan_type === 'pro' ? '无限' : String(user.quota_left)
}

export function getQuotaRuleSummary(planType: PlanType = 'free') {
  if (planType === 'pro') {
    return 'Pro 套餐当前不扣减每日免费额度，可持续生成。'
  }
  return '免费版每天 3 次额度，仅“生成选题”成功时扣 1 次；生成正文和标题不单独扣减，按 UTC 日期重置。'
}

export function getQuotaWarning(user: User | null) {
  if (!user || user.plan_type === 'pro') return ''
  if (user.quota_left <= 0) return '今日免费额度已用完，可明天再试或升级 Pro。'
  if (user.quota_left === 1) return '今日仅剩 1 次免费选题额度。'
  return ''
}
