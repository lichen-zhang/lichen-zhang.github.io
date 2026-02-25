import { ref, nextTick, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import { loadConversations, saveConversations, type StoredConversation, type StoredMessage } from '../utils/chatDb'

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  isTyping?: boolean
}

export interface Persona {
  id: string
  name: string
  desc: string
  emoji: string
  systemPrompt: string
}

export interface Conversation {
  id: string
  title: string
  personaId: string
  model: string
  createdAt: number
  updatedAt: number
  messages: Message[]
}

const personasSeed: Persona[] = [
  { id: 'default', name: '通用助手', desc: '有问必答的基础 AI', emoji: '🤖', systemPrompt: '你是一个乐于助人的 AI 助手。' },
  {
    id: 'architect',
    name: '前端架构师',
    desc: '精通 Vue/React/Node',
    emoji: '👨‍💻',
    systemPrompt:
      '你是一位资深的前端架构师。请从性能、可维护性、最佳实践的角度回答技术问题。请使用 Markdown 格式回答，代码块要注明语言。'
  },
  {
    id: 'translator',
    name: '中英互译专家',
    desc: '精准信达雅',
    emoji: '🌍',
    systemPrompt: '你是一位精通中英文的翻译专家。如果你收到中文，请翻译成地道的英文；如果收到英文，翻译成地道的中文。'
  }
]

const DEFAULT_MODEL = 'deepseek-chat'
const DEFAULT_PERSONA_ID = personasSeed[0]?.id ?? 'default'

// Markdown 渲染与代码高亮（含复制按钮）
const md: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight: function (str: string, lang: string): string {
    const basePreClass =
      'hljs relative group p-4 rounded-lg overflow-x-auto bg-[#282c34] border border-slate-700/50'

    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        return `
<pre class="${basePreClass}">
  <button type="button" class="code-copy-btn opacity-0 group-hover:opacity-100" data-copy-code>
    复制
  </button>
  <code class="language-${lang}">${highlighted}</code>
</pre>`
      } catch {
        // fall through to plain output
      }
    }

    return `
<pre class="${basePreClass}">
  <button type="button" class="code-copy-btn opacity-0 group-hover:opacity-100" data-copy-code>
    复制
  </button>
  <code>${md.utils.escapeHtml(str)}</code>
</pre>`
  }
})

const renderMarkdown = (content: string) => {
  if (!content) return ''
  return md.render(content)
}

