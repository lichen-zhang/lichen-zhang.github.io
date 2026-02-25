<template>
  <aside class="w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300"
    :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-72 absolute z-20 h-full md:relative md:translate-x-0'">

    <div class="p-6 border-b border-slate-800 flex items-center gap-3">
      <div
        class="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
        S
      </div>
      <h1 class="text-lg font-bold tracking-wide text-slate-100">Stackout AI</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <div>
        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">会话列表</h3>
        <div class="space-y-1">
          <button
            v-for="conv in conversations"
            :key="conv.id"
            @click="onSwitchConversation(conv.id)"
            class="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 group"
            :class="conv.id === currentConversationId ? 'bg-slate-800 text-slate-100 border border-indigo-500/30' : 'hover:bg-slate-800 text-slate-400 border border-transparent'"
          >
            <span class="text-base">💬</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm truncate">{{ conv.title }}</div>
              <div class="text-[10px] text-slate-500 truncate">
                {{ conv.model }} · {{ formatTime(conv.updatedAt) }}
              </div>
            </div>
            <button
              class="opacity-0 group-hover:opacity-100 text-xs text-slate-500 hover:text-red-400 transition-colors px-1"
              @click.stop="onDeleteConversation(conv.id)"
              title="删除会话"
            >
              ×
            </button>
          </button>
        </div>
        <button
          class="mt-3 w-full text-xs flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/60 transition-colors"
          @click="onCreateConversation"
        >
          + 新建会话
        </button>
      </div>

      <div>
        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">选择角色</h3>
        <div class="space-y-1">
          <button
            v-for="role in personas"
            :key="role.id"
            @click="onSwitchPersona(role)"
            class="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 group"
            :class="currentPersona.id === role.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-slate-800 text-slate-400 border border-transparent'"
          >
            <span class="text-xl group-hover:scale-110 transition-transform">{{ role.emoji }}</span>
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">{{ role.name }}</div>
              <div class="text-xs opacity-60 truncate">{{ role.desc }}</div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <div class="p-4 bg-slate-900/50 border-t border-slate-800 space-y-2">
      <button
        @click="onClearChat"
        class="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors py-2 border border-slate-700 rounded-md hover:border-red-900 hover:bg-red-900/10"
      >
        🗑️ 清空当前对话
      </button>
    </div>
  </aside>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { Persona, Conversation } from '../composables/useChat'

export default defineComponent({
  name: 'Sidebar',
  props: {
    personas: {
      type: Array as () => Persona[],
      required: true,
    },
    currentPersona: {
      type: Object as () => Persona,
      required: true,
    },
    isSidebarOpen: {
      type: Boolean,
      required: true,
    },
    conversations: {
      type: Array as () => Conversation[],
      required: true,
    },
    currentConversationId: {
      type: String as () => string | null,
      required: false,
      default: null,
    },
  },
  emits: [
    'switch-persona',
    'clear-chat',
    'create-conversation',
    'switch-conversation',
    'delete-conversation',
  ],
  methods: {
    onSwitchPersona(persona: Persona) {
      this.$emit('switch-persona', persona)
    },
    onClearChat() {
      this.$emit('clear-chat')
    },
    onCreateConversation() {
      this.$emit('create-conversation')
    },
    onSwitchConversation(id: string) {
      this.$emit('switch-conversation', id)
    },
    onDeleteConversation(id: string) {
      if (confirm('确定要删除该会话吗？此操作不可恢复。')) {
        this.$emit('delete-conversation', id)
      }
    },
    formatTime(timestamp: number) {
      if (!timestamp) return ''
      const d = new Date(timestamp)
      const hh = `${d.getHours()}`.padStart(2, '0')
      const mm = `${d.getMinutes()}`.padStart(2, '0')
      return `${hh}:${mm}`
    },
  },
})
</script>

