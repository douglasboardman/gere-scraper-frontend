import { apiClient } from './client'

export interface PublicacaoAta {
  numero: string
  inicio: string
  fim: string
}
export interface HomologacaoAta extends PublicacaoAta {
  tentativa: string
  estado: 'pendente' | 'executando' | 'concluida' | 'falha'
  progresso: number
  mensagem: string
  identAta: string | null
}
export interface AtaPreparada {
  homologacao: HomologacaoAta | null
  chave: string
  nome: string
  cnpj: string
  inicio: string
  fim: string
  oficial: string | null
  conciliacao: string
  itens: { numero: string; quantidade: string; unitario: string }[]
}
export interface Rodada {
  id: string
  criadaEm: string
  emitidaEm: string | null
  importadaEm: string | null
  manifestoHash: string
  planilhaHash: string | null
  atas: AtaPreparada[]
}
export interface PreviaPacote {
  id: string
  idCompra: string
  hash: string
  atas: number
  itens: number
  participantes: number
  repetido: boolean
  detalhes: {
    item: string
    cnpj: string
    quantidade: string
    unitario: string
  }[]
}
const base = '/preparacao-atas'
export const preparacaoAtasApi = {
  async homologar(compra: string, rodada: string, cnpj: string, dados: PublicacaoAta) {
    return (await apiClient.post<HomologacaoAta>(base + '/' + compra + '/' + rodada + '/homologar', { cnpj, ...dados })).data
  },
  async consultar(compra: string) {
    return (
      await apiClient.get<{ conferido: boolean; rodadas: Rodada[] }>(
        base + '/' + compra,
      )
    ).data
  },
  async conferir(compra: string) {
    await apiClient.post(base + '/' + compra + '/historico/conferir', {
      conferido: true,
    })
  },
  async pacote(file: File, hash?: string) {
    const data = new FormData()
    data.append('pacote', file)
    if (hash) data.append('hash', hash)
    return (
      await apiClient.post<PreviaPacote>(
        base + '/pacote/' + (hash ? 'confirmar' : 'validar'),
        data,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
    ).data
  },
  async recuperar(compra: string, rodada: Rodada) {
    await apiClient.post(base + '/' + compra + '/' + rodada.id + '/recuperar', {
      manifestoHash: rodada.manifestoHash,
    })
  },
  async baixar(compra: string, rodada: string, tipo: 'zip' | 'xlsx') {
    const { data } = await apiClient.get<Blob>(
      base + '/' + compra + '/' + rodada + '/arquivo/' + tipo,
      { responseType: 'blob' },
    )
    const url = URL.createObjectURL(data),
      link = document.createElement('a')
    link.href = url
    link.download = 'GERE_ATAS_' + compra + '_' + rodada + '.' + tipo
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}
