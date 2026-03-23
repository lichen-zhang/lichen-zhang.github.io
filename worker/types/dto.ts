import type { GenerationType, PlanCode, PlanType } from './env'

export interface UserDTO {
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

export interface SendCodeBody {
  email: string
  behaviorStartedAt?: number
  behaviorSubmitAt?: number
  website?: string
}

export interface LoginBody {
  email: string
  code: string
}

export interface GenerateTopicsBody {
  topic: string
  accountType?: string
  style: string
  length: string
}

export interface GenerateArticleBody {
  workflowId?: string
  selectedTopic: string
  topic: string
  accountType?: string
  style: string
  length: string
}

export interface GenerateTitlesBody {
  workflowId?: string
  article: string
  topic?: string
  style?: string
}

export interface HistoryQuery {
  page: number
  pageSize: number
  type?: GenerationType
}

export interface GenerationRow {
  id: string
  user_id: string
  type: GenerationType
  input_payload: string
  output_payload: string
  model_name: string
  prompt_version: string
  created_at: string
}

export interface CreateOrderBody {
  planCode: PlanCode
}

export interface PaymentCallbackBody {
  wxOrderNo: string
  status: 'SUCCESS' | 'FAIL'
  paidAt?: string
}

export interface OrderRow {
  id: string
  user_id: string
  plan_code: string
  amount: number
  currency: string
  status: string
  wx_order_no: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}
