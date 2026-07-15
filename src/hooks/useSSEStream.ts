import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { API_BASE_URL } from '@/api/client'

interface SSEStreamOptions<TState> {
  jobId: string | null
  urlPath: (jobId: string) => string
  initialState: TState
  onProgress: (payload: unknown, prev: TState) => TState
  onDone: (payload: unknown, prev: TState) => TState
  onServerError: (payload: unknown, prev: TState) => TState
  /** Called on network/connection error before a retry. Omit to skip state update. */
  onConnectionError?: (retryNumber: number, maxRetries: number, prev: TState) => TState
  maxRetries?: number
  retryDelay?: number
}

/**
 * Generic SSE hook using the Fetch API with Authorization header.
 * Avoids the security issue of passing the JWT token as a query-string
 * parameter (which exposes it in server logs, browser history and Referer headers).
 * EventSource does not support custom headers, so we parse the SSE protocol
 * manually over a fetch ReadableStream.
 *
 * The backend SSE endpoint must accept a Bearer token in the Authorization header.
 */
export function useSSEStream<TState>({
  jobId,
  urlPath,
  initialState,
  onProgress,
  onDone,
  onServerError,
  onConnectionError,
  maxRetries = 3,
  retryDelay = 3000,
}: SSEStreamOptions<TState>): TState {
  const [state, setState] = useState<TState>(initialState)
  const abortRef = useRef<AbortController | null>(null)
  const retriesRef = useRef(0)

  useEffect(() => {
    if (!jobId) {
      setState(initialState)
      return
    }

    retriesRef.current = 0
    let cancelled = false

    async function connect() {
      if (cancelled) return

      const token = useAuthStore.getState().token
      const url = `${API_BASE_URL}${urlPath(jobId!)}`
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch(url, {
          headers: {
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`)
        }

        retriesRef.current = 0
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let currentEvent = 'message'

        while (true) {
          const { done, value } = await reader.read()
          if (done || cancelled) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim()
            } else if (line.startsWith('data:')) {
              const raw = line.slice(5).trim()
              let payload: unknown = raw
              try {
                payload = JSON.parse(raw)
              } catch {
                /* keep raw string */
              }

              if (currentEvent === 'progress') {
                setState((prev) => onProgress(payload, prev))
              } else if (currentEvent === 'done') {
                setState((prev) => onDone(payload, prev))
                return
              } else if (currentEvent === 'error') {
                setState((prev) => onServerError(payload, prev))
                return
              }
            } else if (line === '') {
              currentEvent = 'message'
            }
          }
        }
      } catch (err) {
        if (cancelled) return
        const isAbort = err instanceof DOMException && err.name === 'AbortError'
        if (isAbort) return

        if (retriesRef.current < maxRetries) {
          retriesRef.current++
          if (onConnectionError) {
            setState((prev) => onConnectionError(retriesRef.current, maxRetries, prev))
          }
          setTimeout(connect, retryDelay)
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      abortRef.current?.abort()
    }
    // jobId is the only external dep — reconnect when it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  return state
}
