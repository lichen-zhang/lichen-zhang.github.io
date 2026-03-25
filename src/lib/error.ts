import { AxiosError } from 'axios'

type ApiErrorPayload = {
  message?: string
  error?: string
}

function normalizeApiErrorPayload(raw: unknown): ApiErrorPayload {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ApiErrorPayload
    } catch {
      return { message: raw }
    }
  }
  if (raw && typeof raw === 'object') {
    return raw as ApiErrorPayload
  }
  return {}
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const maybeAxiosLike = err as {
    message?: unknown
    response?: {
      data?: unknown
    }
  }

  if (maybeAxiosLike?.response) {
    const payload = normalizeApiErrorPayload(maybeAxiosLike.response.data)
    const message = typeof maybeAxiosLike.message === 'string' ? maybeAxiosLike.message : ''
    return payload.message || payload.error || message || fallback
  }

  if (err instanceof AxiosError) {
    const payload = normalizeApiErrorPayload(err.response?.data)
    return payload.message || payload.error || err.message || fallback
  }
  if (err instanceof Error) return err.message || fallback
  return fallback
}
