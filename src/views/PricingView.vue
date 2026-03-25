<template>
  <section class="space-y-5">
    <article class="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 class="text-xl font-bold">套餐页</h2>
          <p class="mt-1 text-sm text-[var(--muted)]">按当前账号状态选择套餐，当前使用微信二维码图片收款，支付后请在账户页确认套餐状态。</p>
        </div>
        <div v-if="auth.user" class="rounded-xl bg-white px-4 py-3 text-sm text-[var(--text)] md:max-w-[320px]">
          <p class="font-semibold">当前套餐：{{ currentPlanLabel }}</p>
          <p class="mt-1 text-[var(--muted)]">{{ currentPlanHint }}</p>
        </div>
      </div>
      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <article class="rounded-xl bg-white px-4 py-3 text-sm">
          <p class="text-xs text-[var(--muted)]">免费版</p>
          <p class="mt-1 text-lg font-bold text-[var(--text)]">每天 3 次选题额度</p>
        </article>
        <article class="rounded-xl bg-white px-4 py-3 text-sm">
          <p class="text-xs text-[var(--muted)]">Pro</p>
          <p class="mt-1 text-lg font-bold text-[var(--text)]">不限次数持续生成</p>
        </article>
        <article class="rounded-xl bg-white px-4 py-3 text-sm">
          <p class="text-xs text-[var(--muted)]">支付确认</p>
          <p class="mt-1 text-lg font-bold text-[var(--text)]">以账户页状态为准</p>
        </article>
      </div>
      <div class="mt-4 rounded-xl bg-orange-50 p-4 text-sm text-[var(--text)]">
        <p class="font-semibold">额度说明</p>
        <p class="mt-1">免费版每天 3 次，仅生成选题成功时扣减；正文和标题不单独扣减。</p>
        <p class="mt-1">Pro 套餐不受免费次数限制，适合高频使用场景。</p>
      </div>
    </article>

    <div v-if="!auth.isLoggedIn" class="rounded-xl bg-orange-100 p-4 text-sm text-orange-900">
      请先登录后购买套餐。
      <RouterLink to="/login" class="ml-2 underline">去登录</RouterLink>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <article
        v-for="plan in plans"
        :key="plan.code"
        class="rounded-2xl border bg-white p-4 sm:p-5"
        :class="plan.featured ? 'border-orange-300 shadow-[0_12px_32px_rgba(234,88,12,0.08)]' : 'border-[var(--line)]'"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 class="text-lg font-bold">{{ plan.name }}</h3>
            <p class="mt-2 text-2xl font-black">{{ plan.price }}</p>
            <p class="mt-2 text-sm text-[var(--muted)]">{{ plan.desc }}</p>
            <p class="mt-2 text-xs text-[var(--muted)]">{{ plan.quotaHint }}</p>
            <ul class="mt-4 space-y-2 text-xs text-[var(--muted)]">
              <li>• {{ planPrimaryFeature(plan) }}</li>
              <li>• {{ planSecondaryFeature(plan) }}</li>
            </ul>
          </div>
          <span v-if="planBadge(plan)" class="w-fit rounded-full px-2 py-1 text-xs font-semibold" :class="planBadgeClass(plan)">
            {{ planBadge(plan) }}
          </span>
        </div>
        <button
          :disabled="isPlanDisabled(plan)"
          @click="createOrder(plan.code)"
          class="mt-4 w-full rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {{ planActionLabel(plan) }}
        </button>
        <p v-if="planActionHint(plan)" class="mt-2 text-xs text-[var(--muted)]">{{ planActionHint(plan) }}</p>
      </article>
    </div>

    <article v-if="auth.isLoggedIn" class="rounded-2xl border border-[var(--line)] bg-white p-4 text-sm sm:p-5">
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="font-semibold text-[var(--text)]">购买后查看位置</p>
          <p class="mt-1 text-[var(--muted)]">请扫码完成支付后，前往账户页查看套餐状态、到期时间与额度变化。</p>
        </div>
        <RouterLink to="/account" class="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-center text-sm text-[var(--text)] md:w-auto">
          前往账户页
        </RouterLink>
      </div>
    </article>

    <article class="rounded-2xl border border-[var(--line)] bg-white p-4 text-sm sm:p-5">
      <h3 class="font-semibold text-[var(--text)]">购买说明</h3>
      <div class="mt-3 space-y-3 text-[var(--muted)]">
        <p>1. 免费版适合先体验完整流程，包括选题、正文、标题和历史记录联动。</p>
        <p>2. Pro 适合高频创作场景，不再受免费版每日 3 次选题额度限制。</p>
        <p>3. 点击微信支付后会展示收款二维码图片，请使用微信扫码支付。</p>
      </div>
    </article>

    <article v-if="billing.latestPayment" class="rounded-2xl border border-[var(--line)] bg-white p-4 text-sm sm:p-5">
      <p class="font-semibold text-[var(--text)]">请使用微信扫码支付（订单号：{{ billing.latestPayment.orderId }}）</p>
      <div class="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
        <img
          :src="paymentQrImageUrl"
          alt="微信支付收款码"
          class="mx-auto w-full max-w-[320px] rounded-lg border border-[var(--line)] bg-white object-contain"
        />
      </div>
      <p v-if="isUsingDefaultQr" class="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-700">
        当前未配置 VITE_WECHAT_PAY_QR_IMAGE_URL，正在使用默认二维码地址；建议尽快在前端环境变量中配置你的服务器图片地址。
      </p>
      <p class="mt-2 text-xs text-[var(--muted)]">若二维码未显示，请检查环境变量 VITE_WECHAT_PAY_QR_IMAGE_URL 是否为可访问的服务器图片地址。</p>
    </article>

    <p v-if="billing.error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ billing.error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBillingStore } from '../stores/billing'
