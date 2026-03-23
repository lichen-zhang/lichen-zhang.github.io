export type PlanType = 'free' | 'pro'
export type PlanCode = 'pro_month' | 'pro_quarter'
export type GenerationType = 'topics' | 'article' | 'titles'

export interface User {
  id: string
  email: string | null
  phone: string | null
  nickname: string | null
  avatar: string | null
  status: string
  plan_type: PlanType
  plan_expire_at: string | null
  quota_left: number
  last_quota_reset_at: string | null
  created_at: string
  updated_at: string
}

export interface SendCodeResponse {
  success: true
  cooldownSeconds?: number
  expireSeconds?: number
  debugCode?: string
}

export interface SendCodeRequest {
  email: string
  behaviorStartedAt?: number
  behaviorSubmitAt?: number
  website?: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface MeResponse {
  user: User
}

export interface GenerateTopicsRequest {
  topic: string
  accountType?: string
  style: string
  length: string
  referenceHistoryIds?: string[]
}

export interface GenerateTopicsResponse {
  topics: string[]
  workflowId: string
  quotaLeft: number
}

export interface GenerateArticleRequest {
  workflowId?: string
  selectedTopic: string
  topic: string
  accountType?: string
  style: string
  length: string
  referenceHistoryIds?: string[]
}

export interface GenerateArticleResponse {
  article: string
}

export interface GenerateTitlesRequest {
  workflowId?: string
  article: string
  topic?: string
  style?: string
  referenceHistoryIds?: string[]
}

export interface GenerateTitlesResponse {
  titles: string[]
}

export interface HistoryItem {
  id: string
  user_id: string
  type: GenerationType
  input_payload: string
  output_payload: string
  model_name: string
  prompt_version: string
  created_at: string
}

export interface HistoryListResponse {
  items: HistoryItem[]
  total: number
}

export interface HistoryDetailResponse {
  item: HistoryItem
}

export interface OrderItem {
  id: string
  user_id: string
  plan_code: PlanCode | string
  amount: number
  currency: string
  status: string
  wx_order_no: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface OrdersResponse {
  items: OrderItem[]
}

export interface CreatePaymentResponse {
  orderId: string
  paymentParams: Record<string, unknown>
}
