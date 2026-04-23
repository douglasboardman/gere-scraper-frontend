import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IUsuario } from '@/types'

export interface ActiveJobFormData {
  numContratacao: string
  anoContratacao: string
  uasgUnGestora: string
  modalidade: string
  amparoLegal: string
}

interface AuthState {
  user: IUsuario | null
  token: string | null
  isAuthenticated: boolean
  activeJobId: string | null
  activeJobFormData: ActiveJobFormData | null
}

interface AuthActions {
  login: (token: string, user: IUsuario) => void
  logout: () => void
  setUser: (user: IUsuario) => void
  setActiveJobId: (jobId: string | null) => void
  setActiveJobFormData: (data: ActiveJobFormData | null) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      activeJobId: null,
      activeJobFormData: null,

      // Actions
      login: (token: string, user: IUsuario) => {
        localStorage.setItem('gere_token', token)
        localStorage.setItem('gere_user', JSON.stringify(user))
        set({ token, user, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('gere_token')
        localStorage.removeItem('gere_user')
        set({ token: null, user: null, isAuthenticated: false, activeJobId: null })
      },

      setUser: (user: IUsuario) => {
        localStorage.setItem('gere_user', JSON.stringify(user))
        set({ user })
      },

      setActiveJobId: (jobId: string | null) => {
        set({ activeJobId: jobId, ...(jobId === null ? { activeJobFormData: null } : {}) })
      },

      setActiveJobFormData: (data: ActiveJobFormData | null) => {
        set({ activeJobFormData: data })
      },
    }),
    {
      name: 'gere-auth-storage',
      // activeJobId não é persistido: jobs são efêmeros e um ID antigo causaria
      // erros 404 ao tentar reconectar ao SSE em uma nova sessão.
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
