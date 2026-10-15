import { useNavigate } from 'react-router-dom'

/** Retorna à origem real; links abertos diretamente usam uma listagem de referência. */
export function useBackNavigation(fallback: string) {
  const navigate = useNavigate()
  return () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
