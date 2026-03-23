import type { Env } from '../types/env'
import type { CreateOrderBody, PaymentCallbackBody } from '../types/dto'
import { json, parseJson } from '../utils/http'
import { requireAuthUser } from '../middleware/auth'
import { AuthService } from '../services/authService'
import { PaymentService } from '../services/paymentService'

export async function handleCreatePayment(
  request: Request,
  env: Env,
  authService: AuthService,
  paymentService: PaymentService,
): Promise<Response> {
  const user = await requireAuthUser(request, authService)
  const body = await parseJson<CreateOrderBody>(request)
  const result = await paymentService.createOrder(user, body)
  return json(request, env, result)
}

export async function handlePaymentCallback(
  request: Request,
  env: Env,
  paymentService: PaymentService,
): Promise<Response> {
  paymentService.verifyCallbackSignature(request)
  const body = await parseJson<PaymentCallbackBody>(request)
  const result = await paymentService.handleCallback(body)
  return json(request, env, result)
}
