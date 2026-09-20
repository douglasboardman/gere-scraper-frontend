import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '@/api/client'
import { useAuthStore } from '@/store/auth.store'

const RETRY_BASE_MS = 3_000
const RETRY_MAX_MS = 30_000
const POLLING_FALLBACK_MS = 60_000

export function useNotificacoesStream() {
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    let cancelado = false
    let controlador: AbortController | null = null
    let reconexao: ReturnType<typeof setTimeout> | null = null
    let tentativa = 0

    const invalidar = () => {
      void queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
    }
    const pollingFallback = setInterval(invalidar, POLLING_FALLBACK_MS)

    const conectar = async () => {
      if (cancelado) return
      controlador = new AbortController()

      try {
        const token = useAuthStore.getState().token
        const response = await fetch(`${API_BASE_URL}/notificacoes/stream`, {
          headers: {
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controlador.signal,
        })
        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)

        tentativa = 0
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let evento = 'message'
        let dados: string[] = []

        const processarEvento = () => {
          if (evento === 'notificacoes.atualizadas' && dados.length > 0) invalidar()
          evento = 'message'
          dados = []
        }

        while (!cancelado) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const linhas = buffer.split(/\r?\n/)
          buffer = linhas.pop() ?? ''

          for (const linha of linhas) {
            if (linha.startsWith('event:')) evento = linha.slice(6).trim()
            else if (linha.startsWith('data:')) dados.push(linha.slice(5).trim())
            else if (linha === '') processarEvento()
          }
        }
      } catch (error) {
        if (cancelado || (error instanceof DOMException && error.name === 'AbortError')) return
      }

      if (!cancelado) {
        tentativa += 1
        const atraso = Math.min(RETRY_BASE_MS * (2 ** Math.max(tentativa - 1, 0)), RETRY_MAX_MS)
        reconexao = setTimeout(() => void conectar(), atraso)
      }
    }

    void conectar()
    return () => {
      cancelado = true
      controlador?.abort()
      if (reconexao) clearTimeout(reconexao)
      clearInterval(pollingFallback)
    }
  }, [queryClient, userId])
}
