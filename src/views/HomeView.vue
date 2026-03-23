<template>
  <section class="space-y-6">
    <article class="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-8 shadow-sm">
      <p class="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-[var(--brand)]">RedNote AI Writer</p>
      <h1 class="mt-4 text-4xl font-black text-slate-900">输入主题，快速生成更适合发布的小红书内容</h1>
      <p class="mt-3 max-w-3xl text-sm text-[var(--muted)]">
        面向小红书创作者的创作工作台：先生成 10 个选题，再生成正文，最后生成 10 个标题，并支持历史参考、额度管理和套餐订阅。
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <RouterLink :to="startRoute" class="rounded-lg bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white">开始使用</RouterLink>
        <RouterLink to="/pricing" class="rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-slate-800">
          查看套餐
        </RouterLink>
      </div>
    </article>

    <section class="grid gap-3 md:grid-cols-3">
      <article class="rounded-xl border border-[var(--line)] bg-white p-4">
        <p class="text-xs text-[var(--muted)]">步骤 1</p>
        <p class="mt-1 text-sm font-bold">输入主题、账号类型、风格和篇幅</p>
      </article>
      <article class="rounded-xl border border-[var(--line)] bg-white p-4">
        <p class="text-xs text-[var(--muted)]">步骤 2</p>
        <p class="mt-1 text-sm font-bold">先生成 10 个选题，再选择一个继续写正文</p>
      </article>
      <article class="rounded-xl border border-[var(--line)] bg-white p-4">
        <p class="text-xs text-[var(--muted)]">步骤 3</p>
        <p class="mt-1 text-sm font-bold">根据正文生成标题，并结合历史内容持续创作</p>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const startRoute = computed(() => (auth.isLoggedIn ? '/dashboard' : '/login'))
</script>
