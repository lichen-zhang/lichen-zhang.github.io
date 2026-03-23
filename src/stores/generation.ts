import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { AxiosError } from 'axios'
import { api } from '../lib/api'
import type {
  GenerateArticleRequest,
  GenerateArticleResponse,
  GenerateTitlesRequest,
  GenerateTitlesResponse,
  GenerateTopicsRequest,
  GenerateTopicsResponse,
  HistoryDetailResponse,
  HistoryItem,
  HistoryListResponse,
} from '../types/api'
import { useAuthStore } from './auth'

interface ReferenceContext {
  key: string
  historyIds: string[]
  label: string
  topic: string
  accountType: string
  style: string
  selectedTopic: string
  semanticTag: string
  summary?: string
  counts?: {
    topics: number
    article: number
    titles: number
  }
}

interface ComposeDraft {
  topic: string
  accountType: string
  style: string
  length: string
  selectedTopic: string
  workflowId: string
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status
    const data = err.response?.data as { error?: string } | undefined
    const message = data?.error || err.message || fallback
    if (status === 429 && message.includes('今日免费额度已用完')) {
      return '今日免费额度已用完。免费版每天 3 次，仅生成选题成功时扣减。请明天再试或前往套餐页升级。'
    }
    if (status === 403 && message.includes('请先完成选题生成')) {
      return '请先完成选题生成，再继续生成正文或标题。免费版当前按“选题 -> 正文/标题”的流程使用。'
    }
    if (status === 401) {
      return '登录状态已失效，请重新登录后再试。'
    }
    return message
  }
  if (err instanceof Error) return err.message || fallback
  return fallback
}

export const useGenerationStore = defineStore('generation', () => {
  const topics = ref<string[]>([])
  const article = ref('')
  const titles = ref<string[]>([])
  const workflowId = ref<string>('')

  const history = ref<HistoryItem[]>([])
  const historyTotal = ref(0)
  const historyDetail = ref<HistoryItem | null>(null)
  const referenceContexts = ref<ReferenceContext[]>([])
  const activeReferenceKey = ref<string | null>(null)
  const composeDraft = ref<ComposeDraft | null>(null)

  const loading = ref(false)
  const error = ref<string | null>(null)

  const primaryReference = computed(() => {
    if (!referenceContexts.value.length) return null
    if (activeReferenceKey.value) {
      const active = referenceContexts.value.find((item) => item.key === activeReferenceKey.value)
      if (active) return active
    }
    return referenceContexts.value[0]
  })

  const referenceHistoryIds = computed(() =>
    Array.from(
      new Set(referenceContexts.value.flatMap((item) => item.historyIds).filter(Boolean))
    )
  )

  async function generateTopics(payload: GenerateTopicsRequest) {
    const auth = useAuthStore()
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post<GenerateTopicsResponse>('/generate/topics', payload)
      topics.value = data.topics
      workflowId.value = data.workflowId

      if (auth.user) {
        auth.setUser({
          ...auth.user,
          quota_left: data.quotaLeft,
        })
      }
      return data
    } catch (err: unknown) {
      error.value = getErrorMessage(err, '生成选题失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function generateArticle(payload: GenerateArticleRequest) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post<GenerateArticleResponse>('/generate/article', payload)
      article.value = data.article
      return data
    } catch (err: unknown) {
      error.value = getErrorMessage(err, '生成正文失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function generateTitles(payload: GenerateTitlesRequest) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post<GenerateTitlesResponse>('/generate/titles', payload)
      titles.value = data.titles
      return data
    } catch (err: unknown) {
      error.value = getErrorMessage(err, '生成标题失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchHistory(params: { page?: number; pageSize?: number; type?: string } = {}) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<HistoryListResponse>('/history', { params })
      history.value = data.items
      historyTotal.value = data.total
      return data
    } catch (err: unknown) {
      error.value = getErrorMessage(err, '获取历史失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchHistoryDetail(id: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<HistoryDetailResponse>(`/history/${id}`)
      historyDetail.value = data.item
      return data.item
    } catch (err: unknown) {
      error.value = getErrorMessage(err, '获取历史详情失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  function resetWorkspace() {
    topics.value = []
    article.value = ''
    titles.value = []
    workflowId.value = ''
  }

  function setReferenceContext(context: ReferenceContext | null) {
    if (!context) {
      referenceContexts.value = []
      activeReferenceKey.value = null
      return
    }
    referenceContexts.value = [context]
    activeReferenceKey.value = context.key
  }

  function appendReferenceContext(context: ReferenceContext) {
    const index = referenceContexts.value.findIndex((item) => item.key === context.key)
    if (index >= 0) {
      referenceContexts.value[index] = context
    } else {
      referenceContexts.value = [...referenceContexts.value, context]
    }
    activeReferenceKey.value = context.key
  }

  function removeReferenceContext(key: string) {
    referenceContexts.value = referenceContexts.value.filter((item) => item.key !== key)
    if (!referenceContexts.value.length) {
      activeReferenceKey.value = null
      return
    }
    if (activeReferenceKey.value === key) {
      const first = referenceContexts.value[0]
      activeReferenceKey.value = first ? first.key : null
    }
  }

  function setActiveReference(key: string) {
    activeReferenceKey.value = key
  }

  function clearReferenceContext() {
    referenceContexts.value = []
    activeReferenceKey.value = null
  }

  function setComposeDraft(draft: ComposeDraft | null) {
    composeDraft.value = draft
  }

  function clearComposeDraft() {
    composeDraft.value = null
  }

  return {
    topics,
    article,
    titles,
    workflowId,
    history,
    historyTotal,
    historyDetail,
    referenceContexts,
    primaryReference,
    referenceHistoryIds,
    activeReferenceKey,
    composeDraft,
    loading,
    error,
    generateTopics,
    generateArticle,
    generateTitles,
    fetchHistory,
    fetchHistoryDetail,
    resetWorkspace,
    setReferenceContext,
    appendReferenceContext,
    removeReferenceContext,
    setActiveReference,
    clearReferenceContext,
    setComposeDraft,
    clearComposeDraft,
  }
})
