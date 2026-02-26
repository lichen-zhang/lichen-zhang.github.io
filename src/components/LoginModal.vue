<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4"
  >
    <div class="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
      <header class="space-y-1">
        <h2 class="text-lg font-semibold text-slate-100">登录 Stackout AI</h2>
        <p class="text-xs text-slate-500">
          使用预置账号 <span class="font-mono text-slate-300">admin / admin123</span> 体验管理员角色。
        </p>
      </header>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-1">
          <label class="text-xs text-slate-400">用户名</label>
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            class="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="请输入用户名"
          />
        </div>

        <div class="space-y-1">
          <label class="text-xs text-slate-400">密码</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="请输入密码"
          />
        </div>

        <p v-if="errorMessage" class="text-xs text-red-400">
          {{ errorMessage }}
        </p>

        <div class="flex items-center justify-between pt-2">
          <button
            type="button"
            class="px-3 py-2 text-xs rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800"
            @click="$emit('close')"
          >
            取消
          </button>

          <button
            type="submit"
            class="px-4 py-2 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 disabled:bg-slate-700 disabled:text-slate-400"
            :disabled="pending"
          >
            <span v-if="!pending">登录</span>
            <span v-else class="animate-spin">↻</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'LoginModal',
  props: {
    visible: {
      type: Boolean,
      required: true,
    },
    pending: {
      type: Boolean,
      required: true,
    },
    errorMessage: {
      type: String as () => string | null,
      required: false,
      default: null,
    },
    username: {
      type: String,
      required: false,
      default: '',
    },
    password: {
      type: String,
      required: false,
      default: '',
    },
  },
  emits: ['close', 'submit', 'update:username', 'update:password'],
  methods: {
    handleSubmit() {
      this.$emit('submit', { username: this.username, password: this.password })
    },
  },
})
</script>

