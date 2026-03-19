// ============================================================
// Status types
// ============================================================

export type StatusCompra = 'Em Processamento' | 'Processada' | 'Inconsistente' | 'Aguardando'
export type StatusAta = 'Em Processamento' | 'Processada' | 'Inconsistente' | 'Aguardando'
export type StatusItem = 'Em Processamento' | 'Processada' | 'Inconsistente' | 'Aguardando'
export type StatusFornecimento = 'Homologado' | 'Não Homologado' | 'Esgotado' | 'Cancelado'
export type StatusRequisicao = 'Rascunho' | 'Enviada' | 'Aprovada' | 'Rejeitada' | 'Empenhada'
export type StatusJob = 'running' | 'completed' | 'failed' | 'pending'

export type UserRole = 'admin' | 'gestor_compras' | 'requerente'

export type ModalidadeContratacao =
  | 'Pregão'
  | 'Concorrência'
  | 'Dispensa'
  | 'Inexigibilidade'

// ============================================================
// Backend models
// ============================================================

export interface ICompra {
  _id: string
  identificador: string
  uasgUnGestora: string
  nomeUnGestora?: string
  codUnGestora?: string
  numCompra: string
  anoCompra: number
  modContratacao?: string
  numEdital?: string
  objeto?: string
  iniVigencia?: string
  fimVigencia?: string
  status: StatusCompra
  createdAt: string
  updatedAt: string
}

export interface IAtaRegPrecos {
  _id: string
  identificador: string
  numAta: string
  idCompra: string | ICompra
  idFornecedor?: string
  cnpjFornecedor?: string
  nomeFornecedor?: string
  iniVigencia?: string
  fimVigencia?: string
  status: StatusAta
  createdAt: string
  updatedAt: string
}

export interface IItem {
  _id: string
  identificador: string
  sequencialItemPregao?: string
  numItem?: string
  idAta: string | IAtaRegPrecos
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
  _id: string
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
  _id: string
  identificador: string
  idItem: string | IItem
  idFornecedor: string | IFornecedor
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
  _id: string
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
  _id: string
  uorg_key: string
  uorg_orgao_co: string
  uorg_co?: string
  uorg_nivel?: number
  uorg_path?: string
  uorg_no: string
  uorg_sg?: string
  createdAt: string
  updatedAt: string
}

export interface IUsuario {
  _id: string
  nome: string
  email: string
  role: UserRole
  ativo: boolean
  unidade?: string | IUnidade
  uorg_key?: string
  createdAt: string
  updatedAt: string
}

export type TipoRequisicao = 'Material' | 'Serviço'

export interface IRequisicao {
  _id: string
  identificador: string
  idRequisitante: string | IUsuario
  idUnidade: string | IUnidade
  tipo: TipoRequisicao
  status: StatusRequisicao
  observacao?: string
  justificativa?: string
  motivoRejeicao?: string
  dataEnvio?: string
  dataAprovacao?: string
  dataRejeicao?: string
  valorTotal?: number
  createdAt: string
  updatedAt: string
}

export interface IItemRequisicao {
  _id: string
  idRequisicao: string | IRequisicao
  idFornecimento: string | IFornecimento
  qtdSolicitada: number
  valorUnitario?: number
  valorTotal?: number
  observacao?: string
  createdAt: string
  updatedAt: string
}

export interface IScrapingJob {
  _id: string
  jobId: string
  idCompra?: string
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

export interface CriarCompraData {
  numCompra: string
  anoCompra: string
  uasgUnGestora: string
  modalidade: ModalidadeContratacao
  uasgParticipante?: string
}

export interface CriarRequisicaoData {
  idUnidade?: string
  tipo: TipoRequisicao
  justificativa: string
  observacoes?: string
}

export interface CriarItemRequisicaoData {
  idFornecimento: string
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
