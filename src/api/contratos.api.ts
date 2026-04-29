import apiClient from './client'
import type {
  IContrato,
  IContratacao,
  IContratoExterno,
  IItemContratoExterno,
  ImportarContratoPayload,
  ImportarContratoResponse,
  CriarContratoData,
} from '@/types'

export const contratosApi = {
  async listar(params?: {
    identContratacao?: string
  }): Promise<IContrato[]> {
    const { data } = await apiClient.get<IContrato[]>('/contratos', { params })
    return data
  },

  async listarPorContratacao(identContratacao: string): Promise<IContrato[]> {
    const { data } = await apiClient.get<IContrato[]>(`/contratos/contratacao/${identContratacao}`)
    return data
  },

  async obter(id: string): Promise<IContrato> {
    const { data } = await apiClient.get<IContrato>(`/contratos/${id}`)
    return data
  },

  async criar(body: CriarContratoData): Promise<IContrato> {
    const { data } = await apiClient.post<IContrato>('/contratos', body)
    return data
  },

  async atualizar(id: string, body: Partial<IContrato>): Promise<IContrato> {
    const { data } = await apiClient.patch<IContrato>(`/contratos/${id}`, body)
    return data
  },

  async listarImportaveis(): Promise<IContratacao[]> {
    const { data } = await apiClient.get<IContratacao[]>('/contratos/importaveis')
    return data
  },

  async consultaExterna(params: {
    identContratacao: string
    numContrato: string
    anoContrato: number
    cnpjFornecedor: string
  }): Promise<IContratoExterno[]> {
    const { data } = await apiClient.get<IContratoExterno[]>('/contratos/consulta-externa', { params })
    return data
  },

  async itensExternos(params: {
    identContratacao: string
    numContrato: string
    dataVigenciaInicial: string
    idCompra: string
    numControlePncpContrato?: string | null
  }): Promise<IItemContratoExterno[]> {
    const { data } = await apiClient.get<IItemContratoExterno[]>('/contratos/itens-externos', { params })
    return data
  },

  async importar(payload: ImportarContratoPayload): Promise<ImportarContratoResponse> {
    const { data } = await apiClient.post<ImportarContratoResponse>('/contratos/importar', payload)
    return data
  },

  async deletar(identificador: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`/contratos/${identificador}`)
    return data
  },
}
