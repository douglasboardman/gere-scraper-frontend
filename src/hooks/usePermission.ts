import { useAuthStore } from '@/store/auth.store'
import type { UserRole } from '@/types'

type Action =
  // Contratações / Atas / Itens / Fornecimentos
  | 'create:contratacoes'
  | 'edit:contratacoes'
  | 'delete:contratacoes'
  | 'edit:atas'
  | 'edit:itens'
  | 'edit:fornecimentos'
  | 'edit:fornecedores'
  | 'delete:fornecedores'
  // Requisições
  | 'create:requisicoes'
  | 'approve:requisicoes'
  | 'manage:requisicoes_unidade'
  | 'list:all_requisicoes'
  | 'delete:any_requisicao'
  // Usuários
  | 'manage:usuarios'
  | 'view:usuarios_unidade'
  | 'edit:usuarios_unidade'
  // Unidades
  | 'manage:unidades'

const permissions: Record<UserRole, Action[]> = {
  admin: [
    'create:contratacoes',
    'edit:contratacoes',
    'delete:contratacoes',
    'edit:atas',
    'edit:itens',
    'edit:fornecimentos',
    'edit:fornecedores',
    'delete:fornecedores',
    'list:all_requisicoes',
    'delete:any_requisicao',
    'approve:requisicoes',
    'manage:usuarios',
    'view:usuarios_unidade',
    'manage:unidades',
  ],
  gestor_unidade: [
    'create:contratacoes',
    'edit:contratacoes',
    'delete:contratacoes',
    'edit:atas',
    'create:requisicoes',
    'approve:requisicoes',
    'manage:requisicoes_unidade',
    'view:usuarios_unidade',
    'edit:usuarios_unidade',
    'manage:unidades',
  ],
  gestor_contratacoes: [
    'create:contratacoes',
    'edit:contratacoes',
    'edit:atas',
    'edit:itens',
    'edit:fornecimentos',
    'edit:fornecedores',
    'delete:fornecedores',
    'create:requisicoes',
    'approve:requisicoes',
    'manage:requisicoes_unidade',
    'view:usuarios_unidade',
    'manage:unidades',
  ],
  gestor_contratos: [
    'edit:atas',
    'edit:fornecedores',
    'create:requisicoes',
    'manage:requisicoes_unidade',
    'view:usuarios_unidade',
  ],
  gestor_financeiro: [
    'create:requisicoes',
    'manage:requisicoes_unidade',
    'view:usuarios_unidade',
  ],
  requisitante: [
    'create:requisicoes',
  ],
}

export function usePermission() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? 'requisitante'

  const isAdmin              = role === 'admin'
  const isGestorUnidade      = role === 'gestor_unidade'
  const isGestorContratacoes = role === 'gestor_contratacoes'
  const isGestorContratos    = role === 'gestor_contratos'
  const isGestorFinanceiro   = role === 'gestor_financeiro'
  const isRequisitante       = role === 'requisitante'

  // Compat: "gestor" = qualquer role com capacidade de aprovar/gerir requisições
  const isGestor = isGestorUnidade || isGestorContratacoes || isGestorContratos || isGestorFinanceiro

  const can = (action: Action): boolean => {
    return permissions[role]?.includes(action) ?? false
  }

  return {
    isAdmin,
    isGestor,
    isGestorUnidade,
    isGestorContratacoes,
    isGestorContratos,
    isGestorFinanceiro,
    isRequisitante,
    can,
    role,
  }
}
