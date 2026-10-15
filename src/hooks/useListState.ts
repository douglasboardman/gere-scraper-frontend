import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

// Guarda somente preferências da interface, separadas por usuário e contexto.
// sessionStorage mantém a configuração ao navegar/recarregar sem compartilhá-la entre abas.
function sameShape(value: unknown, initial: unknown): boolean {
  if (initial === null) return value === null || typeof value === 'string'
  if (typeof initial !== 'object') return typeof value === typeof initial
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.entries(initial as Record<string, unknown>).every(([key, field]) =>
    sameShape((value as Record<string, unknown>)[key], field))
}

function readState<T>(key: string, initial: T): T {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null')
    return sameShape(saved, initial) ? saved as T : initial
  } catch {
    return initial
  }
}

export function useListState<T>(name: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const location = useLocation()
  const userId = useAuthStore((state) => state.user?.id ?? 'anonymous')
  const params = new URLSearchParams(location.search)
  params.sort()
  const key = `gere:list:v1:${JSON.stringify([userId, location.pathname, params.toString(), name])}`
  const initialRef = useRef(initial)
  initialRef.current = initial
  const [snapshot, setSnapshot] = useState(() => ({ key, value: readState(key, initial) }))

  // A mesma página pode receber outro contexto sem desmontar (ex.: itens de outra ata).
  let current = snapshot
  if (current.key !== key) {
    current = { key, value: readState(key, initial) }
    setSnapshot(current)
  }

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((update) => {
    setSnapshot((previous) => {
      const value = previous.key === key ? previous.value : readState(key, initialRef.current)
      const next = typeof update === 'function' ? (update as (value: T) => T)(value) : update
      try {
        sessionStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Armazenamento indisponível não impede a pesquisa ou a navegação.
      }
      return { key, value: next }
    })
  }, [key])

  return [current.value, setValue]
}
