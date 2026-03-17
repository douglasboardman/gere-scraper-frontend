import apiClient from './client'
import publicClient from './public-client'
import type { IUsuario, IUnidade, LoginResponse, RegisterData } from '@/types'

export const authApi = {
  async login(email: string, senha: string): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, senha })
    return data
  },

  /** Registro público (ativo=false, role=requerente) */
  async register(registerData: RegisterData): Promise<{ message: string; usuario: IUsuario }> {
    const { data } = await publicClient.post<{ message: string; usuario: IUsuario }>('/auth/register', registerData)
    return data
  },

  /** Lista unidades disponíveis para registro (público) */
  async listarUnidades(): Promise<IUnidade[]> {
    const { data } = await publicClient.get<IUnidade[]>('/auth/unidades')
    return data
  },

  /** Solicita reset de senha pelo próprio usuário (público) */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await publicClient.post<{ message: string }>('/auth/forgot-password', { email })
    return data
  },

  /** Redefine senha usando token do e-mail */
  async resetPassword(token: string, novaSenha: string): Promise<{ message: string }> {
    const { data } = await publicClient.post<{ message: string }>('/auth/reset-password', { token, novaSenha })
    return data
  },
}
