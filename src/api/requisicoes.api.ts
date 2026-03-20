import apiClient from './client'
import type { IRequisicao, CriarRequisicaoData } from '@/types'

export const requisicoesApi = {
  async listar(): Promise<IRequisicao[]> {
    const { data } = await apiClient.get<IRequisicao[]>('/requisicoes')
    return data
  },

  async obter(id: string): Promise<IRequisicao> {
    const { data } = await apiClient.get<IRequisicao>(`/requisicoes/${id}`)
    return data
  },

  async criar(reqData: CriarRequisicaoData): Promise<IRequisicao> {
    const { data } = await apiClient.post<IRequisicao>('/requisicoes', reqData)
    return data
  },

  async atualizar(id: string, reqData: Partial<CriarRequisicaoData>): Promise<IRequisicao> {
    const { data } = await apiClient.put<IRequisicao>(`/requisicoes/${id}`, reqData)
    return data
  },

  async deletar(id: string): Promise<void> {
    await apiClient.delete(`/requisicoes/${id}`)
  },

  async enviar(id: string): Promise<IRequisicao> {
    const { data } = await apiClient.patch<IRequisicao>(`/requisicoes/${id}/enviar`)
    return data
  },

  async aprovar(id: string): Promise<IRequisicao> {
    const { data } = await apiClient.patch<IRequisicao>(`/requisicoes/${id}/aprovar`)
    return data
  },

  async rejeitar(id: string, motivo?: string): Promise<IRequisicao> {
    const { data } = await apiClient.patch<IRequisicao>(`/requisicoes/${id}/rejeitar`, { motivo })
    return data
  },

  async imprimir(id: string): Promise<{ requisicao: IRequisicao; itens: unknown[] }> {
    const { data } = await apiClient.get<{ requisicao: IRequisicao; itens: unknown[] }>(`/requisicoes/${id}/imprimir`)
    return data
  },
}
