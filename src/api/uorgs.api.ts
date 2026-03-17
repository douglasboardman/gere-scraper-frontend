import apiClient from './client'
import publicClient from './public-client'
import type { IUorg } from '@/types'

export const uorgsApi = {
  /** Lista UORGs subordinadas a uma unidade (público, para registro) */
  async listarPorUnidade(unidadeId: string): Promise<IUorg[]> {
    const { data } = await publicClient.get<IUorg[]>(`/auth/unidades/${unidadeId}/uorgs`)
    return data
  },

  /** Lista UORGs por código de gestão (autenticado) */
  async listarPorCodGestao(codGestao: string): Promise<IUorg[]> {
    const { data } = await apiClient.get<IUorg[]>(`/uorgs/gestao/${codGestao}`)
    return data
  },

  /** Busca UORG por uorgKey (autenticado) */
  async obter(uorgKey: string): Promise<IUorg> {
    const { data } = await apiClient.get<IUorg>(`/uorgs/${uorgKey}`)
    return data
  },
}
