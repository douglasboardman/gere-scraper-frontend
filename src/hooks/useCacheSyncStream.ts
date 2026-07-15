import { useSSEStream } from './useSSEStream'
import type { CacheSyncStreamState } from '@/types'

const initialState: CacheSyncStreamState = {
  progresso: 0,
  mensagem: '',
  paginasProcessadas: 0,
  paginasTotais: null,
  contratosEncontrados: 0,
  contratosInseridos: 0,
  contratosAtualizados: 0,
  contratosIgnorados: 0,
  status: null,
  isActive: false,
}

export function useCacheSyncStream(jobId: string | null): CacheSyncStreamState {
  return useSSEStream<CacheSyncStreamState>({
    jobId,
    urlPath: (id) => `/jobs/${id}/stream`,
    initialState,
    onProgress: (payload, prev) => {
      const p = payload as Partial<CacheSyncStreamState>
      return {
        ...prev,
        progresso: p.progresso ?? prev.progresso,
        mensagem: p.mensagem ?? prev.mensagem,
        paginasProcessadas: p.paginasProcessadas ?? prev.paginasProcessadas,
        paginasTotais: p.paginasTotais ?? prev.paginasTotais,
        contratosEncontrados: p.contratosEncontrados ?? prev.contratosEncontrados,
        contratosInseridos: p.contratosInseridos ?? prev.contratosInseridos,
        contratosAtualizados: p.contratosAtualizados ?? prev.contratosAtualizados,
        contratosIgnorados: p.contratosIgnorados ?? prev.contratosIgnorados,
        status: 'running',
        isActive: true,
      }
    },
    onDone: (payload, prev) => {
      const p = payload as Partial<CacheSyncStreamState>
      return {
        ...prev,
        progresso: 100,
        mensagem: p.mensagem ?? 'Sincronização concluída!',
        contratosInseridos: p.contratosInseridos ?? prev.contratosInseridos,
        contratosAtualizados: p.contratosAtualizados ?? prev.contratosAtualizados,
        contratosIgnorados: p.contratosIgnorados ?? prev.contratosIgnorados,
        contratosEncontrados: p.contratosEncontrados ?? prev.contratosEncontrados,
        status: 'completed',
        isActive: false,
      }
    },
    onServerError: (payload, prev) => {
      const p = payload as { mensagem?: string }
      return {
        ...prev,
        mensagem: p.mensagem ?? 'Erro na sincronização.',
        status: 'failed',
        isActive: false,
      }
    },
    onConnectionError: (_retryNumber, _maxRetries, prev) => ({
      ...prev,
      mensagem: 'Reconectando...',
    }),
  })
}
