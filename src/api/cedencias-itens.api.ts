import apiClient from './client'
import type { ICedenciaItem, OfertaCedenciaItem, StatusCedenciaItem } from '@/types'

export const cedenciasItensApi = {
  async listar(params?: { caixa?: 'solicitadas' | 'recebidas'; status?: StatusCedenciaItem }): Promise<ICedenciaItem[]> {
    const { data } = await apiClient.get<ICedenciaItem[]>('/cedencias-itens', { params })
    return data
  },
  async obter(id: string): Promise<ICedenciaItem> {
    const { data } = await apiClient.get<ICedenciaItem>(`/cedencias-itens/${encodeURIComponent(id)}`)
    return data
  },
  async ofertas(contratacaoId: string, itemId?: string): Promise<OfertaCedenciaItem[]> {
    const { data } = await apiClient.get<OfertaCedenciaItem[]>('/cedencias-itens/ofertas', { params: { contratacaoId, itemId } })
    return data
  },
  async criar(body: { identFornecimentoDoador: string; saldoSolicitado: number; justificativa: string }): Promise<ICedenciaItem> {
    const { data } = await apiClient.post<ICedenciaItem>('/cedencias-itens', body)
    return data
  },
  async enviar(id: string, revisao: number): Promise<ICedenciaItem> {
    const { data } = await apiClient.patch<ICedenciaItem>(`/cedencias-itens/${encodeURIComponent(id)}/enviar`, { revisao })
    return data
  },
  async cancelar(id: string, revisao: number): Promise<ICedenciaItem> {
    const { data } = await apiClient.patch<ICedenciaItem>(`/cedencias-itens/${encodeURIComponent(id)}/cancelar`, { revisao })
    return data
  },
  async decidir(id: string, body: { decisao: 'aprovar'; saldoDoado: number; devolutiva?: string; revisao: number } | { decisao: 'rejeitar'; devolutiva?: string; revisao: number }): Promise<ICedenciaItem> {
    const { data } = await apiClient.patch<ICedenciaItem>(`/cedencias-itens/${encodeURIComponent(id)}/decidir`, body)
    return data
  },
}
