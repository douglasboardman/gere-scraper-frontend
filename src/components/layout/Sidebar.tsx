import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Gavel,
  FileText,
  Package,
  Truck,
  ArrowLeftRight,
  ClipboardList,
  ClipboardCheck,
  PlusCircle,
  Building2,
  Users,
  LogOut,
  ChevronRight,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { usePermission } from '@/hooks/usePermission'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
  requiresRole?: 'admin' | 'admin_or_gestor_unidade' | 'can_approve'
}

function GereLogo() {
  return (
    <img src="/logo-branco.svg" alt="GERE" width="40" height="40" />
  )
}

const roleLabels: Record<string, string> = {
  admin:               'Administrador',
  gestor_unidade:      'Gestor de Unidade',
  gestor_contratos:    'Gestor de Contratos',
  gestor_financeiro:   'Gestor Financeiro',
  gestor_contratacoes: 'Gestor de Contratações',
  requisitante:        'Requisitante',
}

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const { isAdmin, isGestorUnidade, can } = usePermission()
  const navigate = useNavigate()

  const canApprove = can('approve:requisicoes')
  const canCreateReq = can('create:requisicoes')
  const canManageUsuarios = can('manage:usuarios') || can('edit:usuarios_unidade')

  const navGroups: NavGroup[] = [
    {
      title: 'Painel',
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Gestão de Contratações',
      items: [
        { label: 'Contratações', to: '/contratacoes', icon: Gavel },
        { label: 'Atas', to: '/atas', icon: FileText },
        { label: 'Itens', to: '/itens', icon: Package },
        { label: 'Fornecedores', to: '/fornecedores', icon: Truck },
        { label: 'Fornecimentos', to: '/fornecimentos', icon: ArrowLeftRight },
      ],
    },
    {
      title: 'Requisições',
      items: [
        ...(canCreateReq ? [{ label: 'Minhas Requisições', to: '/requisicoes/minhas_requisicoes', icon: ClipboardList }] : []),
        ...(canCreateReq ? [{ label: 'Nova Requisição', to: '/requisicoes/nova', icon: PlusCircle }] : []),
        { label: isAdmin ? 'Todas as Requisições' : 'Requisições da Unidade', to: '/requisicoes', icon: Layers, end: true },
        ...(canApprove && !isAdmin
          ? [{ label: 'Requisições para Análise', to: '/requisicoes/pendentes', icon: ClipboardCheck }]
          : []),
      ],
    },
    {
      title: 'Administração',
      requiresRole: 'admin_or_gestor_unidade',
      items: [
        ...(isAdmin ? [{ label: 'Unidades', to: '/unidades', icon: Building2 }] : []),
        ...(canManageUsuarios ? [{ label: 'Usuários', to: '/usuarios', icon: Users }] : []),
      ],
    },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleGroups = navGroups.filter((g) => {
    if (!g.requiresRole) return true
    if (g.requiresRole === 'admin_or_gestor_unidade') return (isAdmin || isGestorUnidade) && g.items.length > 0
    if (g.requiresRole === 'admin') return isAdmin
    if (g.requiresRole === 'can_approve') return canApprove
    return true
  })

  return (
    <aside
      className="flex flex-col h-full w-[260px] shrink-0"
      style={{ backgroundColor: '#272626' }}
    >
      {/* Logo + Name */}
      <div className="flex items-center gap-3 px-4 py-5">
        <GereLogo />
        <div>
          <div className="text-white font-bold text-lg leading-none">GERE</div>
          <div className="text-xs leading-tight mt-0.5" style={{ color: '#82ab90' }}>
            Gestão de Requisições
          </div>
        </div>
      </div>

      <Separator className="bg-white/10 mx-4 my-1" style={{ width: 'calc(100% - 2rem)' }} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleGroups.map((group) => (
          <div key={group.title} className="mb-4">
            {group.title !== 'Painel' && (
              <p className="text-xs font-semibold uppercase tracking-wider px-2 mb-2" style={{ color: '#82ab90' }}>
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors group',
                      isActive
                        ? 'text-white font-medium'
                        : 'text-gray-300 hover:text-white'
                    )
                  }
                  style={({ isActive }) =>
                    isActive
                      ? { backgroundColor: '#2a593a' }
                      : undefined
                  }
                  onMouseEnter={(e) => {
                    const target = e.currentTarget
                    if (!target.style.backgroundColor || target.style.backgroundColor === 'transparent') {
                      target.style.backgroundColor = 'rgba(74, 137, 96, 0.15)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget
                    if (target.style.backgroundColor === 'rgba(74, 137, 96, 0.15)') {
                      target.style.backgroundColor = ''
                    }
                  }}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer with user info */}
      <Separator className="bg-white/10 mx-4" style={{ width: 'calc(100% - 2rem)' }} />
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 px-2 py-2 rounded-md">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
            style={{ backgroundColor: '#2a593a' }}
          >
            {user?.nome?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.nome ?? 'Usuário'}</p>
            <p className="text-xs truncate" style={{ color: '#82ab90' }}>
              {roleLabels[user?.role ?? 'requerente']}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10 shrink-0"
            onClick={handleLogout}
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
