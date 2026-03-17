import apiClient from './client'
import type { IItem } from '@/types'

export const itensApi = {
  async listar(params?: { idAta?: string; idCompra?: string }): Promise<IItem[]> {
    const { data } = await apiClient.get<IItem[]>('/itens', { params })
    return data
  },

  async obter(id: string): Promise<IItem> {
    const { data } = await apiClient.get<IItem>(`/itens/${id}`)
    return data
  },

  async atualizar(id: string, data: Partial<IItem>): Promise<IItem> {
    const { data: result } = await apiClient.put<IItem>(`/itens/${id}`, data)
    return result
  },
}
