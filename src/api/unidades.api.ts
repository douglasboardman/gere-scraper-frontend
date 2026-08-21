import apiClient from './client'
import type { IUnidade, CriarUnidadeData } from '@/types'

export const unidadesApi = {
  async listar(): Promise<IUnidade[]> {
    const { data } = await apiClient.get<IUnidade[]>('/unidades')
    return data
  },

  async obter(identificador: string): Promise<IUnidade> {
    const { data } = await apiClient.get<IUnidade>(
      `/unidades/${encodeURIComponent(identificador)}`,
    )
    return data
  },

  async criar(unidadeData: CriarUnidadeData): Promise<IUnidade> {
    const { data } = await apiClient.post<IUnidade>('/unidades', unidadeData)
    return data
  },

  async atualizar(
    identificador: string,
    unidadeData: Partial<Pick<IUnidade, 'nome' | 'nomeAbrev' | 'localidade'>>,
  ): Promise<IUnidade> {
    const { data } = await apiClient.put<IUnidade>(
      `/unidades/${encodeURIComponent(identificador)}`,
      unidadeData,
    )
    return data
  },
}
