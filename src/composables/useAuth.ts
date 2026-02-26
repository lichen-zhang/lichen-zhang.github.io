import { ref, computed, onMounted } from 'vue'

export type AuthRole = 'guest' | 'user' | 'admin'

export interface AuthUser {
  id: number
  username: string
  displayName: string
  role: AuthRole
}

interface LoginResponse {
  token: string
  user: {
    id: number
    username: string
    displayName: string
    role: AuthRole
  }
}

interface StoredAuthState {
  token: string
  user: AuthUser
}

const AUTH_STORAGE_KEY = 'stackout_auth_state_v1'

const authUser = ref<AuthUser | null>(null)
const authToken = ref<string | null>(null)
const authLoading = ref(false)
const authError = ref<string | null>(null)

const API_BASE =
  (import.meta.env && (import.meta.env as any).VITE_API_BASE_URL) || 'https://api.stackout.work'

export function useAuth() {
  const isAuthenticated = computed(() => !!authUser.value && !!authToken.value)
  const role = computed<AuthRole>(() => authUser.value?.role ?? 'guest')

  const restoreFromStorage = () => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as StoredAuthState
      if (parsed?.token && parsed?.user) {
        authToken.value = parsed.token
        authUser.value = parsed.user
      }
    } catch {
      // ignore corrupted storage
    }
  }

  const persistToStorage = () => {
    if (!authUser.value || !authToken.value) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return
    }
    const payload: StoredAuthState = {
      token: authToken.value,
      user: authUser.value
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload))
  }

  const clearAuthState = () => {
    authUser.value = null
    authToken.value = null
    authError.value = null
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  const login = async (username: string, password: string) => {
    if (!username.trim() || !password.trim()) {
      authError.value = '用户名和密码不能为空'
      return { ok: false, message: authError.value }
    }

    authLoading.value = true
    authError.value = null

    try {
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      if (!resp.ok) {
        const text = await resp.text()
        const msg = text || `登录失败（${resp.status}）`
        authError.value = msg
        return { ok: false, message: msg }
      }

      const data = (await resp.json()) as LoginResponse
      authToken.value = data.token
      authUser.value = {
        id: data.user.id,
        username: data.user.username,
        displayName: data.user.displayName,
        role: data.user.role
      }
      persistToStorage()
      return { ok: true as const }
    } catch (e) {
      const msg = (e as Error).message || '网络错误，请稍后重试'
      authError.value = msg
      return { ok: false, message: msg }
    } finally {
      authLoading.value = false
    }
  }

  const logout = () => {
    clearAuthState()
  }

  const requireRole = (minRole: AuthRole) => {
    const order: AuthRole[] = ['guest', 'user', 'admin']
    const current = role.value
    return order.indexOf(current) >= order.indexOf(minRole)
  }

  onMounted(() => {
    if (!authUser.value && !authToken.value) {
      restoreFromStorage()
    }
  })

  return {
    authUser,
    authToken,
    authLoading,
    authError,
    isAuthenticated,
    role,
    login,
    logout,
    requireRole
  }
}

