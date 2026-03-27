// ============================================================
// Status types
// ============================================================

export type StatusContratacao = 'Em_Processamento' | 'Processada' | 'Inconsistente' | 'Aguardando_Homologacao'
export type StatusAta = 'Em_Processamento' | 'Processada' | 'Inconsistente'
export type StatusItem = 'Em_Processamento' | 'Processado' | 'Inconsistente'
export type StatusFornecimento = 'Homologado' | 'Nao_Homologado' | 'Esgotado' | 'Cancelado'
export type StatusRequisicao = 'Rascunho' | 'Enviada' | 'Aprovada' | 'Rejeitada' | 'Empenhada'
export type StatusJob = 'running' | 'completed' | 'failed'

export type UserRole = 'admin' | 'gestor_compras' | 'requerente'

export type ModalidadeContratacao =
  | 'Pregão'
  | 'Concorrência'
  | 'Dispensa'
  | 'Inexigibilidade'

// ============================================================
// Backend models
// ============================================================

export interface IContratacao {
  identificador: string
  uasgUnGestora: string
  nomeUnGestora?: string
  codUnGestora?: string
  numContratacao: string
  anoContratacao: number | string
  modContratacao?: string
  numEdital?: string
  objeto?: string
  uasgsParticipantes?: string[]
  iniVigencia?: string
  fimVigencia?: string
  status: StatusContratacao
  createdAt: string
  updatedAt: string
}

export interface IAtaRegPrecos {
  identificador: string
  numAta: string
  identContratacao: string | IContratacao
  identFornecedor?: string
  cnpjFornecedor?: string
  nomeFornecedor?: string
  iniVigencia?: string
  fimVigencia?: string
  status: StatusAta
  createdAt: string
  updatedAt: string
}

export interface IItem {
  identificador: string
  sequencialItemPregao?: string
  numItem?: string
  identAta: string | IAtaRegPrecos
  descBreve?: string
  descDetalhada?: string
  descricaoBreve?: string
  descricaoDetalhada?: string
  qtdHomologada?: number
  valUnitario?: number
  valorUnitario?: number
  tipo?: string
  unMedida?: string
  unidadeMedida?: string
  status: StatusItem
  createdAt: string
  updatedAt: string
}

export interface IFornecedor {
  identificador: string
  cnpj: string
  nome?: string
  razaoSocial?: string
  endereco?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  municipio?: string
  uf?: string
  email1?: string
  email2?: string
  telefone1?: string
  telefone2?: string
  email?: string
  telefone?: string
  createdAt: string
  updatedAt: string
}

export interface IFornecimento {
  identificador: string
  identItem: string | IItem
  identFornecedor: string
  nomeFornecedor?: string | null
  cnpjFornecedor?: string | null
  nomeUnParticipante?: string
  uasgUnParticipante: string
  qtdAutorizada?: number
  qtdUtilizada?: number
  saldoDisponivel?: number
  saldo?: number
  valorUnitario?: number
  valUnitHomologado?: number
  status: StatusFornecimento
  createdAt: string
  updatedAt: string
}

export interface IUnidade {
  identificador: string
  idContratos: string
  uasg: string
  cnpj: string
  nome: string
  nomeAbrev: string
  localidade: string
  codGestao: string
  codUorg: string
  createdAt: string
  updatedAt: string
}

export interface IUorg {
  uorg_key: string
  uorg_orgao_co: string
  uorg_co?: string
  uorg_nivel?: number
  uorg_path?: string
  uorg_no: string
  uorg_sg?: string
  status_atvd_reg_tab_in?: string
  createdAt: string
  updatedAt: string
}

export interface IUsuario {
  id: string
  nome: string
  email: string
  role: UserRole
  ativo: boolean
  unidade?: IUnidade | null
  uorg_key?: string
  createdAt: string
  updatedAt: string
}

export type TipoRequisicao = 'Material' | 'Servico'

export interface IRequisicao {
  identificador: string
  requisitanteId: string
  requisitante: IUsuario | { nome: string; email: string; uorg_key?: string }
  identUnidade: string | IUnidade
  identContratacao?: string
  uorg_key?: string
  uorg?: IUorg
  tipo: TipoRequisicao
  status: StatusRequisicao
  observacao?: string
  observacoes?: string
  justificativa?: string
  motivoRejeicao?: string
  dataEnvio?: string
  dataAprovacao?: string
  dataRejeicao?: string
  valorTotal?: number
  _count?: { itens: number }
  createdAt: string
  updatedAt: string
}

export interface IItemRequisicao {
  id: number
  identRequisicao: string
  identFornecimento: string | IFornecimento
  quantidadeSolicitada: number
  valorUnitario?: number
  valorTotal?: number
  observacao?: string
  createdAt: string
  updatedAt: string
}

export interface IScrapingJob {
  id: number
  jobId: string
  identContratacao?: string
  tipo: string
  status: StatusJob
  progresso: number
  mensagem?: string
  itensProcessados?: number
  totalItens?: number
  atasProcessadas?: number
  atasTotal?: number
  erro?: string
  iniciadoEm?: string
  finalizadoEm?: string
  createdAt: string
  updatedAt: string
}

// ============================================================
// API response wrappers
// ============================================================

export interface ApiResponse<T> {
  data: T
  message?: string
  success?: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ============================================================
// Auth
// ============================================================

export interface LoginResponse {
  token: string
  usuario: IUsuario
}

export interface RegisterData {
  nome: string
  email: string
  senha: string
  unidade: string
  uorg_key: string
}

export interface AdminRegisterData {
  nome: string
  email: string
  senha: string
  role?: UserRole
  unidade?: string
  uorg_key?: string
}

export interface AdminUpdateUsuarioData {
  nome?: string
  email?: string
  role?: UserRole
  unidade?: string
  uorg_key?: string
  ativo?: boolean
}

// ============================================================
// Form types
// ============================================================

export interface CriarContratacaoData {
  numContratacao: string
  anoContratacao: string
  uasgUnGestora: string
  modalidade: ModalidadeContratacao
  uasgParticipante?: string
}

export interface CriarRequisicaoData {
  identUnidade?: string
  tipo: TipoRequisicao
  justificativa: string
  observacoes?: string
  identContratacao?: string
}

export interface CriarItemRequisicaoData {
  identFornecimento: string
  quantidadeSolicitada: number
  observacao?: string
}

export interface CriarUnidadeData {
  uasg: string
  codUorg: string
}

export interface AtualizarPerfilData {
  nome?: string
  senhaAtual?: string
  novaSenha?: string
}

export interface SancoesResponse {
  sancionadoCEPIM: boolean
  sancionadoCEIS: boolean
  sancionadoCNEP: boolean
  sancionadoCEAF: boolean
}
