import apiClient from './client'
import type { IFornecedor, SancoesResponse } from '@/types'

export const fornecedoresApi = {
  async listar(idContratacao?: string): Promise<IFornecedor[]> {
    const params = idContratacao ? { idContratacao } : {}
    const { data } = await apiClient.get<IFornecedor[]>('/fornecedores', { params })
    return data
  },

  async obter(id: string): Promise<IFornecedor> {
    const { data } = await apiClient.get<IFornecedor>(`/fornecedores/${id}`)
    return data
  },

  async atualizar(id: number, data: Partial<IFornecedor>): Promise<IFornecedor> {
    const { data: result } = await apiClient.put<IFornecedor>(`/fornecedores/${id}`, data)
    return result
  },

  async consultarSancoes(cnpj: string): Promise<SancoesResponse> {
    const { data } = await apiClient.get<SancoesResponse>(`/fornecedores/${cnpj}/sancoes`)
    return data
  },
}
