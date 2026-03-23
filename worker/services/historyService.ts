import type { GenerationType } from '../types/env'
import type { D1DatabaseLike } from '../types/env'
import { GenerationRepository } from '../repositories/generationRepo'
import type { UserDTO } from '../types/dto'
import { HttpError } from '../utils/http'

export class HistoryService {
  private readonly generationRepo: GenerationRepository

  constructor(db: D1DatabaseLike) {
    this.generationRepo = new GenerationRepository(db)
  }

  async list(user: UserDTO, params: { page: number; pageSize: number; type?: GenerationType }) {
    return this.generationRepo.listByUser(user.id, params)
  }

  async detail(user: UserDTO, id: string) {
    const record = await this.generationRepo.findById(user.id, id)
    if (!record) throw new HttpError(404, '历史记录不存在')
    return record
  }
}
