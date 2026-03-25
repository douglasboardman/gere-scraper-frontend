import apiClient from './client'
import type { IRequisicao, CriarRequisicaoData } from '@/types'

export const requisicoesApi = {
  async listar(): Promise<IRequisicao[]> {
    const { data } = await apiClient.get<IRequisicao[]>('/requisicoes')
    return data
  },

  async obter(identificador: string): Promise<IRequisicao> {
    const { data } = await apiClient.get<IRequisicao>(`/requisicoes/${identificador}`)
    return data
  },

  async criar(reqData: CriarRequisicaoData): Promise<IRequisicao> {
    const { data } = await apiClient.post<IRequisicao>('/requisicoes', reqData)
    return data
  },

  async atualizar(identificador: string, reqData: Partial<CriarRequisicaoData>): Promise<IRequisicao> {
    const { data } = await apiClient.put<IRequisicao>(`/requisicoes/${identificador}`, reqData)
    return data
  },

  async deletar(identificador: string): Promise<void> {
    await apiClient.delete(`/requisicoes/${identificador}`)
  },

  async enviar(identificador: string): Promise<IRequisicao> {
    const { data } = await apiClient.patch<IRequisicao>(`/requisicoes/${identificador}/enviar`)
    return data
  },

  async aprovar(identificador: string): Promise<IRequisicao> {
    const { data } = await apiClient.patch<IRequisicao>(`/requisicoes/${identificador}/aprovar`)
    return data
  },

  async rejeitar(identificador: string, motivo?: string): Promise<IRequisicao> {
    const { data } = await apiClient.patch<IRequisicao>(`/requisicoes/${identificador}/rejeitar`, { motivo })
    return data
  },

  async imprimir(identificador: string): Promise<{ requisicao: IRequisicao; itens: unknown[] }> {
    const { data } = await apiClient.get<{ requisicao: IRequisicao; itens: unknown[] }>(`/requisicoes/${identificador}/imprimir`)
    return data
  },
}
