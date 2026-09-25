import { useLocation, Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, User, LogOut, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
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
import { notificacoesApi } from '@/api/notificacoes.api'
import { qk } from '@/lib/query-keys'

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
  '/notificacoes/admin': 'Notificações',
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

  const { data: resumo } = useQuery({
    queryKey: qk.notificacoes.resumo,
    queryFn: () => notificacoesApi.resumo(),
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
  const recentesQuery = useQuery({
    queryKey: qk.notificacoes.recentes,
    queryFn: () => notificacoesApi.listar({ estado: 'todas', limite: 10 }),
    enabled: !!user,
    staleTime: 30_000,
  })
  // `importantesNaoLidas` é subconjunto de `naoLidas`; o máximo também
  // preserva o aviso visual durante uma atualização concorrente do resumo.
  const naoLidas = Math.max(resumo?.naoLidas ?? 0, resumo?.importantesNaoLidas ?? 0)

  const crumbs = getBreadcrumb(location.pathname)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 border-b bg-white/95 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 shadow-sm">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-1 text-sm">
        {crumbs.map((crumb, idx) => (
          <span key={crumb.to ?? idx} className="flex items-center gap-1.5">
            {idx > 0 && (
              <span className="text-muted-foreground/40 select-none text-xs">/</span>
            )}
            {idx === crumbs.length - 1 || !crumb.to ? (
              <span className="font-semibold text-foreground">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.to}
                className="text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </div>

      {/* Right: notifications and user menu */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={naoLidas ? `${naoLidas} notificações não lidas` : 'Notificações'}
              className="relative h-9 w-9 hover:bg-muted/60 hover:text-foreground transition-colors duration-150"
            >
              <Bell className="h-4 w-4" />
              {!!naoLidas && (
                <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" aria-hidden="true" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-semibold">Notificações</p>
              <p className="text-xs text-muted-foreground">
                {naoLidas ? `${naoLidas} não lida(s)` : 'Nenhuma não lida'}
                {resumo?.importantesNaoLidas ? ` · ${resumo.importantesNaoLidas} importante(s)` : ''}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recentesQuery.isLoading && (
              <DropdownMenuItem disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando mensagens...</DropdownMenuItem>
            )}
            {!recentesQuery.isLoading && !recentesQuery.isError && !recentesQuery.data?.itens.length && (
              <DropdownMenuItem disabled>Nenhuma mensagem recente</DropdownMenuItem>
            )}
            {recentesQuery.data?.itens.filter((item) => !item.arquivada).slice(0, 10).map((item) => (
              <DropdownMenuItem key={item.id} onClick={() => navigate(`/perfil?aba=notificacoes&mensagem=${encodeURIComponent(item.id)}`)} className="group items-start gap-2 py-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full transition-colors ${item.lida ? 'bg-muted-foreground/30 group-focus:bg-accent-foreground/60' : 'bg-primary group-focus:bg-accent-foreground'}`} />
                <span className="min-w-0">
                  <span className={`block truncate text-sm ${item.lida ? 'font-normal' : 'font-semibold'}`}>{item.titulo ?? 'Notificação'}</span>
                  <span className="block text-xs text-muted-foreground transition-colors group-focus:text-accent-foreground/80">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.disponibilizadaEm))}</span>
                </span>
              </DropdownMenuItem>
            ))}
            {recentesQuery.isError && <DropdownMenuItem disabled>Não foi possível carregar as mensagens.</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/perfil?aba=notificacoes')}>
              <Bell className="mr-2 h-4 w-4" />
              Abrir central de notificações
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-9 px-2 hover:bg-muted/60 hover:text-foreground transition-colors duration-150">
            <Avatar className="h-7 w-7 ring-1 ring-border">
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
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