export function useChat() {
  const baseUrl = ref('https://api.stackout.work')

  const personas = ref<Persona[]>(personasSeed)
  const conversations = ref<Conversation[]>([])
  const currentConversationId = ref<string | null>(null)
  const inputContent = ref('')
  const isLoading = ref(false)
  const isSidebarOpen = ref(false)
  const chatContainer = ref<HTMLElement | null>(null)
  const inputRef = ref<HTMLTextAreaElement | null>(null)
  const currentModel = computed({
    get: () => currentConversation.value?.model ?? DEFAULT_MODEL,
    set: (val: string) => {
      if (currentConversation.value) {
        currentConversation.value.model = val
        currentConversation.value.updatedAt = Date.now()
      }
    }
  })

  const currentConversation = computed<Conversation | null>(() => {
    if (!currentConversationId.value) return conversations.value[0] ?? null
    return conversations.value.find((c) => c.id === currentConversationId.value) ?? conversations.value[0] ?? null
  })

  const messages = computed<Message[]>(() => currentConversation.value?.messages ?? [])

  const currentPersona = computed<Persona>(() => {
    const pid = currentConversation.value?.personaId
    const found = personas.value.find((p) => p.id === pid)
    return (found || personasSeed[0]) as Persona
  })

  const ensureConversationExists = () => {
    if (conversations.value.length === 0) {
      const now = Date.now()
      const firstId = createId()
      conversations.value.push({
        id: firstId,
        title: '新会话',
        personaId: DEFAULT_PERSONA_ID,
        model: DEFAULT_MODEL,
        createdAt: now,
        updatedAt: now,
        messages: []
      })
      currentConversationId.value = firstId
    }
  }

  const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  const createConversation = (opts?: { title?: string; personaId?: string; model?: string }): Conversation => {
    const now = Date.now()
    const id = createId()
    const conv: Conversation = {
      id,
      title: opts?.title || '新会话',
      personaId: opts?.personaId || DEFAULT_PERSONA_ID,
      model: opts?.model || DEFAULT_MODEL,
      createdAt: now,
      updatedAt: now,
      messages: []
    }
    conversations.value.unshift(conv)
    currentConversationId.value = id
    return conv
  }

  const switchConversationById = (id: string) => {
    if (currentConversationId.value === id) return
    const exists = conversations.value.some((c) => c.id === id)
    if (!exists) return
    currentConversationId.value = id
    isSidebarOpen.value = false
  }

  const deleteConversationById = (id: string) => {
    if (conversations.value.length <= 1) {
      // 至少保留一个会话
      const conv = conversations.value[0]
      if (conv) {
        conv.messages = []
        conv.title = '新会话'
        conv.updatedAt = Date.now()
      }
      return
    }
    const idx = conversations.value.findIndex((c) => c.id === id)
    if (idx === -1) return
    conversations.value.splice(idx, 1)
    if (currentConversationId.value === id) {
      const next = conversations.value[idx] || conversations.value[idx - 1] || conversations.value[0] || null
      currentConversationId.value = next ? next.id : null
    }
  }

  const renameConversation = (id: string, title: string) => {
    const target = conversations.value.find((c) => c.id === id)
    if (!target) return
    target.title = title || '未命名会话'
    target.updatedAt = Date.now()
  }

  const switchPersona = (persona: Persona) => {
    if (!currentConversation.value) return
    if (currentConversation.value.personaId !== persona.id) {
      currentConversation.value.personaId = persona.id
      currentConversation.value.updatedAt = Date.now()
      isSidebarOpen.value = false
    }
  }

  const clearChat = () => {
    if (!currentConversation.value) return
    if (confirm('确定要清空当前对话记录吗？')) {
      currentConversation.value.messages = []
      currentConversation.value.updatedAt = Date.now()
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
    if (!e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  const sendMessage = async () => {
    if (!inputContent.value.trim() || isLoading.value) return
    ensureConversationExists()
    const conv = currentConversation.value
    if (!conv) return
    const userText = inputContent.value
    inputContent.value = ''
    if (inputRef.value) inputRef.value.style.height = 'auto'

    conv.messages.push({ role: 'user', content: userText })
    if (conv.title === '新会话') {
      const firstLine = userText.split('\n')[0] || '新会话'
      conv.title = firstLine.slice(0, 30)
    }
    conv.updatedAt = Date.now()
    await scrollToBottom()

    const aiMessage: Message = { role: 'assistant', content: '', isTyping: true }
    conv.messages.push(aiMessage)
    isLoading.value = true

    try {
      const apiMessages = [
        { role: 'system', content: currentPersona.value.systemPrompt },
        ...conv.messages.slice(0, -1).map(({ role, content }) => ({ role, content }))
      ]

      const response = await fetch(`${baseUrl.value}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: currentModel.value,
          messages: apiMessages,
          stream: true,
          temperature: currentModel.value === 'deepseek-reasoner' ? 0.6 : 1.0
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
              const content = json.choices[0]?.delta?.content || ''
              if (content) {
                aiMessage.content += content
                void scrollToBottom()
              }
            } catch {
              // ignore single line parse errors
            }
          }
        }
      }
    } catch (error) {
      aiMessage.content += `\n[错误: ${(error as Error).message}]`
    } finally {
      aiMessage.isTyping = false
      isLoading.value = false
      conv.updatedAt = Date.now()
    }
  }

  const handleCopyClick = async (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    if (!target) return

    const button = target.closest('[data-copy-code]') as HTMLButtonElement | null
    if (!button) return

    const pre = button.closest('pre')
    if (!pre) return

    const codeElement = pre.querySelector('code')
    if (!codeElement) return

    const code = codeElement.textContent || ''
    if (!code.trim()) return

    try {
      await navigator.clipboard.writeText(code)
      const originalText = button.innerText
      button.innerText = '已复制'
      button.classList.add('copied')
      setTimeout(() => {
        button.innerText = originalText
        button.classList.remove('copied')
      }, 1500)
    } catch {
      // 简单降级，不抛出错误
    }
  }

  onMounted(() => {
    ;(async () => {
      const stored = await loadConversations()
      if (stored && stored.length > 0) {
        const now = Date.now()
        conversations.value = stored.map((c: StoredConversation) => ({
          id: c.id,
          title: c.title || '新会话',
          personaId: c.personaId || DEFAULT_PERSONA_ID,
          model: c.model || DEFAULT_MODEL,
          createdAt: c.createdAt || now,
          updatedAt: c.updatedAt || c.createdAt || now,
          messages:
            (c.messages as StoredMessage[] | undefined)?.map((m) => ({
              role: m.role,
              content: m.content,
              isTyping: m.isTyping
            })) || []
        }))
        currentConversationId.value = conversations.value[0]?.id ?? null
      } else {
        // 兼容旧版 localStorage 单会话数据
        const legacyHistory = localStorage.getItem('chat_history')
        const legacyPersonaId = localStorage.getItem('current_persona_id') || DEFAULT_PERSONA_ID
        const legacyModel = localStorage.getItem('current_model') || DEFAULT_MODEL
        const now = Date.now()
        const id = createId()
        let legacyMessages: Message[] = []
        if (legacyHistory) {
          try {
            legacyMessages = JSON.parse(legacyHistory) as Message[]
          } catch (e) {
            console.error('Legacy history parse failed', e)
          }
        }
        conversations.value = [
          {
            id,
            title: '历史会话',
            personaId: legacyPersonaId,
            model: legacyModel,
            createdAt: now,
            updatedAt: now,
            messages: legacyMessages
          }
        ]
        currentConversationId.value = id
      }
      ensureConversationExists()
    })()

    if (chatContainer.value) {
      chatContainer.value.addEventListener('click', handleCopyClick)
    }
  })

  onBeforeUnmount(() => {
    if (chatContainer.value) {
      chatContainer.value.removeEventListener('click', handleCopyClick)
    }
  })

  watch(
    conversations,
    (newVal) => {
      const payload: StoredConversation[] = newVal.map((c) => ({
        id: c.id,
        title: c.title,
        personaId: c.personaId,
        model: c.model,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messages: c.messages.map(
          (m): StoredMessage => ({
            role: m.role,
            content: m.content,
            isTyping: m.isTyping
          })
        )
      }))
      saveConversations(payload).catch(() => {
        // ignore
      })
    },
    { deep: true }
  )

  return {
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
    renameConversation
  }
}

