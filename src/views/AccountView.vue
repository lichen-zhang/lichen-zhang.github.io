<template>
  <section class="space-y-6">
    <article class="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
      <h2 class="text-xl font-bold">账户页</h2>
      <p class="mt-1 text-sm text-[var(--muted)]">展示用户信息、套餐状态、到期时间、剩余额度和订单列表。</p>
    </article>

    <article v-if="auth.user" class="rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-6">
      <h3 class="font-semibold">用户信息</h3>
      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <article class="rounded-xl bg-slate-50 p-4">
          <p class="text-xs text-[var(--muted)]">当前套餐</p>
          <p class="mt-1 text-lg font-bold text-[var(--text)]">{{ planLabel }}</p>
        </article>
        <article class="rounded-xl bg-slate-50 p-4">
          <p class="text-xs text-[var(--muted)]">当前额度</p>
          <p class="mt-1 text-lg font-bold text-[var(--text)]">{{ quotaValue }}</p>
        </article>
        <article class="rounded-xl bg-slate-50 p-4">
          <p class="text-xs text-[var(--muted)]">支付成功订单</p>
          <p class="mt-1 text-lg font-bold text-[var(--text)]">{{ paidOrdersCount }}</p>
        </article>
      </div>
      <div class="mt-3 grid gap-1 text-sm">
        <p>用户ID: {{ auth.user.id }}</p>
        <p>邮箱: {{ auth.user.email || '-' }}</p>
        <p>当前套餐: {{ planLabel }}</p>
        <p>到期时间: {{ expireAtText }}</p>
        <p>剩余额度: {{ quotaValue }}</p>
        <p>最近额度重置: {{ quotaResetText }}</p>
      </div>
      <div class="mt-4 rounded-xl bg-orange-50 p-4 text-sm text-[var(--text)]">
        <p class="font-semibold">额度规则</p>
        <p class="mt-1 text-[var(--muted)]">{{ quotaRule }}</p>
        <p v-if="quotaWarning" class="mt-2 font-medium text-[var(--brand)]">{{ quotaWarning }}</p>
      </div>
      <div class="mt-4 flex flex-col gap-2 sm:flex-row">
        <button @click="refreshMe" class="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">刷新账户</button>
        <button @click="logout" class="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">退出登录</button>
      </div>
    </article>

    <article class="rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 class="font-semibold">订单列表</h3>
        <button :disabled="billing.loading" @click="loadOrders" class="rounded-lg border border-[var(--line)] px-3 py-2 text-sm disabled:opacity-40">
          刷新订单
        </button>
      </div>
      <p v-if="billing.error" class="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700">{{ billing.error }}</p>
      <div class="mt-3 space-y-2">
        <article v-for="order in billing.orders" :key="order.id" class="rounded-lg border border-[var(--line)] p-4 text-sm">
          <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div class="space-y-1">
              <p class="font-semibold text-[var(--text)]">{{ formatPlanCode(order.plan_code) }}</p>
              <p class="text-[var(--muted)]">订单号: {{ order.id }}</p>
              <p class="text-[var(--muted)]">微信单号: {{ order.wx_order_no || '-' }}</p>
            </div>
            <div class="flex flex-wrap gap-2 text-xs">
              <span class="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{{ formatOrderStatus(order.status) }}</span>
              <span class="rounded-full bg-orange-50 px-2 py-1 text-[var(--brand)]">{{ order.amount }} {{ order.currency }}</span>
            </div>
          </div>
          <div class="mt-3 grid gap-1 text-[var(--muted)] md:grid-cols-2">
            <p>创建时间: {{ formatDateTime(order.created_at) }}</p>
            <p>支付时间: {{ formatDateTime(order.paid_at) }}</p>
          </div>
        </article>
        <article v-if="!billing.orders.length" class="rounded-xl bg-slate-50 p-5 text-sm text-[var(--muted)]">
          当前还没有订单记录。需要升级套餐时，可前往套餐页创建订单并在支付完成后回到账户页确认。
        </article>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBillingStore } from '../stores/billing'
import { formatDateTime, formatOrderStatus, formatPlanCode, formatPlanLabel, formatQuotaValue, getQuotaRuleSummary, getQuotaWarning } from '../lib/quota'

const auth = useAuthStore()
const billing = useBillingStore()
const router = useRouter()

const planLabel = computed(() => formatPlanLabel(auth.user?.plan_type || 'free'))
const quotaValue = computed(() => formatQuotaValue(auth.user))
const quotaRule = computed(() => getQuotaRuleSummary(auth.user?.plan_type || 'free'))
const quotaWarning = computed(() => getQuotaWarning(auth.user))
const expireAtText = computed(() => formatDateTime(auth.user?.plan_expire_at))
const quotaResetText = computed(() => formatDateTime(auth.user?.last_quota_reset_at))
const paidOrdersCount = computed(() => billing.orders.filter((order) => order.status === 'paid').length)

async function refreshMe() {
  await auth.fetchMe()
}

async function loadOrders() {
  await billing.fetchOrders()
}

async function logout() {
  auth.logout()
  await router.push('/login')
}

onMounted(async () => {
  await refreshMe()
  if (!auth.token) {
    await router.push('/login')
    return
  }
  await loadOrders()
})
</script>
