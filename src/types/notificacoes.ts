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

export interface AcaoNotificacaoResolvida {
  codigo: string
  rotulo: string
  tipo: 'NAVEGACAO' | 'COMANDO'
  exigeConfirmacao: boolean
  url: string | null
  parametrosComando?: Record<string, unknown>
}

export interface NotificacaoDetalhe extends NotificacaoListaItem {
  corpo: unknown
  acoes: AcaoNotificacaoResolvida[]
  referencias: unknown
  lidaEm: string | null
  arquivadaEm: string | null
  acaoContexto: unknown | null
}
