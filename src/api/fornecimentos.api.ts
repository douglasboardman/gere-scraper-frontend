import apiClient from './client'
import type { IFornecimento } from '@/types'

export const fornecimentosApi = {
  async listar(params?: {
    identItem?: string
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

  async listarPorContratacaoUnidade(identContratacao: string, uasg: string): Promise<IFornecimento[]> {
    const { data } = await apiClient.get<IFornecimento[]>(`/fornecimentos/contratacao/${identContratacao}/unidade/${uasg}`)
    return data
  },

  async atualizar(id: number, data: Partial<IFornecimento>): Promise<IFornecimento> {
    const { data: result } = await apiClient.patch<IFornecimento>(`/fornecimentos/${id}`, data)
    return result
  },
}