import type { PlanCode } from '../types/api'
import { formatPlanLabel } from '../lib/quota'

const auth = useAuthStore()
const billing = useBillingStore()

const plans: Array<{ code: PlanCode | 'free'; name: string; price: string; desc: string; quotaHint: string; featured?: boolean }> = [
  { code: 'free', name: 'Free', price: '¥0 / 月', desc: '每天 3 次体验额度', quotaHint: '仅生成选题成功时扣减，正文和标题不额外扣减。' },
  { code: 'pro_month', name: 'Pro 月卡', price: '¥49 / 月', desc: '无限生成', quotaHint: '不受免费版每日 3 次限制。', featured: true },
  { code: 'pro_quarter', name: 'Pro 季卡', price: '¥129 / 季', desc: '无限生成，季度更优惠', quotaHint: '不受免费版每日 3 次限制。' },
]

const currentPlanLabel = computed(() => formatPlanLabel(auth.user?.plan_type || 'free'))
const hasActivePro = computed(() => auth.user?.plan_type === 'pro')
const paymentQrImageUrl = computed(() => String(billing.latestPayment?.paymentParams?.qrImageUrl || ''))
const isUsingDefaultQr = computed(() => Boolean(billing.latestPayment?.paymentParams?.isUsingDefaultQr))
const currentPlanHint = computed(() => {
  if (!auth.user) return ''
  if (hasActivePro.value) {
    return auth.user.plan_expire_at ? `当前 Pro 到期时间：${auth.user.plan_expire_at}` : '当前账号已开通 Pro，可在账户页查看详细状态。'
  }
  return '当前为免费版，每天 3 次选题额度。'
})

async function createOrder(planCode: PlanCode | 'free') {
  if (planCode === 'free') return
  await billing.createOrder(planCode)
}

function isPlanDisabled(plan: (typeof plans)[number]) {
  if (!auth.isLoggedIn) return true
  if (billing.loading) return true
  if (plan.code === 'free') return true
  if (hasActivePro.value) return true
  return false
}

function planBadge(plan: (typeof plans)[number]) {
  if (plan.code === 'free') return auth.user?.plan_type === 'free' ? '当前套餐' : ''
  if (hasActivePro.value) return '已开通 Pro'
  if (plan.featured) return '推荐'
  return ''
}

function planBadgeClass(plan: (typeof plans)[number]) {
  if (plan.code === 'free' && auth.user?.plan_type === 'free') return 'bg-slate-100 text-slate-700'
  if (hasActivePro.value && plan.code !== 'free') return 'bg-emerald-100 text-emerald-700'
  return 'bg-orange-100 text-[var(--brand)]'
}

function planActionLabel(plan: (typeof plans)[number]) {
  if (!auth.isLoggedIn) return '登录后购买'
  if (plan.code === 'free') return '当前体验版'
  if (hasActivePro.value) return '已开通 Pro'
  return '微信支付'
}

function planActionHint(plan: (typeof plans)[number]) {
  if (!auth.isLoggedIn) return '未登录时不允许创建订单。'
  if (plan.code === 'free') return '可先体验工作台、历史页与额度规则。'
  if (hasActivePro.value) return '当前账号已是 Pro，续费前请先到账户页确认到期时间。'
  return '点击后直接展示微信收款码图片，扫码支付即可。'
}

function planPrimaryFeature(plan: (typeof plans)[number]) {
  if (plan.code === 'free') return '适合先体验完整创作流程'
  if (plan.code === 'pro_month') return '适合近期高频创作需求'
  return '适合长期持续发布场景'
}

function planSecondaryFeature(plan: (typeof plans)[number]) {
  if (plan.code === 'free') return '支持历史参考、工作台和账户页联动'
  if (plan.code === 'pro_month') return '开通后不再受免费版每日 3 次限制'
  return '季度更省，减少频繁续费操作'
}

onMounted(async () => {
  if (auth.token) {
    await auth.fetchMe()
  }
})
</script>
