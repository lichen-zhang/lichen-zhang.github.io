import type { UserDTO } from '../types/dto'
import { HttpError } from '../utils/http'
import { AuthService } from '../services/authService'

export async function requireAuthUser(request: Request, authService: AuthService): Promise<UserDTO> {
  const header = request.headers.get('Authorization')
  const token = header?.replace(/^Bearer\s+/i, '')
  if (!token) {
    throw new HttpError(401, '缺少登录凭证')
  }
  return authService.getUserFromToken(token)
}
