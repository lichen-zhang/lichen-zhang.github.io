import type { Env, PlanCode } from '../types/env'
import type { CreateOrderBody, PaymentCallbackBody, UserDTO } from '../types/dto'
import { OrderRepository } from '../repositories/orderRepo'
import { UserRepository } from '../repositories/userRepo'
import { SubscriptionLogRepository } from '../repositories/subscriptionLogRepo'
import { HttpError } from '../utils/http'
import { addDaysISO } from '../utils/time'
import { createWxOrderNo } from '../utils/id'

const PLAN_CONFIG: Record<PlanCode, { amount: number; days: number }> = {
  pro_month: { amount: 49, days: 30 },
  pro_quarter: { amount: 129, days: 90 },
}

export class PaymentService {
  private readonly orderRepo: OrderRepository
  private readonly userRepo: UserRepository
  private readonly logRepo: SubscriptionLogRepository

  constructor(private readonly env: Env) {
    this.orderRepo = new OrderRepository(env.DB)
    this.userRepo = new UserRepository(env.DB)
    this.logRepo = new SubscriptionLogRepository(env.DB)
  }

  async createOrder(user: UserDTO, body: CreateOrderBody): Promise<{ orderId: string; paymentParams: Record<string, unknown> }> {
    const planCode = body.planCode
    if (!planCode || !PLAN_CONFIG[planCode]) {
      throw new HttpError(400, 'planCode 不支持')
    }

    const config = PLAN_CONFIG[planCode]
    const wxOrderNo = createWxOrderNo()
    const order = await this.orderRepo.create({
      userId: user.id,
      planCode,
      amount: config.amount,
      currency: 'CNY',
      wxOrderNo,
    })

    return {
      orderId: order.id,
      paymentParams: {
        wxOrderNo,
        amount: order.amount,
        currency: order.currency,
        mockPayUrl: `https://pay.weixin.qq.com/mock/${wxOrderNo}`,
      },
    }
  }

  verifyCallbackSignature(request: Request): void {
    if (!this.env.WECHAT_CALLBACK_SECRET) return
    const sign = request.headers.get('X-Wechat-Sign')
    if (sign !== this.env.WECHAT_CALLBACK_SECRET) {
      throw new HttpError(401, '支付回调验签失败')
    }
  }

  async handleCallback(body: PaymentCallbackBody): Promise<{ success: true; message: string }> {
    if (!body.wxOrderNo) throw new HttpError(400, 'wxOrderNo 不能为空')
    if (!body.status) throw new HttpError(400, 'status 不能为空')

    const order = await this.orderRepo.findByWxOrderNo(body.wxOrderNo)
    if (!order) throw new HttpError(404, '订单不存在')

    if (order.status === 'paid') {
      return { success: true, message: '订单已处理' }
    }

    if (body.status === 'FAIL') {
      await this.orderRepo.markFailed(order.id)
      return { success: true, message: '已更新失败状态' }
    }

    const plan = PLAN_CONFIG[order.plan_code as PlanCode]
    if (!plan) throw new HttpError(400, '订单套餐非法')

    const paidAt = body.paidAt || new Date().toISOString()
    await this.orderRepo.markPaid(order.id, paidAt)
    const expireAt = addDaysISO(plan.days)
    await this.userRepo.updatePlan(order.user_id, 'pro', expireAt, -1)
    await this.logRepo.create({
      userId: order.user_id,
      action: 'upgrade',
      planType: 'pro',
      expireAt,
      sourceOrderId: order.id,
    })

    return { success: true, message: '支付成功并已开通会员' }
  }

  async listOrders(user: UserDTO) {
    return this.orderRepo.listByUser(user.id)
  }
}
