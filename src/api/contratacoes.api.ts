import apiClient from './client'
import type { IContratacao, CriarContratacaoData } from '@/types'

export const contratacoesApi = {
  async listar(): Promise<IContratacao[]> {
    const { data } = await apiClient.get<IContratacao[]>('/contratacoes')
    return data
  },

  async listarPorUasg(uasg: string): Promise<IContratacao[]> {
    const { data } = await apiClient.get<IContratacao[]>(`/contratacoes/unidade/${uasg}`)
    return data
  },

  async obter(identificador: string): Promise<IContratacao> {
    const { data } = await apiClient.get<IContratacao>(`/contratacoes/${identificador}`)
    return data
  },

  async criar(contratacaoData: CriarContratacaoData): Promise<{ contratacao: IContratacao; jobId: string; reimport?: boolean; message?: string }> {
    const { data } = await apiClient.post<{ contratacao: IContratacao; jobId: string; reimport?: boolean; message?: string }>('/contratacoes', contratacaoData)
    return data
  },

  async atualizar(identificador: string, data: Partial<IContratacao>): Promise<IContratacao> {
    const { data: result } = await apiClient.patch<IContratacao>(`/contratacoes/${identificador}`, data)
    return result
  },

  async deletar(identificador: string): Promise<void> {
    await apiClient.delete(`/contratacoes/${identificador}`)
  },
}
