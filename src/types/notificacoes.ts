export interface NotificacoesResumo {
  naoLidas: number
  importantesNaoLidas: number
  atualizadoEm: string
}

export type EstadoCaixaNotificacoes = 'todas' | 'nao_lidas' | 'lidas' | 'arquivadas'

export interface NotificacaoListaItem {
  id: string
  titulo: string | null
  tipoEvento: string
  disponibilizadaEm: string
  expiraEm: string
  lida: boolean
  arquivada: boolean
  importante: boolean
  status: string
}

export interface NotificacoesListaResponse {
  itens: NotificacaoListaItem[]
  proximoCursor: string | null
  instanteCorte: string
}

export interface NotificacaoDetalhe extends NotificacaoListaItem {
  corpo: unknown
  acoes: unknown
  referencias: unknown
  lidaEm: string | null
  arquivadaEm: string | null
  acaoContexto: {
    requisicaoId: string
    revisaoEsperada: number | null
  } | null
}
