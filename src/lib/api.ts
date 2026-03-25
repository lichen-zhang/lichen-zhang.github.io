import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { useUiStore } from '../stores/ui'

const baseURL = import.meta.env.DEV
  ? '/bizApi'
  : import.meta.env.VITE_BIZ_API_BASE_URL ||
    '/bizApi'

export const api = axios.create({
  baseURL,
  timeout: 45000,
})

let requestSeq = 0

function getLoadingText(config: InternalAxiosRequestConfig): string {
  const url = String(config.url || '')
  if (url.includes('/generate/topics')) return 'AI 正在生成选题中...'
  if (url.includes('/generate/article')) return 'AI 正在撰写正文中...'
  if (url.includes('/generate/titles')) return 'AI 正在提炼标题中...'
  if (url.includes('/auth/send-code')) return '正在发送验证码...'
  if (url.includes('/auth/login')) return '正在登录并同步账户信息...'
  if (url.includes('/auth/me')) return '正在校验登录状态...'
  if (url.includes('/history')) return '正在加载历史记录...'
  return '正在处理中...'
}

function isGlobalLoadingEnabled(config: InternalAxiosRequestConfig & { skipGlobalLoading?: boolean }) {
  return !config.skipGlobalLoading
}

function startGlobalLoading(config: InternalAxiosRequestConfig & { _loadingId?: number; skipGlobalLoading?: boolean }) {
  if (!isGlobalLoadingEnabled(config)) return
  try {
    const ui = useUiStore()
    const loadingId = ++requestSeq
    config._loadingId = loadingId
    ui.beginRequest(loadingId, getLoadingText(config))
  } catch {
    // Pinia not ready yet; skip global loading for this request.
  }
}

function endGlobalLoading(config?: (InternalAxiosRequestConfig & { _loadingId?: number; skipGlobalLoading?: boolean }) | null) {
  if (!config || !isGlobalLoadingEnabled(config)) return
  const loadingId = config._loadingId
  if (!loadingId) return
  try {
    const ui = useUiStore()
    ui.endRequest(loadingId)
  } catch {
    // Ignore loading cleanup errors to avoid blocking requests.
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('xhs_writer_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  startGlobalLoading(config as InternalAxiosRequestConfig & { _loadingId?: number; skipGlobalLoading?: boolean })
  return config
})

api.interceptors.response.use(
  (response) => {
    endGlobalLoading(response.config as InternalAxiosRequestConfig & { _loadingId?: number; skipGlobalLoading?: boolean })
    return response
  },
  (error) => {
    endGlobalLoading(error.config as InternalAxiosRequestConfig & { _loadingId?: number; skipGlobalLoading?: boolean })
    return Promise.reject(error)
  }
)
