import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '@/api/client'
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

const MAX_RETRIES = 3
const RETRY_DELAY = 3000

export function useCacheSyncStream(jobId: string | null): CacheSyncStreamState {
  const [state, setState] = useState<CacheSyncStreamState>(initialState)
  const eventSourceRef = useRef<EventSource | null>(null)
  const retriesRef = useRef(0)

  useEffect(() => {
    if (!jobId) { setState(initialState); return }

    let cancelled = false

    function connect() {
      if (cancelled) return
      const token = localStorage.getItem('gere_token')
      const url = `${API_BASE_URL}/jobs/${jobId}/stream${token ? `?token=${token}` : ''}`
      setState((prev) => ({ ...prev, isActive: true, status: 'running' }))

      const es = new EventSource(url)
      eventSourceRef.current = es
      let terminalReceived = false

      es.addEventListener('progress', (event: MessageEvent) => {
        retriesRef.current = 0
        try {
          const p = JSON.parse(event.data as string)
          setState((prev) => ({
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
          }))
        } catch { /* ignore */ }
      })

      es.addEventListener('done', (event: MessageEvent) => {
        terminalReceived = true
        try {
          const p = JSON.parse(event.data as string)
          setState((prev) => ({
            ...prev,
            progresso: 100,
            mensagem: p.mensagem ?? 'Sincronização concluída!',
            contratosInseridos: p.contratosInseridos ?? prev.contratosInseridos,
            contratosAtualizados: p.contratosAtualizados ?? prev.contratosAtualizados,
            contratosIgnorados: p.contratosIgnorados ?? prev.contratosIgnorados,
            contratosEncontrados: p.contratosEncontrados ?? prev.contratosEncontrados,
            status: 'completed',
            isActive: false,
          }))
        } catch {
          setState((prev) => ({ ...prev, progresso: 100, status: 'completed', isActive: false }))
        }
        es.close()
      })

      es.addEventListener('error', (event: Event) => {
        const msgEvent = event as MessageEvent
        if (typeof msgEvent.data !== 'string') return
        terminalReceived = true
        try {
          const p = JSON.parse(msgEvent.data)
          setState((prev) => ({ ...prev, mensagem: p.mensagem ?? 'Erro na sincronização.', status: 'failed', isActive: false }))
        } catch {
          setState((prev) => ({ ...prev, mensagem: 'Erro na sincronização.', status: 'failed', isActive: false }))
        }
        es.close()
      })

      es.onerror = () => {
        es.close()
        if (cancelled || terminalReceived) return
        if (retriesRef.current < MAX_RETRIES) {
          retriesRef.current++
          setState((prev) => ({ ...prev, mensagem: 'Reconectando...' }))
          setTimeout(connect, RETRY_DELAY)
        } else {
          setState((prev) => ({ ...prev, status: 'failed', mensagem: 'Conexão perdida.', isActive: false }))
        }
      }
    }

    connect()
    return () => { cancelled = true; eventSourceRef.current?.close(); eventSourceRef.current = null }
  }, [jobId])

  return state
}
