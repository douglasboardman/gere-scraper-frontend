import { useLocation, Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, ChevronRight } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/contratacoes': 'Contratações',
  '/contratacoes/nova': 'Nova Contratação',
  '/atas': 'Atas de Registro de Preços',
  '/itens': 'Itens',
  '/fornecedores': 'Fornecedores',
  '/fornecimentos': 'Fornecimentos',
  '/requisicoes': 'Requisições',
  '/requisicoes/nova': 'Nova Requisição',
  '/unidades': 'Unidades',
  '/usuarios': 'Usuários',
  '/perfil': 'Meu Perfil',
}

function getBreadcrumb(pathname: string): Array<{ label: string; to?: string }> {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Array<{ label: string; to?: string }> = [
    { label: 'Início', to: '/dashboard' },
  ]

  let path = ''
  for (const segment of segments) {
    path += `/${segment}`
    const title = routeTitles[path]
    if (title) {
      crumbs.push({ label: title, to: path })
    }
  }

  return crumbs
}

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const crumbs = getBreadcrumb(location.pathname)
  const pageTitle = routeTitles[location.pathname] ?? 'GERE'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0 shadow-sm">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-1 text-sm">
        {crumbs.map((crumb, idx) => (
          <span key={crumb.to ?? idx} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            {idx === crumbs.length - 1 || !crumb.to ? (
              <span className="font-semibold text-foreground">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.to}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </div>

      {/* Right: user menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {user?.nome?.charAt(0).toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium max-w-[120px] truncate hidden sm:block">
              {user?.nome}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user?.nome}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/perfil')}>
            <User className="mr-2 h-4 w-4" />
            Meu Perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
