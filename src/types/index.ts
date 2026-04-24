// ============================================================
// Status types
// ============================================================

export type StatusElemContratacaoAlt = 'Em_Processamento' | 'Processada' | 'Inconsistente' | 'Disponivel' | 'Encerrada'
export type StatusElemContratacao = 'Em_Processamento' | 'Processado' | 'Inconsistente' | 'Disponivel' | 'Encerrado'
export type StatusRequisicao = 'Rascunho' | 'Enviada' | 'Aprovada' | 'Rejeitada' | 'Empenhada'
export type StatusJob = 'running' | 'completed' | 'failed'

export type UserRole =
  | 'admin'
  | 'gestor_unidade'
  | 'gestor_contratos'
  | 'gestor_financeiro'
  | 'gestor_contratacoes'
  | 'requisitante'

export type ModalidadeContratacao =
  | 'Pregao'
  | 'Concorrencia'
  | 'Dispensa'
  | 'Inexigibilidade'
  | 'Concorrencia_Eletronica'
  | 'Concorrencia_Presencial'
  | 'Pregao_Eletronico'
  | 'Pregao_Presencial'
  | 'Chamada_Publica'

export const MODALIDADE_LABEL: Record<string, string> = {
  Pregao: 'Pregão',
  Concorrencia: 'Concorrência',
  Dispensa: 'Dispensa',
  Inexigibilidade: 'Inexigibilidade',
  Concorrencia_Eletronica: 'Concorrência Eletrônica',
  Concorrencia_Presencial: 'Concorrência Presencial',
  Pregao_Eletronico: 'Pregão Eletrônico',
  Pregao_Presencial: 'Pregão Presencial',
  Chamada_Publica: 'Chamada Pública',
  // Fallback para dados antigos (pré-migração)
  'Pregão': 'Pregão',
  'Concorrência': 'Concorrência',
}

// ============================================================
// Backend models
// ============================================================

export type AmparoLegal = 'LEI_14133_2021' | 'LEI_8666_1993'

export const AMPARO_LEGAL_LABEL: Record<AmparoLegal, string> = {
  LEI_14133_2021: 'Lei 14.133/2021',
  LEI_8666_1993: 'Lei 8.666/1993',
}

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
  amparoLegal?: AmparoLegal
  iniVigencia?: string
  fimVigencia?: string
  status: StatusElemContratacaoAlt
  createdAt: string
  updatedAt: string
  _count?: { atas: number; contratos: number }
}

export interface IAtaRegPrecos {
  identificador: string
  numAta: string
  identContratacao: string | IContratacao
  contratacao?: IContratacao
  identFornecedor?: string
  cnpjFornecedor?: string
  nomeFornecedor?: string
  iniVigencia?: string
  fimVigencia?: string
  status: StatusElemContratacaoAlt
  createdAt: string
  updatedAt: string
}

export interface IItem {
  identificador: string
  sequencialItemPregao?: string
  numItem?: string
  identAta: string | IAtaRegPrecos | null
  identContratacao?: string | IContratacao
  descBreve?: string
  descDetalhada?: string
  descricaoBreve?: string
  descricaoDetalhada?: string
  qtdHomologada?: number
  valUnitario?: number
  valorUnitario?: number
  tipo?: 'Material' | 'Servico'
  unMedida?: string
  unidadeMedida?: string
  status: StatusElemContratacao
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
  identContrato?: string | IContrato | null
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
  destDespesa?: DestinacaoDespesa
  status: StatusElemContratacao
  createdAt: string
  updatedAt: string
}

export interface IContrato {
  identificador: string
  numContrato: string
  identContratacao: string | IContratacao
  contratacao?: IContratacao
  objeto?: string
  uasgContratante: string
  unGestoraOrigemContrato?: string
  identFornecedor: string
  fornecedor?: IFornecedor
  iniVigencia: string
  fimVigencia?: string
  valorGlobal: number
  numParcelas?: number
  valorParcelas?: number
  tipoContrato?: 'Contrato' | 'Empenho'
  status: StatusElemContratacao
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
  identUnidade?: string | null
  unidade?: IUnidade | null
  uorg_key?: string | null
  createdAt: string
  updatedAt: string
}

export type DestinacaoDespesa = 'Material' | 'Servico' | 'Outras_Obrigacoes'

export interface IRequisicao {
  identificador: string
  requisitanteId: string
  requisitante: IUsuario | { nome: string; email: string; uorg_key?: string }
  identUnidade: string | IUnidade
  identContratacao?: string
  uorg_key?: string
  uorg?: IUorg
  destDespesa: DestinacaoDespesa
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
  identUnidade?: string
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
  amparoLegal: AmparoLegal
  uasgParticipante?: string
}

export interface CriarRequisicaoData {
  identUnidade?: string
  destDespesa: DestinacaoDespesa
  justificativa: string
  observacoes?: string
  identContratacao?: string
}

export interface CriarItemRequisicaoData {
  identFornecimento: string
  quantidadeSolicitada: number
  observacao?: string
}

export interface CriarContratoData {
  identContratacao: string
  numContrato: string
  uasgContratante: string
  unGestoraOrigemContrato?: string
  cnpjContratado: string
  objeto?: string
  iniVigencia: string
  fimVigencia?: string
  valorGlobal: number
  numParcelas?: number
  valorParcelas?: number
}

export interface CriarFornecimentoManualData {
  identItem: string
  identContrato?: string
  qtdAutorizada: number
  valUnitHomologado: number
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
