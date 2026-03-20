import apiClient from './client'
import type { IItemRequisicao, CriarItemRequisicaoData } from '@/types'

export const itemRequisicaoApi = {
  async listar(idRequisicao: string): Promise<IItemRequisicao[]> {
    const { data } = await apiClient.get<IItemRequisicao[]>(`/itens-requisicao/requisicao/${idRequisicao}`)
    return data
  },

  async obter(id: string): Promise<IItemRequisicao> {
    const { data } = await apiClient.get<IItemRequisicao>(`/itens-requisicao/${id}`)
    return data
  },

  async criar(itemData: CriarItemRequisicaoData & { idRequisicao: string }): Promise<IItemRequisicao> {
    const { data } = await apiClient.post<IItemRequisicao>('/itens-requisicao', itemData)
    return data
  },

  async atualizar(id: string, itemData: Partial<CriarItemRequisicaoData>): Promise<IItemRequisicao> {
    const { data } = await apiClient.put<IItemRequisicao>(`/itens-requisicao/${id}`, itemData)
    return data
  },

  async deletar(id: string): Promise<void> {
    await apiClient.delete(`/itens-requisicao/${id}`)
  },
}
