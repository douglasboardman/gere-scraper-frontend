import type { AxiosError } from 'axios'

interface ApiErrorData {
  message?: string
  error?: string
}

/**
 * Extracts a user-facing error message from an unknown Axios error.
 * Distinguishes network errors (no connection, timeout) from server HTTP errors.
 * Eliminates the need for `(error as any)?.response?.data?.message` boilerplate.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Erro inesperado.'): string {
  const e = error as AxiosError<ApiErrorData>

  if (e.response?.data?.message) return e.response.data.message
  if (e.response?.data?.error) return e.response.data.error

  if (e.code === 'ERR_NETWORK' || e.message === 'Network Error') {
    return 'Sem conexão com o servidor.'
  }
  if (e.code === 'ECONNABORTED') {
    return 'Tempo de conexão esgotado.'
  }

  return fallback
}
