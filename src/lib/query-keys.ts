export const qk = {
  atas: {
    all: ['atas'] as const,
    byContratacao: (id: string) => ['atas', id] as const,
    filtered: (params: { identContratacao: string }) => ['atas', params] as const,
    detail: (id: string) => ['ata', id] as const,
  },

  auth: {
    unidades: ['auth-unidades'] as const,
    uorgs: (unidade: string) => ['auth-uorgs', unidade] as const,
  },

  contratacoes: {
    all: ['contratacoes'] as const,
    detail: (id: string) => ['contratacao', id] as const,
    wizard: (ids: string[]) => ['contratacoes-wizard', ids] as const,
    filtro: (uasg: string) => ['contratacoes-filtro', uasg] as const,
  },

  contratos: {
    all: ['contratos'] as const,
    detail: (id: string) => ['contrato', id] as const,
    byContratacao: (id: string) => ['contratos', 'contratacao', id] as const,
    listByContratacao: (id: string) => ['contratos', id] as const,
    dashboard: (params: Record<string, unknown>) => ['contratos-dashboard', params] as const,
    dashboardAll: ['contratos-dashboard'] as const,
    importaveis: ['contratos', 'importaveis'] as const,
  },

  fornecimentos: {
    all: ['fornecimentos'] as const,
    detail: (id: string) => ['fornecimento', id] as const,
    byUnidade: (uasg: string) => ['fornecimentos-unidade', uasg] as const,
    byContratacao: (id: string, uasg: string) => ['fornecimentos', 'contratacao', id, uasg] as const,
    byContrato: (id: string) => ['fornecimentos', 'contrato', id] as const,
    byItem: (id: string) => ['fornecimentos', { identItem: id }] as const,
    byParams: (idItem: string, idFornecedor: string, status: string) => ['fornecimentos', idItem, idFornecedor, status] as const,
    wizard: (id: string, uasg: string, identContratoOob?: string) => ['fornecimentos-wizard', id, uasg, identContratoOob] as const,
    addItems: (contratacaoId: string | null, uasg: string) => ['add-items-fornecimentos', contratacaoId, uasg] as const,
    analise: (contratacaoId: string | null, uasg: string) => ['analise-fornecimentos', contratacaoId, uasg] as const,
  },

  fornecedores: {
    all: ['fornecedores'] as const,
    detail: (id: string) => ['fornecedor', id] as const,
  },

  itens: {
    all: ['itens'] as const,
    detail: (id: string) => ['item', id] as const,
    byAta: (identAta: string, identContratacao: string) => ['itens', identAta, identContratacao] as const,
    byAtaId: (id: string) => ['itens', { identAta: id }] as const,
    byContratacao: (id: string) => ['itens', { identContratacao: id }] as const,
    wizard: (id: string) => ['itens-wizard', id] as const,
    analise: (contratacaoId: string | null) => ['analise-itens', contratacaoId] as const,
  },

  oob: {
    byAno: (ano: number) => ['oob', ano] as const,
    wizard: (uasg: string, ano: number) => ['oob-wizard', uasg, ano] as const,
    wizardAll: ['oob-wizard'] as const,
  },

  requisicoes: {
    all: ['requisicoes'] as const,
    detail: (id: string) => ['requisicao', id] as const,
    itens: (identificador: string) => ['itens-requisicao', identificador] as const,
    unidade: (contratacaoId?: string) => ['requisicoes-unidade', contratacaoId] as const,
    unidadeAll: ['requisicoes-unidade'] as const,
    imprimir: (id: string) => ['requisicao-imprimir', id] as const,
    itensImprimir: (id: string) => ['itens-imprimir', id] as const,
    analise: (id: string) => ['requisicao-analise', id] as const,
    itensAnalise: (identificador: string) => ['itens-analise', identificador] as const,
  },

  unidades: {
    all: ['unidades'] as const,
  },

  uorgs: {
    detail: (identUorg: string) => ['uorg', identUorg] as const,
    byUnidade: (unidade: string) => ['uorgs-unidade', unidade] as const,
  },

  usuarios: {
    all: ['usuarios'] as const,
    todos: ['usuarios-todos'] as const,
    byUnidade: ['usuarios-unidade'] as const,
    detail: (id: string) => ['usuario', id] as const,
  },
} as const
