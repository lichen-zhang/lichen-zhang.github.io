<template>
  <div class="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
    
    <aside class="w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-72 absolute z-20 h-full md:relative md:translate-x-0'">
      
      <div class="p-6 border-b border-slate-800 flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">S</div>
        <h1 class="text-lg font-bold tracking-wide text-slate-100">Stackout AI</h1>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">选择角色</h3>
          <div class="space-y-1">
            <button v-for="role in personas" :key="role.id"
              @click="switchPersona(role)"
              class="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 group"
              :class="currentPersona.id === role.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-slate-800 text-slate-400 border border-transparent'">
              <span class="text-xl group-hover:scale-110 transition-transform">{{ role.emoji }}</span>
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">{{ role.name }}</div>
                <div class="text-xs opacity-60 truncate">{{ role.desc }}</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="p-4 bg-slate-900/50 border-t border-slate-800">
         <button @click="clearChat" class="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors py-2 border border-slate-700 rounded-md hover:border-red-900 hover:bg-red-900/10">
          🗑️ 清空当前对话
        </button>
      </div>
    </aside>

    <main class="flex-1 flex flex-col relative w-full h-full bg-slate-950">
      <div class="md:hidden absolute top-4 left-4 z-30">
        <button @click="isSidebarOpen = !isSidebarOpen" class="p-2 bg-slate-800 rounded-md text-slate-400">☰</button>
      </div>

      <div class="flex-1 overflow-y-auto scroll-smooth p-4 md:p-8" ref="chatContainer">
        <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-slate-500 space-y-6 animate-fade-in">
          <div class="text-6xl p-6 bg-slate-900/50 rounded-full border border-slate-800 shadow-xl">{{ currentPersona.emoji }}</div>
          <div class="text-center space-y-2">
            <h2 class="text-2xl font-bold text-slate-200">我是 {{ currentPersona.name }}</h2>
            <p class="max-w-md mx-auto text-sm">{{ currentPersona.systemPrompt }}</p>
            <p class="text-xs text-indigo-400/60 font-mono mt-2">Running on {{ currentModel }}</p>
          </div>
        </div>

        <div v-else class="space-y-8 max-w-3xl mx-auto pb-10">
          <div v-for="(msg, index) in messages" :key="index" class="group animate-slide-up">
            
            <div v-if="msg.role === 'user'" class="flex flex-row-reverse gap-4">
              <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs shrink-0 shadow-lg shadow-indigo-500/20">Me</div>
              <div class="bg-indigo-600 text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-md leading-7 selection:bg-white/30 text-sm md:text-base whitespace-pre-wrap font-sans">
                {{ msg.content }}
              </div>
            </div>

            <div v-else class="flex gap-4">
              <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0 mt-1">
                {{ currentPersona.emoji }}
              </div>
              <div class="flex-1 min-w-0"> 
                <div class="font-bold text-xs text-slate-500 mb-1 ml-1 flex items-center gap-2">
                    {{ currentPersona.name }}
                    </div>
                
                <div 
                  class="prose prose-invert prose-slate max-w-none 
                         prose-p:leading-7 prose-pre:bg-[#282c34] prose-pre:p-0 
                         prose-pre:border prose-pre:border-slate-700/50 prose-pre:rounded-lg
                         prose-code:text-indigo-300 prose-code:bg-slate-800/50 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                         text-sm md:text-base"
                  v-html="renderMarkdown(msg.content)"
                ></div>

                <div v-if="msg.isTyping" class="inline-block w-2 h-4 ml-1 mt-1 bg-indigo-400 animate-pulse"></div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div class="p-4 md:p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
        <div class="max-w-3xl mx-auto relative bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
          
          <div class="absolute top-2 left-2 z-10">
            <select v-model="currentModel" 
              class="bg-slate-800/80 hover:bg-slate-800 text-xs text-indigo-300 border border-slate-700/50 rounded-lg px-2 py-1 pr-6 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none transition-colors font-mono">
              <option value="deepseek-chat">DeepSeek-V3 (Chat)</option>
              <option value="deepseek-reasoner">DeepSeek-R1 (推理)</option>
              <option value="deepseek-coder">DeepSeek-Coder</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-400">
              <svg class="h-3 w-3 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>

          <textarea 
            v-model="inputContent" 
            @keydown.enter.prevent="handleEnter"
            placeholder="输入消息..." 
            class="w-full bg-transparent text-slate-200 pl-4 pr-14 pt-10 pb-4 focus:outline-none resize-none max-h-48 min-h-[80px] scrollbar-hide"
            rows="1" ref="inputRef" @input="autoResize"
          ></textarea>

          <button @click="sendMessage" :disabled="isLoading || !inputContent.trim()"
            class="absolute right-2 bottom-2 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20 disabled:shadow-none">
            <span v-if="!isLoading" class="text-sm font-bold">↑</span>
            <span v-else class="animate-spin text-sm">↻</span>
          </button>
        </div>
        <p class="text-center text-[10px] text-slate-600 mt-2">AI 可能生成错误信息，请核对重要事实。</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

// --- Markdown 配置 ---
const md = new MarkdownIt({
  html: false, 
  linkify: true, 
  typographer: true, 
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs p-4 rounded-lg overflow-x-auto"><code class="language-${lang}">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      } catch (__) {}
    }
    return `<pre class="hljs p-4 rounded-lg overflow-x-auto"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

const renderMarkdown = (content: string) => {
  if (!content) return ''
  return md.render(content)
}

// --- 类型定义 ---
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  isTyping?: boolean
}

interface Persona {
  id: string
  name: string
  desc: string
  emoji: string
  systemPrompt: string
}

// --- 数据 ---
const personas: Persona[] = [
  { id: 'default', name: '通用助手', desc: '有问必答的基础 AI', emoji: '🤖', systemPrompt: '你是一个乐于助人的 AI 助手。' },
  { id: 'architect', name: '前端架构师', desc: '精通 Vue/React/Node', emoji: '👨‍💻', systemPrompt: '你是一位资深的前端架构师。请从性能、可维护性、最佳实践的角度回答技术问题。请使用 Markdown 格式回答，代码块要注明语言。' },
  { id: 'translator', name: '中英互译专家', desc: '精准信达雅', emoji: '🌍', systemPrompt: '你是一位精通中英文的翻译专家。如果你收到中文，请翻译成地道的英文；如果收到英文，翻译成地道的中文。' }
]

// --- 状态管理 ---
const baseUrl = ref('https://api.stackout.work')

const currentPersona = ref<Persona>(personas[0])
const messages = ref<Message[]>([])
const inputContent = ref('')
const isLoading = ref(false)
const isSidebarOpen = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)

// ⭐ 新增：当前选择的模型
const currentModel = ref('deepseek-chat') 

// --- 初始化与持久化 ---
onMounted(() => {
  const savedPersonaId = localStorage.getItem('current_persona_id')
  if (savedPersonaId) {
    const found = personas.find(p => p.id === savedPersonaId)
    if (found) currentPersona.value = found
  }
  
  // 恢复上次选择的模型
  const savedModel = localStorage.getItem('current_model')
  if (savedModel) {
    currentModel.value = savedModel
  }

  const savedHistory = localStorage.getItem('chat_history')
  if (savedHistory) {
    try { messages.value = JSON.parse(savedHistory) } catch (e) { console.error('History parse failed', e) }
  }
})

// 监听模型变化并保存
watch(currentModel, (newModel) => {
  localStorage.setItem('current_model', newModel)
})

watch(messages, (newVal) => {
  localStorage.setItem('chat_history', JSON.stringify(newVal))
}, { deep: true })

// --- 逻辑 ---
const switchPersona = (persona: Persona) => {
  if (currentPersona.value.id !== persona.id) {
    currentPersona.value = persona
    localStorage.setItem('current_persona_id', persona.id)
    isSidebarOpen.value = false
  }
}

const clearChat = () => {
  if(confirm('确定要清空当前对话记录吗？')) {
    messages.value = []
    localStorage.removeItem('chat_history')
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

const autoResize = () => {
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
    inputRef.value.style.height = inputRef.value.scrollHeight + 'px'
  }
}

const handleEnter = (e: KeyboardEvent) => {
  if (!e.shiftKey) sendMessage()
}

const sendMessage = async () => {
  if (!inputContent.value.trim() || isLoading.value) return
  
  const userText = inputContent.value
  inputContent.value = ''
  if(inputRef.value) inputRef.value.style.height = 'auto'
  
  messages.value.push({ role: 'user', content: userText })
  scrollToBottom()

  const aiMessage: Message = { role: 'assistant', content: '', isTyping: true }
  messages.value.push(aiMessage)
  isLoading.value = true

  try {
    const apiMessages = [
      { role: 'system', content: currentPersona.value.systemPrompt },
      ...messages.value.slice(0, -1).map(({ role, content }) => ({ role, content }))
    ]

    const response = await fetch(`${baseUrl.value}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: currentModel.value, // ⭐ 动态使用当前选中的模型
        messages: apiMessages,
        stream: true,
        temperature: currentModel.value === 'deepseek-reasoner' ? 0.6 : 1.0 // R1 建议温度低一点，V3 默认
      })
    })

    if (!response.ok) throw new Error(`API Error: ${response.status}`)
    if (!response.body) throw new Error('ReadableStream not supported')

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim() === '' || line.trim() === 'data: [DONE]') continue
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6))
            // DeepSeek Reasoner (R1) 有时返回 content 在 reasoning_content 里，但 V3 API 还是 standard 格式
            // 这里兼容处理常规 delta content
            const content = json.choices[0]?.delta?.content || ''
            aiMessage.content += content
            scrollToBottom()
          } catch (e) { /* ignore */ }
        }
      }
    }
  } catch (error) {
    aiMessage.content += `\n[错误: ${(error as Error).message}]`
  } finally {
    aiMessage.isTyping = false
    isLoading.value = false
    localStorage.setItem('chat_history', JSON.stringify(messages.value))
  }
}
</script>

<style>
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #475569; }

@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
</style>