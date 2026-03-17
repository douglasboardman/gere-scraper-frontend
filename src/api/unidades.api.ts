import apiClient from './client'
import type { IUnidade, CriarUnidadeData } from '@/types'

export const unidadesApi = {
  async listar(): Promise<IUnidade[]> {
    const { data } = await apiClient.get<IUnidade[]>('/unidades')
    return data
  },

  async obter(id: string): Promise<IUnidade> {
    const { data } = await apiClient.get<IUnidade>(`/unidades/${id}`)
    return data
  },

  async criar(unidadeData: CriarUnidadeData): Promise<IUnidade> {
    const { data } = await apiClient.post<IUnidade>('/unidades', unidadeData)
    return data
  },

  async atualizar(id: string, unidadeData: Partial<CriarUnidadeData>): Promise<IUnidade> {
    const { data } = await apiClient.put<IUnidade>(`/unidades/${id}`, unidadeData)
    return data
  },
}
