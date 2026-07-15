import { useSSEStream } from './useSSEStream'
import type { StatusJob } from '@/types'

interface JobStreamState {
  progresso: number
  itensProcessados: number
  totalItens: number
  atasProcessadas: number
  atasTotal: number
  mensagem: string
  errorCode: string | null
  status: StatusJob | null
  isActive: boolean
}

const initialState: JobStreamState = {
  progresso: 0,
  itensProcessados: 0,
  totalItens: 0,
  atasProcessadas: 0,
  atasTotal: 0,
  mensagem: '',
  errorCode: null,
  status: null,
  isActive: false,
}

export function useJobStream(jobId: string | null): JobStreamState {
  return useSSEStream<JobStreamState>({
    jobId,
    urlPath: (id) => `/jobs/${id}/stream`,
    initialState,
    onProgress: (payload, prev) => {
      const p = payload as Partial<JobStreamState>
      return {
        ...prev,
        progresso: p.progresso ?? prev.progresso,
        itensProcessados: p.itensProcessados ?? prev.itensProcessados,
        totalItens: p.totalItens ?? prev.totalItens,
        atasProcessadas: p.atasProcessadas ?? prev.atasProcessadas,
        atasTotal: p.atasTotal ?? prev.atasTotal,
        mensagem: p.mensagem ?? prev.mensagem,
        status: 'running',
        isActive: true,
      }
    },
    onDone: (payload, prev) => {
      const p = payload as { mensagem?: string }
      return {
        ...prev,
        progresso: 100,
        atasProcessadas: prev.atasTotal > 0 ? prev.atasTotal : prev.atasProcessadas,
        itensProcessados: prev.totalItens > 0 ? prev.totalItens : prev.itensProcessados,
        mensagem: p.mensagem ?? 'Processamento concluído!',
        status: 'completed',
        isActive: false,
      }
    },
    onServerError: (payload, prev) => {
      const p = payload as { errorCode?: string; mensagem?: string }
      return {
        ...prev,
        errorCode: p.errorCode ?? null,
        mensagem: p.mensagem ?? 'Erro no processamento.',
        status: 'failed',
        isActive: false,
      }
    },
    onConnectionError: (_retryNumber, _maxRetries, prev) => ({
      ...prev,
      mensagem: 'Reconectando ao servidor...',
    }),
  })
}
