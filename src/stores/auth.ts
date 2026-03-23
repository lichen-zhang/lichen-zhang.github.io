import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { AxiosError } from 'axios'
import { api } from '../lib/api'
import type { LoginResponse, MeResponse, SendCodeRequest, SendCodeResponse, User } from '../types/api'

const TOKEN_KEY = 'xhs_writer_token'
const USER_KEY = 'xhs_writer_user'

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { error?: string } | undefined
    return data?.error || err.message || fallback
  }
  if (err instanceof Error) return err.message || fallback
  return fallback
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const userRaw = localStorage.getItem(USER_KEY)
  if (userRaw) {
    try {
      user.value = JSON.parse(userRaw) as User
    } catch {
      localStorage.removeItem(USER_KEY)
    }
  }

  const isLoggedIn = computed(() => Boolean(token.value && user.value))

  function persistToken(nextToken: string) {
    token.value = nextToken
    localStorage.setItem(TOKEN_KEY, nextToken)
  }

  function setUser(nextUser: User | null) {
    user.value = nextUser
    if (nextUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }

  async function sendCode(email: string, behavior?: Omit<SendCodeRequest, 'email'>) {
    loading.value = true
    error.value = null
    try {
      const payload: SendCodeRequest = {
        email,
        ...(behavior || {}),
      }
      const { data } = await api.post<SendCodeResponse>('/auth/send-code', payload)
      return data
    } catch (err: unknown) {
      error.value = getErrorMessage(err, '发送验证码失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loginByCode(email: string, code: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', { email, code })
      persistToken(data.token)
      setUser(data.user)
    } catch (err: unknown) {
      error.value = getErrorMessage(err, '登录失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) return null
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<MeResponse>('/auth/me')
      setUser(data.user)
      return data.user
    } catch (err: unknown) {
      const message = getErrorMessage(err, '获取用户信息失败')
      error.value = message
      clearSession()
      return null
    } finally {
      loading.value = false
    }
  }

  function clearSession() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function logout() {
    error.value = null
    clearSession()
  }

  return {
    token,
    user,
    loading,
    error,
    isLoggedIn,
    setUser,
    sendCode,
    loginByCode,
    fetchMe,
    logout,
  }
})
