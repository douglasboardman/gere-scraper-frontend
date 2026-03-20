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
import { ComprasPage } from '@/pages/compras/ComprasPage'
import { NovaCompraPage } from '@/pages/compras/NovaCompraPage'
import { CompraDetailPage } from '@/pages/compras/CompraDetailPage'
import { AtasPage } from '@/pages/atas/AtasPage'
import { AtaDetailPage } from '@/pages/atas/AtaDetailPage'
import { ItensPage } from '@/pages/itens/ItensPage'
import { ItemDetailPage } from '@/pages/itens/ItemDetailPage'
import { FornecedoresPage } from '@/pages/fornecedores/FornecedoresPage'
import { FornecedorDetailPage } from '@/pages/fornecedores/FornecedorDetailPage'
import { FornecimentosPage } from '@/pages/fornecimentos/FornecimentosPage'
import { FornecimentoDetailPage } from '@/pages/fornecimentos/FornecimentoDetailPage'
import { RequisicoesPage } from '@/pages/requisicoes/RequisicoesPage'
import { NovaRequisicaoPage } from '@/pages/requisicoes/NovaRequisicaoPage'
import { RequisicaoDetailPage } from '@/pages/requisicoes/RequisicaoDetailPage'
import { RequisicoesPendentesPage } from '@/pages/requisicoes/RequisicoesPendentesPage'
import { RequisicaoAnalisePage } from '@/pages/requisicoes/RequisicaoAnalisePage'
import { RequisicaoImprimirPage } from '@/pages/requisicoes/RequisicaoImprimirPage'
import { UnidadesPage } from '@/pages/unidades/UnidadesPage'
import { UsuariosPage } from '@/pages/usuarios/UsuariosPage'
import { UsuarioEditPage } from '@/pages/usuarios/UsuarioEditPage'
import { PerfilPage } from '@/pages/PerfilPage'

// Protected route component
function PrivateRoute({ requireAdmin = false, requireGestorOrAdmin = false }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { isAdmin, isGestor } = usePermission()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  if (requireGestorOrAdmin && !isAdmin && !isGestor) {
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
            path: 'compras',
            element: <ComprasPage />,
          },
          {
            path: 'compras/nova',
            element: <PrivateRoute requireGestorOrAdmin />,
            children: [
              {
                index: true,
                element: <NovaCompraPage />,
              },
            ],
          },
          {
            path: 'compras/:identificador',
            element: <CompraDetailPage />,
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
            path: 'fornecimentos/:id',
            element: <FornecimentoDetailPage />,
          },
          {
            path: 'requisicoes',
            element: <RequisicoesPage />,
          },
          {
            path: 'requisicoes/nova',
            element: <NovaRequisicaoPage />,
          },
          {
            path: 'requisicoes/pendentes',
            element: <PrivateRoute requireGestorOrAdmin />,
            children: [
              {
                index: true,
                element: <RequisicoesPendentesPage />,
              },
            ],
          },
          {
            path: 'requisicoes/analise/:id',
            element: <PrivateRoute requireGestorOrAdmin />,
            children: [
              {
                index: true,
                element: <RequisicaoAnalisePage />,
              },
            ],
          },
          {
            path: 'requisicoes/:id',
            element: <RequisicaoDetailPage />,
          },
          {
            path: 'unidades',
            element: <PrivateRoute requireGestorOrAdmin />,
            children: [
              {
                index: true,
                element: <UnidadesPage />,
              },
            ],
          },
          {
            path: 'usuarios',
            element: <PrivateRoute requireAdmin />,
            children: [
              {
                index: true,
                element: <UsuariosPage />,
              },
            ],
          },
          {
            path: 'usuarios/:id',
            element: <PrivateRoute requireAdmin />,
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
