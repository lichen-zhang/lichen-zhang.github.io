import type { Env } from '../types/env'
import { json } from '../utils/http'
import { requireAuthUser } from '../middleware/auth'
import { AuthService } from '../services/authService'
import { PaymentService } from '../services/paymentService'

export async function handleOrderList(
  request: Request,
  env: Env,
  authService: AuthService,
  paymentService: PaymentService,
): Promise<Response> {
  const user = await requireAuthUser(request, authService)
  const items = await paymentService.listOrders(user)
  return json(request, env, { items })
}
