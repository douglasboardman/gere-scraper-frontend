import apiClient from './client'

export interface NotificacaoCatalogoEvento {
  codigo: string
  schemaVersao: number
  viewCodigo: string
  referencias: string[]
  condicoes: string[]
}

export interface NotificacaoEventoResumo {
  id: string
  codigo: string
  nome: string
  tipoEvento: string
  ativo: boolean
  revisao: number
  versaoAtiva: { id: string; numero: number; status: string } | null
  totalVersoes: number
  totalModelos: number
  createdAt: string
  updatedAt: string
}

export interface NotificacaoEventoVersao {
  id: string
  numero: number
  status: string
  schemaVersao: number
  viewCodigo: string
  hashDefinicao: string
  publicadoEm: string | null
  createdAt?: string
  updatedAt?: string
}

export interface NotificacaoEventoDetalhe extends NotificacaoEventoResumo {
  versoes: NotificacaoEventoVersao[]
}

export interface NotificacaoModeloResumo {
  id: string
  codigo: string
  nome: string
  evento: { id: string; codigo: string; nome: string }
  ativo: boolean
  revisao: number
  versaoAtiva: { id: string; numero: number; status: string } | null
  totalVersoes: number
  createdAt: string
  updatedAt: string
}

export interface NotificacaoModeloVersao {
  id: string
  numero: number
  status: string
  eventoVersaoId: string
  tituloTemplate: string
  corpoTemplate: unknown
  destinatarios: unknown
  agendamento: unknown
  condicaoEnvio: string
  filtroEvento: string | null
  acoes: unknown
  notificarNoLogin: boolean
  replicarPorEmail: boolean
  validadeHoras: number
  hashDefinicao: string
  publicadoEm: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificacaoModeloDetalhe extends NotificacaoModeloResumo {
  evento: NotificacaoModeloResumo['evento'] & { ativo: boolean }
  versoes: NotificacaoModeloVersao[]
}

export interface AtualizarNotificacaoModeloRascunhoInput {
  revisaoEsperada: number
  tituloTemplate?: string
  corpoTemplate?: unknown
  destinatarios?: unknown
  agendamento?: unknown
  condicaoEnvio?: string
  filtroEvento?: string | null
  acoes?: unknown
  notificarNoLogin?: boolean
  replicarPorEmail?: boolean
  validadeHoras?: number
}

export interface NotificacoesDiagnostico {
  processador: {
    habilitado: boolean
    versaoAplicacao: string
    alertaHeartbeat: boolean
  }
  fila: {
    devidos: number
    maisAntigo: { id: string; agendadoPara: string; expiraEm: string } | null
    idadeMaisAntigoMs: number
    alertaAtraso: boolean
    leasesExpirados: number
  }
  email: {
    habilitado: boolean
    devidos: number
    processando: number
    aceitos: number
    falhaFinal: number
    incertos: number
    cancelados: number
    expirados: number
    leasesExpirados: number
  }
  estados: Record<string, number>
  processadores: Array<{
    instanciaId: string
    versaoAplicacao: string
    iniciadoEm: string
    ultimoHeartbeatEm: string
    estado: string
    saudavel: boolean
  }>
  atualizadoEm: string
}

export interface NotificacoesRetencaoDiagnostico {
  modo: string
  purgaHabilitada: boolean
  limiteLote: number
  prazosOperacionaisDias: { conteudo: number; tecnico: number; semRegras: number; auditoria: number }
  candidatos: Record<string, number>
  bloqueios: { disparosPendentes: number; emailsPendentes: number }
  atualizadoEm: string
}

export interface NotificacaoDisparoResumo {
  id: string
  status: string
  evento: { codigo: string; nome: string; versao: number }
  modelo: { codigo: string; nome: string; versao: number }
  agendadoPara: string
  expiraEm: string
  createdAt: string
  concluidoEm: string | null
  totalDestinatarios: number
  totalDisponibilizados: number
  totalFalhas: number
  ultimoErroCodigo: string | null
  ultimoErroSeguro: string | null
  emails: Record<string, number>
}

export interface NotificacaoDisparoDetalhe extends NotificacaoDisparoResumo {
  tentativas: number
  tituloResolvido: string | null
  corpoResolvido: unknown
  acoesResolvidas: unknown
  contextoResolvido: unknown
  referenciasResolvidas: unknown
  ocorrencia: unknown
  destinatarios: Array<{
    id: string
    usuario: { id: string; nome: string; email: string; ativo: boolean; identUnidade: string | null; identUorg: string | null } | null
    escopoAcesso: unknown
    disponibilizadaEm: string
    lidaEm: string | null
    arquivadaEm: string | null
    expiraEm: string
    entregaEmail: {
      id: string
      status: string
      emailDestino: string | null
      messageId: string | null
      tentativas: number
      aceitoPeloProvedorEm: string | null
      proximaTentativaEm: string | null
      ultimoErroCodigo: string | null
      ultimoErroSeguro: string | null
      tentativasLog: Array<{ numero: number; resultado: string; codigoErro: string | null; diagnosticoSeguro: string | null; iniciadoEm: string; concluidoEm: string | null }>
    } | null
  }>
}

const revision = (revisaoEsperada: number) => ({ revisaoEsperada })

export const notificacoesAdminApi = {
  async listarCatalogo(): Promise<{ eventos: NotificacaoCatalogoEvento[] }> {
    const { data } = await apiClient.get('/admin/notificacoes/catalogo')
    return data
  },

  async listarEventos(): Promise<NotificacaoEventoResumo[]> {
    const { data } = await apiClient.get('/admin/notificacoes/eventos')
    return data
  },

  async obterEvento(id: string): Promise<NotificacaoEventoDetalhe> {
    const { data } = await apiClient.get(`/admin/notificacoes/eventos/${encodeURIComponent(id)}`)
    return data
  },

  async criarEvento(input: { codigo: string; nome: string }) {
    const { data } = await apiClient.post('/admin/notificacoes/eventos', input)
    return data
  },

  async publicarEvento(id: string, revisaoEsperada: number) {
    const { data } = await apiClient.post(`/admin/notificacoes/eventos/${encodeURIComponent(id)}/publicar`, revision(revisaoEsperada))
    return data
  },

  async promoverEvento(id: string, versaoId: string, revisaoEsperada: number) {
    const { data } = await apiClient.post(`/admin/notificacoes/eventos/${encodeURIComponent(id)}/versoes/${encodeURIComponent(versaoId)}/promover`, revision(revisaoEsperada))
    return data
  },

  async ativarEvento(id: string, ativo: boolean, revisaoEsperada: number) {
    const { data } = await apiClient.put(`/admin/notificacoes/eventos/${encodeURIComponent(id)}/ativacao`, { ativo, revisaoEsperada })
    return data
  },

  async listarModelos(): Promise<NotificacaoModeloResumo[]> {
    const { data } = await apiClient.get('/admin/notificacoes/modelos')
    return data
  },

  async obterModelo(id: string): Promise<NotificacaoModeloDetalhe> {
    const { data } = await apiClient.get(`/admin/notificacoes/modelos/${encodeURIComponent(id)}`)
    return data
  },

  async criarModelo(input: { codigo: string; nome: string; eventoId: string }) {
    const { data } = await apiClient.post('/admin/notificacoes/modelos', input)
    return data
  },

  async atualizarModeloRascunho(id: string, input: AtualizarNotificacaoModeloRascunhoInput) {
    const { data } = await apiClient.put(`/admin/notificacoes/modelos/${encodeURIComponent(id)}/rascunho`, input)
    return data
  },

  async publicarModelo(id: string, revisaoEsperada: number) {
    const { data } = await apiClient.post(`/admin/notificacoes/modelos/${encodeURIComponent(id)}/publicar`, revision(revisaoEsperada))
    return data
  },

  async promoverModelo(id: string, versaoId: string, revisaoEsperada: number) {
    const { data } = await apiClient.post(`/admin/notificacoes/modelos/${encodeURIComponent(id)}/versoes/${encodeURIComponent(versaoId)}/promover`, revision(revisaoEsperada))
    return data
  },

  async ativarModelo(id: string, ativo: boolean, revisaoEsperada: number) {
    const { data } = await apiClient.put(`/admin/notificacoes/modelos/${encodeURIComponent(id)}/ativacao`, { ativo, revisaoEsperada })
    return data
  },

  async diagnostico(): Promise<NotificacoesDiagnostico> {
    const { data } = await apiClient.get('/admin/notificacoes/diagnostico')
    return data
  },

  async diagnosticoRetencao(): Promise<NotificacoesRetencaoDiagnostico> {
    const { data } = await apiClient.get('/admin/notificacoes/retencao/diagnostico')
    return data
  },

  async listarDisparos(params: { estado?: string; cursor?: string; limite?: number } = {}): Promise<{ itens: NotificacaoDisparoResumo[]; proximoCursor: string | null }> {
    const { data } = await apiClient.get('/admin/notificacoes/disparos', { params })
    return data
  },

  async obterDisparo(id: string): Promise<NotificacaoDisparoDetalhe> {
    const { data } = await apiClient.get(`/admin/notificacoes/disparos/${encodeURIComponent(id)}`)
    return data
  },

  async reprocessarEmail(id: string, input: { motivo: string; idempotencyKey: string; confirmarResultadoIncerto: boolean }) {
    const { data } = await apiClient.post(`/admin/notificacoes/emails/${encodeURIComponent(id)}/reprocessar`, input)
    return data
  },

  async reprocessarDisparo(id: string, input: { motivo: string; idempotencyKey: string }) {
    const { data } = await apiClient.post(`/admin/notificacoes/disparos/${encodeURIComponent(id)}/reprocessar`, input)
    return data
  },
}
