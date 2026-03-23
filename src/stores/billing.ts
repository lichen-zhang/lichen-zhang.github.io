import { ref } from 'vue'
import { defineStore } from 'pinia'
import { AxiosError } from 'axios'
import { api } from '../lib/api'
import type { CreatePaymentResponse, OrderItem, OrdersResponse, PlanCode } from '../types/api'

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { error?: string } | undefined
    return data?.error || err.message || fallback
  }
  if (err instanceof Error) return err.message || fallback
  return fallback
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
      const { data } = await api.post<CreatePaymentResponse>('/payment/create', { planCode })
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
