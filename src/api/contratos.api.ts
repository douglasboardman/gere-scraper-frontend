import apiClient from './client'
import type { IContrato, CriarContratoData } from '@/types'

export const contratosApi = {
  async listar(params?: {
    identContratacao?: string
  }): Promise<IContrato[]> {
    const { data } = await apiClient.get<IContrato[]>('/contratos', { params })
    return data
  },

  async listarPorContratacao(identContratacao: string): Promise<IContrato[]> {
    const { data } = await apiClient.get<IContrato[]>(`/contratos/contratacao/${identContratacao}`)
    return data
  },

  async obter(id: string): Promise<IContrato> {
    const { data } = await apiClient.get<IContrato>(`/contratos/${id}`)
    return data
  },

  async criar(body: CriarContratoData): Promise<IContrato> {
    const { data } = await apiClient.post<IContrato>('/contratos', body)
    return data
  },

  async atualizar(id: string, body: Partial<IContrato>): Promise<IContrato> {
    const { data } = await apiClient.patch<IContrato>(`/contratos/${id}`, body)
    return data
  },
}
