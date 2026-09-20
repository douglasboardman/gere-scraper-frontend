import apiClient from './client'
import type {
  EstadoCaixaNotificacoes,
  NotificacaoDetalhe,
  NotificacoesListaResponse,
  NotificacoesResumo,
} from '@/types/notificacoes'

export const notificacoesApi = {
  async resumo(): Promise<NotificacoesResumo> {
    const { data } = await apiClient.get<NotificacoesResumo>('/notificacoes/resumo')
    return data
  },

  async listar(params: {
    estado?: EstadoCaixaNotificacoes
    importantes?: boolean
    cursor?: string
    limite?: number
  } = {}): Promise<NotificacoesListaResponse> {
    const { data } = await apiClient.get<NotificacoesListaResponse>('/notificacoes', { params })
    return data
  },

  async detalhe(id: string): Promise<NotificacaoDetalhe> {
    const { data } = await apiClient.get<NotificacaoDetalhe>(`/notificacoes/${encodeURIComponent(id)}`)
    return data
  },

  async marcarLeitura(id: string, lida: boolean) {
    const { data } = await apiClient.put(`/notificacoes/${encodeURIComponent(id)}/leitura`, { lida })
    return data as { id: string; lida: boolean; lidaEm: string | null }
  },

  async arquivar(id: string, arquivada: boolean) {
    const { data } = await apiClient.put(`/notificacoes/${encodeURIComponent(id)}/arquivamento`, { arquivada })
    return data as { id: string; arquivada: boolean; arquivadaEm: string | null }
  },

  async lerTodas(ate: string) {
    const { data } = await apiClient.post('/notificacoes/ler-todas', { ate })
    return data as { alteradas: number; ate: string }
  },

  async executarAcao(input: {
    notificacaoId: string
    acaoCodigo: 'APROVAR_REQUISICAO'
    revisaoEsperada: number
    idempotencyKey: string
  }) {
    const { data } = await apiClient.post(`/notificacoes/${encodeURIComponent(input.notificacaoId)}/acoes`, {
      acaoCodigo: input.acaoCodigo,
      revisaoEsperada: input.revisaoEsperada,
      confirmacao: true,
      idempotencyKey: input.idempotencyKey,
    })
    return data as { execucaoId: string; notificacaoId: string; acaoCodigo: string; requisicaoId: string; status: string; revisao: number }
  },
}
