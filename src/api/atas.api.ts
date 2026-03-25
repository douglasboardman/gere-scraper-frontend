import apiClient from './client'
import type { IAtaRegPrecos } from '@/types'

export const atasApi = {
  async listar(identContratacao?: string): Promise<IAtaRegPrecos[]> {
    const params = identContratacao ? { identContratacao } : {}
    const { data } = await apiClient.get<IAtaRegPrecos[]>('/atas', { params })
    return data
  },

  async obter(id: string): Promise<IAtaRegPrecos> {
    const { data } = await apiClient.get<IAtaRegPrecos>(`/atas/${id}`)
    return data
  },

  async atualizar(id: string, data: Partial<IAtaRegPrecos>): Promise<IAtaRegPrecos> {
    const { data: result } = await apiClient.patch<IAtaRegPrecos>(`/atas/${id}`, data)
    return result
  },
}
