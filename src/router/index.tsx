import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { usePermission } from '@/hooks/usePermission'
import { AppLayout } from '@/components/layout/AppLayout'

// Pages
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ContratacoesPage } from '@/pages/contratacoes/ContratacoesPage'
import { NovaContratacaoPage } from '@/pages/contratacoes/NovaContratacaoPage'
import { ContratacaoDetailPage } from '@/pages/contratacoes/ContratacaoDetailPage'
import { AtasPage } from '@/pages/atas/AtasPage'
import { AtaDetailPage } from '@/pages/atas/AtaDetailPage'
import { ItensPage } from '@/pages/itens/ItensPage'
import { ItemDetailPage } from '@/pages/itens/ItemDetailPage'
import { FornecedoresPage } from '@/pages/fornecedores/FornecedoresPage'
import { FornecedorDetailPage } from '@/pages/fornecedores/FornecedorDetailPage'
import { FornecimentosPage } from '@/pages/fornecimentos/FornecimentosPage'
import { FornecimentoDetailPage } from '@/pages/fornecimentos/FornecimentoDetailPage'
import { NovoFornecimentoPage } from '@/pages/fornecimentos/NovoFornecimentoPage'
import { ContratosPage } from '@/pages/contratos/ContratosPage'
import { ContratoDetailPage } from '@/pages/contratos/ContratoDetailPage'
import { NovoContratoPage } from '@/pages/contratos/NovoContratoPage'
import { RequisicoesPage } from '@/pages/requisicoes/RequisicoesPage'
import { RequisicoesUnidadePage } from '@/pages/requisicoes/RequisicoesUnidadePage'
import { MinhasRequisicoesPage } from '@/pages/requisicoes/MinhasRequisicoesPage'
import { NovaRequisicaoPage } from '@/pages/requisicoes/NovaRequisicaoPage'
import { RequisicaoDetailPage } from '@/pages/requisicoes/RequisicaoDetailPage'
import { RequisicaoViewPage } from '@/pages/requisicoes/RequisicaoViewPage'
import { RequisicoesPendentesPage } from '@/pages/requisicoes/RequisicoesPendentesPage'
import { RequisicaoAnalisePage } from '@/pages/requisicoes/RequisicaoAnalisePage'
import { RequisicaoImprimirPage } from '@/pages/requisicoes/RequisicaoImprimirPage'
import { UnidadesPage } from '@/pages/unidades/UnidadesPage'
import { UsuariosPage } from '@/pages/usuarios/UsuariosPage'
import { UsuarioEditPage } from '@/pages/usuarios/UsuarioEditPage'
import { PerfilPage } from '@/pages/PerfilPage'
import { SobrePage } from '@/pages/SobrePage'

// Protected route component
function PrivateRoute({
  requireAdmin = false,
  requireAdminOrGestorUnidade = false,
  requireGestorOrAdmin = false,
  requireNonAdmin = false,
  requireGestorOnly = false,
}: {
  requireAdmin?: boolean
  requireAdminOrGestorUnidade?: boolean
  requireGestorOrAdmin?: boolean
  requireNonAdmin?: boolean
  requireGestorOnly?: boolean
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { isAdmin, isGestor, isGestorUnidade } = usePermission()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  if (requireAdminOrGestorUnidade && !isAdmin && !isGestorUnidade) {
    return <Navigate to="/dashboard" replace />
  }

  if (requireGestorOrAdmin && !isAdmin && !isGestor) {
    return <Navigate to="/dashboard" replace />
  }

  if (requireNonAdmin && isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  if (requireGestorOnly && !isGestor) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/registro',
    element: <RegisterPage />,
  },
  {
    path: '/esqueci-senha',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/redefinir-senha',
    element: <ResetPasswordPage />,
  },
  {
    path: '/sobre',
    element: <SobrePage />,
  },
  {
    path: '/',
    element: <PrivateRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'contratacoes',
            element: <ContratacoesPage />,
          },
          {
            path: 'contratacoes/nova',
            element: <PrivateRoute requireGestorOrAdmin />,
            children: [
              {
                index: true,
                element: <NovaContratacaoPage />,
              },
            ],
          },
          {
            path: 'contratacoes/:identificador',
            element: <ContratacaoDetailPage />,
          },
          {
            path: 'atas',
            element: <AtasPage />,
          },
          {
            path: 'atas/:id',
            element: <AtaDetailPage />,
          },
          {
            path: 'itens',
            element: <ItensPage />,
          },
          {
            path: 'itens/:id',
            element: <ItemDetailPage />,
          },
          {
            path: 'fornecedores',
            element: <FornecedoresPage />,
          },
          {
            path: 'fornecedores/:id',
            element: <FornecedorDetailPage />,
          },
          {
            path: 'fornecimentos',
            element: <FornecimentosPage />,
          },
          {
            path: 'fornecimentos/novo',
            element: <PrivateRoute requireGestorOrAdmin />,
            children: [{ index: true, element: <NovoFornecimentoPage /> }],
          },
          {
            path: 'fornecimentos/:id',
            element: <FornecimentoDetailPage />,
          },
          {
            path: 'contratos',
            element: <ContratosPage />,
          },
          {
            path: 'contratos/novo',
            element: <PrivateRoute requireGestorOrAdmin />,
            children: [{ index: true, element: <NovoContratoPage /> }],
          },
          {
            path: 'contratos/:id',
            element: <ContratoDetailPage />,
          },
          {
            path: 'requisicoes',
            element: <RequisicoesUnidadePage />,
          },
          {
            path: 'requisicoes/minhas_requisicoes',
            element: <PrivateRoute requireNonAdmin />,
            children: [{ index: true, element: <MinhasRequisicoesPage /> }],
          },
          {
            path: 'requisicoes/nova',
            element: <PrivateRoute requireNonAdmin />,
            children: [{ index: true, element: <NovaRequisicaoPage /> }],
          },
          {
            path: 'requisicoes/pendentes',
            element: <PrivateRoute requireGestorOnly />,
            children: [
              {
                index: true,
                element: <RequisicoesPendentesPage />,
              },
            ],
          },
          {
            path: 'requisicoes/analise/:id',
            element: <PrivateRoute requireGestorOnly />,
            children: [
              {
                index: true,
                element: <RequisicaoAnalisePage />,
              },
            ],
          },
          {
            path: 'requisicoes/:id/visualizar',
            element: <RequisicaoViewPage />,
          },
          {
            path: 'requisicoes/:id',
            element: <RequisicaoDetailPage />,
          },
          // Mantido para compatibilidade com links existentes
          {
            path: 'requisicoes-lista',
            element: <RequisicoesPage />,
          },
          {
            path: 'unidades',
            element: <PrivateRoute requireAdmin />,
            children: [
              {
                index: true,
                element: <UnidadesPage />,
              },
            ],
          },
          {
            path: 'usuarios',
            element: <PrivateRoute requireAdminOrGestorUnidade />,
            children: [
              {
                index: true,
                element: <UsuariosPage />,
              },
            ],
          },
          {
            path: 'usuarios/:id',
            element: <PrivateRoute requireAdminOrGestorUnidade />,
            children: [
              {
                index: true,
                element: <UsuarioEditPage />,
              },
            ],
          },
          {
            path: 'perfil',
            element: <PerfilPage />,
          },
        ],
      },
      // Rota de impressão fora do AppLayout — renderiza sem sidebar/header
      {
        path: 'requisicoes/:id/imprimir',
        element: <RequisicaoImprimirPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
