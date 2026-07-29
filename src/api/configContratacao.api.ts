import apiClient from './client'
import type { IConfigContratacao, AtualizarConfigContratacaoData } from '@/types'

export const configContratacaoApi = {
  async obter(identContratacao: string): Promise<IConfigContratacao | null> {
    const { data } = await apiClient.get<IConfigContratacao>(
      `/contratacoes/${encodeURIComponent(identContratacao)}/config`,
    )
    return data
  },

  async atualizar(
    identContratacao: string,
    data: AtualizarConfigContratacaoData,
  ): Promise<IConfigContratacao> {
    const { data: result } = await apiClient.patch<IConfigContratacao>(
      `/contratacoes/${encodeURIComponent(identContratacao)}/config`,
      data,
    )
    return result
  },
}
