import apiClient from './client'
import type { IFornecimento } from '@/types'

export const fornecimentosApi = {
  async listar(params?: {
    idItem?: string
    uasgUnParticipante?: string
  }): Promise<IFornecimento[]> {
    const { data } = await apiClient.get<IFornecimento[]>('/fornecimentos', { params })
    return data
  },

  async obter(id: string): Promise<IFornecimento> {
    const { data } = await apiClient.get<IFornecimento>(`/fornecimentos/${id}`)
    return data
  },

  async listarPorUnidade(uasg: string): Promise<IFornecimento[]> {
    const { data } = await apiClient.get<IFornecimento[]>(`/fornecimentos/unidade/${uasg}`)
    return data
  },

  async listarPorCompraUnidade(idCompra: string, uasg: string): Promise<IFornecimento[]> {
    const { data } = await apiClient.get<IFornecimento[]>(`/fornecimentos/compra/${idCompra}/unidade/${uasg}`)
    return data
  },

  async atualizar(id: string, data: Partial<IFornecimento>): Promise<IFornecimento> {
    const { data: result } = await apiClient.patch<IFornecimento>(`/fornecimentos/${id}`, data)
    return result
  },
}
