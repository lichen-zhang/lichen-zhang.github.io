import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/error'
import type { CreatePaymentResponse, OrderItem, OrdersResponse, PlanCode } from '../types/api'

const WECHAT_PAY_QR_IMAGE_URL = String(import.meta.env.VITE_WECHAT_PAY_QR_IMAGE_URL || '').trim()
const DEFAULT_WECHAT_PAY_QR_IMAGE_URL = new URL('../assets/wechat-pay-qr.jpg', import.meta.url).href

function getErrorMessage(err: unknown, fallback: string): string {
  return getApiErrorMessage(err, fallback)
}

export const useBillingStore = defineStore('billing', () => {
  const orders = ref<OrderItem[]>([])
  const latestPayment = ref<CreatePaymentResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function createOrder(planCode: PlanCode) {
    loading.value = true
    error.value = null
    try {
      const qrImageUrl = WECHAT_PAY_QR_IMAGE_URL || DEFAULT_WECHAT_PAY_QR_IMAGE_URL
      const data: CreatePaymentResponse = {
        orderId: `manual_${Date.now()}`,
        paymentParams: {
          mode: 'wechat_qr_image',
          planCode,
          qrImageUrl,
          isUsingDefaultQr: !WECHAT_PAY_QR_IMAGE_URL,
          createdAt: new Date().toISOString(),
        },
      }
      latestPayment.value = data
      return data
    } catch (err: unknown) {
      error.value = getErrorMessage(err, '创建订单失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchOrders() {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<OrdersResponse>('/orders')
      orders.value = data.items
      return data.items
    } catch (err: unknown) {
      error.value = getErrorMessage(err, '获取订单失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    orders,
    latestPayment,
    loading,
    error,
    createOrder,
    fetchOrders,
  }
})
