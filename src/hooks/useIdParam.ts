import { useSearchParams } from 'react-router-dom'

export function useIdParam(paramName = 'id'): string | null {
  const [searchParams] = useSearchParams()
  return searchParams.get(paramName)
}
