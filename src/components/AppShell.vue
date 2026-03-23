<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--panel)]/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3">
        <RouterLink to="/" class="shrink-0 text-base font-extrabold text-[var(--brand)] sm:text-lg">红署写手</RouterLink>

        <nav class="hidden items-center gap-1 text-sm md:flex">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :class="[
              'rounded-md px-3 py-2 transition-colors',
              isNavActive(item.to)
                ? 'bg-orange-100 font-semibold text-[var(--brand)]'
                : 'text-[var(--muted)] hover:bg-orange-100 hover:text-[var(--brand)]',
            ]"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="hidden items-center gap-3 text-xs text-[var(--muted)] md:flex">
          <template v-if="auth.user">
            <div class="text-right">
              <p>{{ planLabel }} · 额度 {{ quotaValue }}</p>
              <p v-if="quotaWarning" class="text-[var(--brand)]">{{ quotaWarning }}</p>
            </div>
            <button type="button" class="rounded-md border border-[var(--line)] px-3 py-2 text-[var(--text)]" @click="logout">退出</button>
          </template>
          <RouterLink v-else to="/login" class="rounded-md bg-[var(--brand)] px-3 py-2 text-white"> 登录 </RouterLink>
        </div>

        <button
          type="button"
          class="inline-flex rounded-md border border-[var(--line)] px-3 py-2 text-sm text-[var(--text)] md:hidden"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          {{ mobileMenuOpen ? '关闭' : '菜单' }}
        </button>
      </div>

      <div v-if="mobileMenuOpen" class="border-t border-[var(--line)] md:hidden">
        <div class="mx-auto max-w-6xl space-y-3 px-4 py-3">
          <div v-if="auth.user" class="rounded-xl bg-orange-50 px-3 py-2 text-sm text-[var(--text)]">
            <p>{{ planLabel }} · 当前额度 {{ quotaValue }}</p>
            <p class="mt-1 text-xs text-[var(--muted)]">{{ quotaRule }}</p>
            <p v-if="quotaWarning" class="mt-1 text-xs text-[var(--brand)]">{{ quotaWarning }}</p>
            <button type="button" class="mt-3 rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--text)]" @click="logout">退出登录</button>
          </div>
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :class="[
              'block rounded-md px-3 py-3 text-sm transition-colors',
              isNavActive(item.to)
                ? 'bg-orange-100 font-semibold text-[var(--brand)]'
                : 'text-[var(--muted)] hover:bg-orange-100 hover:text-[var(--brand)]',
            ]"
            @click="mobileMenuOpen = false"
          >
            {{ item.label }}
          </RouterLink>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { formatPlanLabel, formatQuotaValue, getQuotaRuleSummary, getQuotaWarning } from '../lib/quota'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const mobileMenuOpen = ref(false)

const navItems = computed(() => {
  const base = [
    { label: '首页', to: '/' },
    { label: '工作台', to: '/dashboard' },
    { label: '历史', to: '/history' },
    { label: '套餐', to: '/pricing' },
  ]
  if (auth.isLoggedIn) {
    base.push({ label: '账户', to: '/account' })
  } else {
    base.push({ label: '登录', to: '/login' })
  }
  return base
})

const planLabel = computed(() => formatPlanLabel(auth.user?.plan_type || 'free'))
const quotaValue = computed(() => formatQuotaValue(auth.user))
const quotaRule = computed(() => getQuotaRuleSummary(auth.user?.plan_type || 'free'))
const quotaWarning = computed(() => getQuotaWarning(auth.user))

function isNavActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

async function logout() {
  auth.logout()
  mobileMenuOpen.value = false
  if (route.meta.requiresAuth) {
    await router.replace({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  await router.replace('/')
}

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false
  }
)

watch(
  () => auth.token,
  async (token) => {
    if (!token && route.meta.requiresAuth) {
      await router.replace({ path: '/login', query: { redirect: route.fullPath } })
    }
  }
)

watch(
  () => auth.isLoggedIn,
  async (isLoggedIn) => {
    if (!isLoggedIn) return
    if (route.path === '/login') {
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
      await router.replace(redirect)
    }
  }
)

onMounted(async () => {
  if (auth.token && !auth.user) {
    await auth.fetchMe()
  }
})
</script>
