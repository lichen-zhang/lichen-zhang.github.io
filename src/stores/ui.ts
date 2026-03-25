import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const DEFAULT_LOADING_TEXT = '正在处理中...'

export const useUiStore = defineStore('ui', () => {
  const pendingRequests = ref(new Map<number, string>())
  const latestLoadingText = ref(DEFAULT_LOADING_TEXT)

  const isGlobalLoading = computed(() => pendingRequests.value.size > 0)
  const globalLoadingText = computed(() => latestLoadingText.value || DEFAULT_LOADING_TEXT)

  function beginRequest(requestId: number, text?: string) {
    const label = (text || '').trim() || DEFAULT_LOADING_TEXT
    latestLoadingText.value = label
    const next = new Map(pendingRequests.value)
    next.set(requestId, label)
    pendingRequests.value = next
  }

  function endRequest(requestId: number) {
    if (!pendingRequests.value.has(requestId)) return
    const next = new Map(pendingRequests.value)
    next.delete(requestId)
    pendingRequests.value = next

    if (!next.size) {
      latestLoadingText.value = DEFAULT_LOADING_TEXT
      return
    }
    const labels = Array.from(next.values())
    latestLoadingText.value = labels[labels.length - 1] || DEFAULT_LOADING_TEXT
  }

  return {
    isGlobalLoading,
    globalLoadingText,
    beginRequest,
    endRequest,
  }
})
