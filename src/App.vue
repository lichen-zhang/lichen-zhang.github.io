<template>
  <div class="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
    <Sidebar
      :personas="personas"
      :current-persona="currentPersona"
      :is-sidebar-open="isSidebarOpen"
      :conversations="conversations"
      :current-conversation-id="currentConversationId"
      :current-user="authUser"
      :is-authenticated="isAuthenticated"
      @switch-persona="switchPersona"
      @clear-chat="clearChat"
      @create-conversation="handleCreateConversation"
      @switch-conversation="handleSwitchConversation"
      @delete-conversation="handleDeleteConversation"
      @open-login="showLogin = true"
      @logout="handleLogout"
    />

    <main class="flex-1 flex flex-col relative w-full h-full bg-slate-950">
      <div class="md:hidden absolute top-4 left-4 z-30">
        <button
          @click="isSidebarOpen = !isSidebarOpen"
          class="p-2 bg-slate-800 rounded-md text-slate-400"
        >
          ☰
        </button>
      </div>

      <div class="flex-1 overflow-y-auto scroll-smooth p-4 md:p-8" ref="chatContainer">
        <div
          v-if="messages.length === 0"
          class="h-full flex flex-col items-center justify-center text-slate-500 space-y-6 animate-fade-in"
        >
          <div class="text-6xl p-6 bg-slate-900/50 rounded-full border border-slate-800 shadow-xl">
            {{ currentPersona.emoji }}
          </div>
          <div class="text-center space-y-2">
            <h2 class="text-2xl font-bold text-slate-200">我是 {{ currentPersona.name }}</h2>
            <p class="max-w-md mx-auto text-sm">{{ currentPersona.systemPrompt }}</p>
            <p class="text-xs text-indigo-400/60 font-mono mt-2">Running on {{ currentModel }}</p>
          </div>
        </div>

        <div v-else class="space-y-8 max-w-3xl mx-auto pb-10">
          <div v-for="(msg, index) in messages" :key="index" class="group animate-slide-up">
            <div v-if="msg.role === 'user'" class="flex flex-row-reverse gap-4">
              <div
                class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs shrink-0 shadow-lg shadow-indigo-500/20"
              >
                Me
              </div>
              <div
                class="bg-indigo-600 text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-md leading-7 selection:bg-white/30 text-sm md:text-base whitespace-pre-wrap font-sans"
              >
                {{ msg.content }}
              </div>
            </div>

            <div v-else class="flex gap-4">
              <div
                class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0 mt-1"
              >
                {{ currentPersona.emoji }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-bold text-xs text-slate-500 mb-1 ml-1 flex items-center gap-2">
                  {{ currentPersona.name }}
                </div>

                <div
                  class="prose prose-invert prose-slate max-w-none prose-p:leading-7 prose-pre:bg-[#282c34] prose-pre:p-0 prose-pre:border prose-pre:border-slate-700/50 prose-pre:rounded-lg prose-code:text-indigo-300 prose-code:bg-slate-800/50 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none text-sm md:text-base"
                  v-html="renderMarkdown(msg.content)"
                ></div>

                <div
                  v-if="msg.isTyping"
                  class="inline-block w-2 h-4 ml-1 mt-1 bg-indigo-400 animate-pulse"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 md:p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
        <div
          class="max-w-3xl mx-auto relative bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all"
        >
          <div class="absolute top-2 left-2 z-10">
            <select
              v-model="currentModel"
              :disabled="!isAdmin"
              class="bg-slate-800/80 hover:bg-slate-800 text-xs text-indigo-300 border border-slate-700/50 rounded-lg px-2 py-1 pr-6 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none transition-colors font-mono"
            >
              <option value="deepseek-chat">DeepSeek-V3 (Chat)</option>
              <option value="deepseek-reasoner">DeepSeek-R1 (推理)</option>
              <option value="deepseek-coder">DeepSeek-Coder</option>
            </select>
            <div
              class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-400"
            >
              <svg
                class="h-3 w-3 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path
                  d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"
                />
              </svg>
            </div>
          </div>
          <p v-if="!isAdmin" class="absolute top-2 right-3 text-[10px] text-slate-500">
            模型切换仅管理员可用，请使用 admin 登录。
          </p>

          <textarea
            v-model="inputContent"
            @keydown.enter="handleEnter"
            placeholder="输入消息..."
            class="w-full bg-transparent text-slate-200 pl-4 pr-14 pt-10 pb-4 focus:outline-none resize-none max-h-48 min-h-[80px] scrollbar-hide"
            rows="1"
            ref="inputRef"
            @input="autoResize"
          ></textarea>

          <button
            @click="sendMessage"
            :disabled="isLoading || !inputContent.trim()"
            class="absolute right-2 bottom-2 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20 disabled:shadow-none"
          >
            <span v-if="!isLoading" class="text-sm font-bold">↑</span>
            <span v-else class="animate-spin text-sm">↻</span>
          </button>
        </div>
        <p class="text-center text-[10px] text-slate-600 mt-2">
          AI 可能生成错误信息，请核对重要事实。
        </p>
      </div>
    </main>
    <LoginModal
      v-model:username="loginUsername"
      v-model:password="loginPassword"
      :visible="showLogin"
      :pending="authLoading"
      :error-message="authError"
      @close="showLogin = false"
      @submit="handleLoginSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
// @ts-ignore 由构建工具处理 Vue SFC 默认导出
import Sidebar from './components/Sidebar.vue'
// @ts-ignore 由构建工具处理 Vue SFC 默认导出
import LoginModal from './components/LoginModal.vue'
import { useChat } from './composables/useChat'
import { useAuth } from './composables/useAuth'

const {
  conversations,
  currentConversationId,
  personas,
  currentPersona,
  messages,
  inputContent,
  isLoading,
  isSidebarOpen,
  chatContainer,
  inputRef,
  currentModel,
  renderMarkdown,
  switchPersona,
  clearChat,
  autoResize,
  handleEnter,
  sendMessage,
  createConversation,
  switchConversationById,
  deleteConversationById,
} = useChat()

const { authUser, authLoading, authError, isAuthenticated, role, login, logout } = useAuth()

const showLogin = ref(false)
const loginUsername = ref('')
const loginPassword = ref('')

const isAdmin = computed(() => role.value === 'admin')

const handleCreateConversation = () => {
  createConversation()
}

const handleSwitchConversation = (id: string) => {
  switchConversationById(id)
}

const handleDeleteConversation = (id: string) => {
  if (!isAuthenticated.value || (role.value !== 'admin' && role.value !== 'user')) {
    alert('当前角色无权删除会话，请先登录。')
    return
  }
  deleteConversationById(id)
}

const handleLoginSubmit = async (payload: { username: string; password: string }) => {
  const result = await login(payload.username, payload.password)
  if (result.ok) {
    showLogin.value = false
    loginPassword.value = ''
  }
}

const handleLogout = () => {
  logout()
}
</script>
<style>
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #475569;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out forwards;
}

.code-copy-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.15rem 0.5rem;
  font-size: 0.7rem;
  border-radius: 0.375rem;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background-color: rgba(15, 23, 42, 0.8);
  color: rgba(226, 232, 240, 0.9);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.code-copy-btn:hover {
  background-color: rgba(30, 64, 175, 0.9);
  border-color: rgba(129, 140, 248, 0.9);
}

.code-copy-btn.copied {
  background-color: rgba(22, 163, 74, 0.9);
  border-color: rgba(74, 222, 128, 0.9);
  color: #ecfeff;
}
</style>
