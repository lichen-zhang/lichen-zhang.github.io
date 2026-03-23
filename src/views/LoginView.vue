<template>
  <section class="mx-auto max-w-md rounded-2xl border border-[var(--line)] bg-white p-6">
    <h2 class="text-xl font-bold">邮箱验证码登录</h2>
    <p class="mt-1 text-sm text-[var(--muted)]">输入邮箱，获取验证码后登录工作台；登录后即可查看历史、额度和套餐状态。</p>

    <label class="mt-4 block text-sm">
      邮箱
      <input v-model="email" class="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" placeholder="name@example.com" />
    </label>

    <label class="mt-3 block text-sm">
      验证码
      <div class="mt-1 flex gap-2">
        <input v-model="code" class="w-full rounded-lg border border-[var(--line)] px-3 py-2" placeholder="6位验证码" />
        <button
          :disabled="auth.loading || !email.trim() || countdown > 0"
          @click="sendCode"
          class="whitespace-nowrap rounded-lg border border-[var(--line)] px-3 py-2 text-xs disabled:opacity-40"
        >
          {{ countdown > 0 ? `${countdown}s 后重试` : '发送验证码' }}
        </button>
      </div>
    </label>

    <p v-if="sendSuccess" class="mt-2 rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">验证码已发送，请查收邮箱并在有效期内完成登录。</p>
    <p v-if="auth.error" class="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-700">{{ auth.error }}</p>

    <button
      :disabled="auth.loading || !email.trim() || !code.trim()"
      @click="login"
      class="mt-4 w-full rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
    >
      登录并进入工作台
    </button>

    <p class="mt-3 text-xs text-[var(--muted)]">说明：验证码登录成功后，用户资料、历史记录和额度状态都由业务后端统一维护。</p>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const email = ref('')
const code = ref('')
const countdown = ref(0)
const sendSuccess = ref(false)
const pageOpenedAt = Date.now()
let timer: ReturnType<typeof setInterval> | null = null

function startCountdown(seconds: number) {
  countdown.value = seconds
  if (timer) {
    clearInterval(timer)
  }
  timer = setInterval(() => {
    if (countdown.value <= 1) {
      countdown.value = 0
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      return
    }
    countdown.value -= 1
  }, 1000)
}

async function sendCode() {
  sendSuccess.value = false
  const data = await auth.sendCode(email.value, {
    behaviorStartedAt: pageOpenedAt,
    behaviorSubmitAt: Date.now(),
    website: '',
  })
  sendSuccess.value = true
  startCountdown(Number(data?.cooldownSeconds || 60))
}

async function login() {
  await auth.loginByCode(email.value, code.value)
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
  await router.push(redirect)
}

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>
