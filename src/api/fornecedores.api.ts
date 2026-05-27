import apiClient from './client'
import type { IFornecedor, SancoesResponse } from '@/types'

export const fornecedoresApi = {
  async listar(identContratacao?: string): Promise<IFornecedor[]> {
    const params = identContratacao ? { identContratacao } : {}
    const { data } = await apiClient.get<IFornecedor[]>('/fornecedores', { params })
    return data
  },

  async obter(id: string): Promise<IFornecedor> {
    const { data } = await apiClient.get<IFornecedor>(`/fornecedores/${encodeURIComponent(id)}`)
    return data
  },

  async atualizar(id: string, data: Partial<IFornecedor>): Promise<IFornecedor> {
    const { data: result } = await apiClient.put<IFornecedor>(`/fornecedores/${encodeURIComponent(id)}`, data)
    return result
  },

  async consultarSancoes(cnpj: string): Promise<SancoesResponse> {
    const { data } = await apiClient.get<SancoesResponse>(`/fornecedores/${cnpj}/sancoes`)
    return data
  },
}
