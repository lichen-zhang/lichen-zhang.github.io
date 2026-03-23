import { HttpError } from './http'

export function requirePhone(phone: string): string {
  const value = (phone || '').trim()
  if (!/^\d{11}$/.test(value)) {
    throw new HttpError(400, '手机号格式不正确')
  }
  return value
}

export function requireEmail(email: string): string {
  const value = (email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new HttpError(400, '邮箱格式不正确')
  }
  return value
}

export function requireText(value: string | undefined, fieldName: string): string {
  const text = (value || '').trim()
  if (!text) {
    throw new HttpError(400, `${fieldName} 不能为空`)
  }
  return text
}
