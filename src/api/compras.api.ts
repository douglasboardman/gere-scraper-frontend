import apiClient from './client'
import type { ICompra, CriarCompraData } from '@/types'

export const comprasApi = {
  async listar(): Promise<ICompra[]> {
    const { data } = await apiClient.get<ICompra[]>('/compras')
    return data
  },

  async listarPorUasg(uasg: string): Promise<ICompra[]> {
    const { data } = await apiClient.get<ICompra[]>(`/compras/unidade/${uasg}`)
    return data
  },

  async obter(identificador: string): Promise<ICompra> {
    const { data } = await apiClient.get<ICompra>(`/compras/${identificador}`)
    return data
  },

  async criar(compraData: CriarCompraData): Promise<{ compra: ICompra; jobId: string; reimport?: boolean; message?: string }> {
    const { data } = await apiClient.post<{ compra: ICompra; jobId: string; reimport?: boolean; message?: string }>('/compras', compraData)
    return data
  },

  async atualizar(identificador: string, data: Partial<ICompra>): Promise<ICompra> {
    const { data: result } = await apiClient.patch<ICompra>(`/compras/${identificador}`, data)
    return result
  },

  async deletar(identificador: string): Promise<void> {
    await apiClient.delete(`/compras/${identificador}`)
  },
}
