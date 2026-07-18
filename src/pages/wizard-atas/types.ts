export interface ParticipanteItem {
  uasg: string
  nomeUnidade: string
  qtd: number
}

export interface ItemResultadoPregao {
  numeroItem: string
  descricaoResumida: string
  fornecedorCnpj: string
  fornecedorNome: string
  valorUnitario: number
  unMedida: string
  tipo: string
  participantes: ParticipanteItem[]
  qtdTotalHomologada: number
}

export interface ResultadoPregao {
  itens: ItemResultadoPregao[]
}

export interface ContratacaoPrevia {
  identificador: string
  numContratacao: string
  anoContratacao: string
  objeto: string | null
  nomeUnGestora: string
  _count: { itens: number }
}
