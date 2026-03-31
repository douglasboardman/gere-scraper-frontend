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

// Response interceptor: normalize NestJS error messages
publicClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data) {
      const data = error.response.data
      // NestJS returns { message: 'texto em PT', error: 'English HTTP name' }
      // Normalize .error to always carry the meaningful Portuguese message
      if (data.message) {
        error.response.data.error = data.message
      }
    }
    return Promise.reject(error)
  }
)

export default publicClient
