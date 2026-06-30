import apiClient from './client'
import type { IOutrasObrigacoesData, IContratoOob, IItemOob, IFornecimentoOob } from '@/types'

export const outrasObrigacoesApi = {
  async buscar(ano: string): Promise<IOutrasObrigacoesData | null> {
    const { data } = await apiClient.get<IOutrasObrigacoesData | null>(
      `/outras-obrigacoes/${ano}`
    )
    return data
  },

  async buscarWizard(ano: string): Promise<IOutrasObrigacoesData | null> {
    const { data } = await apiClient.get<IOutrasObrigacoesData | null>(
      `/outras-obrigacoes/${ano}/wizard`
    )
    return data
  },

  async criar(ano?: string): Promise<IOutrasObrigacoesData> {
    const { data } = await apiClient.post<IOutrasObrigacoesData>('/outras-obrigacoes', { ano })
    return data
  },

  async publicar(ano: string): Promise<void> {
    await apiClient.patch(`/outras-obrigacoes/${ano}/publicar`)
  },

  // Itens
  async criarItem(
    ano: string,
    payload: { descBreve: string; descDetalhada: string; unMedida: string; valUnitario: number }
  ): Promise<IItemOob> {
    const { data } = await apiClient.post<IItemOob>(`/outras-obrigacoes/${ano}/itens`, payload)
    return data
  },

  async atualizarItem(
    ano: string,
    itemId: string,
    payload: Partial<{ descBreve: string; descDetalhada: string; unMedida: string; valUnitario: number }>
  ): Promise<IItemOob> {
    const { data } = await apiClient.patch<IItemOob>(
      `/outras-obrigacoes/${ano}/itens/${encodeURIComponent(itemId)}`,
      payload
    )
    return data
  },

  async deletarItem(ano: string, itemId: string): Promise<void> {
    await apiClient.delete(`/outras-obrigacoes/${ano}/itens/${encodeURIComponent(itemId)}`)
  },

  // Contratos
  async criarContrato(
    ano: string,
    payload: { objeto: string; valGlobal: number }
  ): Promise<IContratoOob> {
    const { data } = await apiClient.post<IContratoOob>(`/outras-obrigacoes/${ano}/contratos`, payload)
    return data
  },

  async atualizarContrato(
    ano: string,
    contratoId: string,
    payload: Partial<{ objeto: string; valGlobal: number }>
  ): Promise<IContratoOob> {
    const { data } = await apiClient.patch<IContratoOob>(
      `/outras-obrigacoes/${ano}/contratos/${encodeURIComponent(contratoId)}`,
      payload
    )
    return data
  },

  async deletarContrato(ano: string, contratoId: string): Promise<void> {
    await apiClient.delete(`/outras-obrigacoes/${ano}/contratos/${encodeURIComponent(contratoId)}`)
  },

  // Fornecimentos
  async criarFornecimento(
    ano: string,
    contratoId: string,
    payload: { identItem: string; qtdAutorizada: number; valUnitHomologado: number }
  ): Promise<IFornecimentoOob> {
    const { data } = await apiClient.post<IFornecimentoOob>(
      `/outras-obrigacoes/${ano}/contratos/${encodeURIComponent(contratoId)}/fornecimentos`,
      payload
    )
    return data
  },

  async atualizarFornecimento(
    ano: string,
    contratoId: string,
    fornecimentoId: string,
    payload: Partial<{ qtdAutorizada: number; valUnitHomologado: number }>
  ): Promise<IFornecimentoOob> {
    const { data } = await apiClient.patch<IFornecimentoOob>(
      `/outras-obrigacoes/${ano}/contratos/${encodeURIComponent(contratoId)}/fornecimentos/${encodeURIComponent(fornecimentoId)}`,
      payload
    )
    return data
  },

  async deletarFornecimento(ano: string, contratoId: string, fornecimentoId: string): Promise<void> {
    await apiClient.delete(
      `/outras-obrigacoes/${ano}/contratos/${encodeURIComponent(contratoId)}/fornecimentos/${encodeURIComponent(fornecimentoId)}`
    )
  },
}
