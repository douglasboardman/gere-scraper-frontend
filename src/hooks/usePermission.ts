import { useAuthStore } from '@/store/auth.store'
import type { UserRole } from '@/types'

type Action =
  | 'manage:compras'
  | 'manage:atas'
  | 'manage:itens'
  | 'manage:fornecedores'
  | 'manage:fornecimentos'
  | 'manage:requisicoes'
  | 'approve:requisicoes'
  | 'manage:unidades'
  | 'manage:usuarios'
  | 'view:usuarios'

const permissions: Record<UserRole, Action[]> = {
  admin: [
    'manage:compras',
    'manage:atas',
    'manage:itens',
    'manage:fornecedores',
    'manage:fornecimentos',
    'manage:requisicoes',
    'approve:requisicoes',
    'manage:unidades',
    'manage:usuarios',
    'view:usuarios',
  ],
  gestor_compras: [
    'manage:compras',
    'manage:atas',
    'manage:itens',
    'manage:fornecedores',
    'manage:fornecimentos',
    'manage:requisicoes',
    'approve:requisicoes',
    'manage:unidades',
  ],
  requerente: ['manage:requisicoes'],
}

export function usePermission() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? 'requerente'

  const isAdmin = role === 'admin'
  const isGestor = role === 'gestor_compras'
  const isRequerente = role === 'requerente'

  const can = (action: Action): boolean => {
    return permissions[role]?.includes(action) ?? false
  }

  return { isAdmin, isGestor, isRequerente, can, role }
}
