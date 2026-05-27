import apiClient from './client'
import type { IRequisicao, CriarRequisicaoData } from '@/types'

export const requisicoesApi = {
  async listar(contratacaoId?: string): Promise<IRequisicao[]> {
    const { data } = await apiClient.get<IRequisicao[]>('/requisicoes', {
      params: contratacaoId ? { contratacaoId } : undefined,
    })
    return data
  },

  async obter(identificador: string): Promise<IRequisicao> {
    const { data } = await apiClient.get<IRequisicao>(`/requisicoes/${encodeURIComponent(identificador)}`)
    return data
  },

  async criar(reqData: CriarRequisicaoData): Promise<IRequisicao> {
    const { data } = await apiClient.post<IRequisicao>('/requisicoes', reqData)
    return data
  },

  async atualizar(identificador: string, reqData: Partial<CriarRequisicaoData>): Promise<IRequisicao> {
    const { data } = await apiClient.put<IRequisicao>(`/requisicoes/${encodeURIComponent(identificador)}`, reqData)
    return data
  },

  async deletar(identificador: string): Promise<void> {
    await apiClient.delete(`/requisicoes/${encodeURIComponent(identificador)}`)
  },

  async enviar(identificador: string): Promise<IRequisicao> {
    const { data } = await apiClient.patch<IRequisicao>(`/requisicoes/${encodeURIComponent(identificador)}/enviar`)
    return data
  },

  async aprovar(identificador: string): Promise<IRequisicao> {
    const { data } = await apiClient.patch<IRequisicao>(`/requisicoes/${encodeURIComponent(identificador)}/aprovar`)
    return data
  },

  async rejeitar(identificador: string, motivo?: string): Promise<IRequisicao> {
    const { data } = await apiClient.patch<IRequisicao>(`/requisicoes/${encodeURIComponent(identificador)}/rejeitar`, { motivo })
    return data
  },

  async imprimir(identificador: string): Promise<{ requisicao: IRequisicao; itens: unknown[] }> {
    const { data } = await apiClient.get<{ requisicao: IRequisicao; itens: unknown[] }>(`/requisicoes/${encodeURIComponent(identificador)}/imprimir`)
    return data
  },
}
