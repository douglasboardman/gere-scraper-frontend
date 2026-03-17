import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + '/api'
  : '/api'

/**
 * Cliente HTTP para rotas públicas (registro, reset de senha).
 * Não injeta token e não redireciona no 401.
 */
export const publicClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default publicClient
