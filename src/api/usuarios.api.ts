import apiClient from './client'
import type { IUsuario, AtualizarPerfilData, AdminRegisterData, AdminUpdateUsuarioData } from '@/types'

export const usuariosApi = {
  /** Lista todos os usuários (admin only) */
  async listarTodos(): Promise<IUsuario[]> {
    const { data } = await apiClient.get<IUsuario[]>('/usuarios/all')
    return data
  },

  /** Lista usuários da unidade do usuário logado */
  async listar(): Promise<IUsuario[]> {
    const { data } = await apiClient.get<IUsuario[]>('/usuarios')
    return data
  },

  async obter(id: string): Promise<IUsuario> {
    const { data } = await apiClient.get<IUsuario>(`/usuarios/${id}`)
    return data
  },

  /** Admin cria usuário (ativo=true, role livre) */
  async criar(userData: AdminRegisterData): Promise<IUsuario> {
    const { data } = await apiClient.post<{ usuario: IUsuario }>('/usuarios', userData)
    return data.usuario
  },

  async atualizarPerfil(perfilData: AtualizarPerfilData): Promise<IUsuario> {
    const { data } = await apiClient.put<IUsuario>('/usuarios/perfil', perfilData)
    return data
  },

  /** Admin edita qualquer usuário (exceto senha) */
  async atualizar(id: string, userData: AdminUpdateUsuarioData): Promise<IUsuario> {
    const { data } = await apiClient.put<IUsuario>(`/usuarios/${id}`, userData)
    return data
  },

  /** Admin toggle ativo/inativo */
  async toggleAtivo(id: string): Promise<IUsuario> {
    const { data } = await apiClient.patch<IUsuario>(`/usuarios/${id}/toggle-ativo`)
    return data
  },

  /** Admin solicita reset de senha (envia e-mail) */
  async resetSenha(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(`/usuarios/${id}/reset-senha`)
    return data
  },
}
