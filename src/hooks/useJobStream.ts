import { useEffect, useRef, useState } from 'react'
import type { StatusJob } from '@/types'

interface JobStreamState {
  progresso: number
  itensProcessados: number
  totalItens: number
  atasProcessadas: number
  atasTotal: number
  mensagem: string
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
  status: null,
  isActive: false,
}

const MAX_RETRIES = 3
const RETRY_DELAY = 3000

export function useJobStream(jobId: string | null): JobStreamState {
  const [state, setState] = useState<JobStreamState>(initialState)
  const eventSourceRef = useRef<EventSource | null>(null)
  const retriesRef = useRef(0)

  useEffect(() => {
    if (!jobId) {
      setState(initialState)
      return
    }

    let cancelled = false

    function connect() {
      if (cancelled) return

      const token = localStorage.getItem('gere_token')
      // Usa caminho relativo para passar pelo proxy do Vite (em dev) ou reverse proxy (em prod)
      const url = `/api/jobs/${jobId}/stream${token ? `?token=${token}` : ''}`

      setState((prev) => ({ ...prev, isActive: true, status: 'running' }))

      const es = new EventSource(url)
      eventSourceRef.current = es
      // Evita retry quando o servidor fecha a conexão após enviar um evento terminal (done/error).
      // O EventSource sempre dispara onerror ao fechar, independentemente de ter sido intencional.
      let terminalReceived = false

      es.addEventListener('progress', (event: MessageEvent) => {
        retriesRef.current = 0
        try {
          const payload = JSON.parse(event.data as string)
          setState((prev) => ({
            ...prev,
            progresso: payload.progresso ?? prev.progresso,
            itensProcessados: payload.itensProcessados ?? prev.itensProcessados,
            totalItens: payload.totalItens ?? prev.totalItens,
            atasProcessadas: payload.atasProcessadas ?? prev.atasProcessadas,
            atasTotal: payload.atasTotal ?? prev.atasTotal,
            mensagem: payload.mensagem ?? prev.mensagem,
            status: 'running',
            isActive: true,
          }))
        } catch {
          // ignore parse errors
        }
      })

      es.addEventListener('done', (event: MessageEvent) => {
        terminalReceived = true
        try {
          const payload = JSON.parse(event.data as string)
          setState((prev) => ({
            ...prev,
            progresso: 100,
            mensagem: payload.mensagem ?? 'Processamento concluído!',
            status: 'completed',
            isActive: false,
          }))
        } catch {
          setState((prev) => ({
            ...prev,
            progresso: 100,
            mensagem: 'Processamento concluído!',
            status: 'completed',
            isActive: false,
          }))
        }
        es.close()
      })

      // Custom SSE "error" event sent by the backend when the job fails
      es.addEventListener('error', (event: Event) => {
        // Distinguish custom SSE error events (have .data) from native connection errors (no .data)
        const msgEvent = event as MessageEvent
        if (typeof msgEvent.data !== 'string') return // native error — handled by onerror below

        terminalReceived = true
        try {
          const payload = JSON.parse(msgEvent.data)
          setState((prev) => ({
            ...prev,
            mensagem: payload.mensagem ?? 'Erro no processamento.',
            status: 'failed',
            isActive: false,
          }))
        } catch {
          setState((prev) => ({
            ...prev,
            mensagem: 'Erro no processamento.',
            status: 'failed',
            isActive: false,
          }))
        }
        es.close()
      })

      // Native connection error — retry a few times before giving up
      es.onerror = () => {
        es.close()
        if (cancelled || terminalReceived) return

        if (retriesRef.current < MAX_RETRIES) {
          retriesRef.current++
          setState((prev) => ({
            ...prev,
            mensagem: 'Reconectando ao servidor...',
          }))
          setTimeout(connect, RETRY_DELAY)
        } else {
          setState((prev) => ({
            ...prev,
            status: 'failed',
            mensagem: 'Conexão perdida com o servidor.',
            isActive: false,
          }))
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      eventSourceRef.current?.close()
      eventSourceRef.current = null
    }
  }, [jobId])

  return state
}
