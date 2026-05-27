import apiClient from './client'
import type { IFornecimento, CriarFornecimentoManualData } from '@/types'

export const fornecimentosApi = {
  async listar(params?: {
    identItem?: string
    identContrato?: string
    uasgUnParticipante?: string
    identFornecedor?: string
    status?: string
  }): Promise<IFornecimento[]> {
    const { data } = await apiClient.get<IFornecimento[]>('/fornecimentos', { params })
    return data
  },

  async obter(id: string): Promise<IFornecimento> {
    const { data } = await apiClient.get<IFornecimento>(`/fornecimentos/${encodeURIComponent(id)}`)
    return data
  },

  async listarPorUnidade(uasg: string): Promise<IFornecimento[]> {
    const { data } = await apiClient.get<IFornecimento[]>(`/fornecimentos/unidade/${uasg}`)
    return data
  },

  async listarPorContratacaoUnidade(identContratacao: string, uasg: string): Promise<IFornecimento[]> {
    const { data } = await apiClient.get<IFornecimento[]>(`/fornecimentos/contratacao/${encodeURIComponent(identContratacao)}/unidade/${uasg}`)
    return data
  },

  async criar(body: CriarFornecimentoManualData): Promise<IFornecimento> {
    const { data } = await apiClient.post<IFornecimento>('/fornecimentos', body)
    return data
  },

  async atualizar(id: string, data: Partial<IFornecimento>): Promise<IFornecimento> {
    const { data: result } = await apiClient.patch<IFornecimento>(`/fornecimentos/${encodeURIComponent(id)}`, data)
    return result
  },
}
