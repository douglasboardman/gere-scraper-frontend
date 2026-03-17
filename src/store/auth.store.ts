import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IUsuario } from '@/types'

interface AuthState {
  user: IUsuario | null
  token: string | null
  isAuthenticated: boolean
  activeJobId: string | null
}

interface AuthActions {
  login: (token: string, user: IUsuario) => void
  logout: () => void
  setUser: (user: IUsuario) => void
  setActiveJobId: (jobId: string | null) => void
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
        set({ activeJobId: jobId })
      },
    }),
    {
      name: 'gere-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        activeJobId: state.activeJobId,
      }),
    }
  )
)
