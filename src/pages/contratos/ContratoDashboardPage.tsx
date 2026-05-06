import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, differenceInDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ScrollText,
  Package,
  DollarSign,
  Upload,
  PackagePlus,
  RefreshCw,
  Zap,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { contratosApi } from '@/api/contratos.api'
import { unidadesApi } from '@/api/unidades.api'
import { useAuthStore } from '@/store/auth.store'
import { usePermission } from '@/hooks/usePermission'
import { formatCurrency } from '@/lib/utils'
import type { IContratoDashboard, IUnidade } from '@/types'

// ─── StatCard ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: number | string
  description: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  isLoading: boolean
  color?: string
}

function StatCard({ title, value, description, icon: Icon, isLoading, color = '#2a593a' }: StatCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-lg p-1.5" style={{ backgroundColor: `${color}18` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-3xl font-bold tabular-nums">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

// ─── ActionCard ──────────────────────────────────────────────────────────────

interface ActionCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  iconColor: string
  iconBg: string
  accentColor: string
  title: string
  description: string
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
  className?: string
}

function ActionCard({
  icon: Icon,
  iconColor,
  iconBg,
  accentColor,
  title,
  description,
  onClick,
  disabled,
  isLoading,
  className = '',
}: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-start gap-3 rounded-r-lg border border-l-[3px] bg-muted/30 p-3 text-left transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      style={{ borderLeftColor: accentColor }}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: iconBg }}>
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin" style={{ color: iconColor }} />
        ) : (
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        )}
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight" style={{ color: accentColor === '#f97316' ? '#ea580c' : undefined }}>
          {title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{description}</p>
      </div>
    </button>
  )
}

const ADMIN_UNIT_SESSION_KEY = 'contratos-dashboard-admin-unidade'

// ─── Page ────────────────────────────────────────────────────────────────────

export function ContratoDashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { isAdmin, isGestorUnidade, isGestorContratacoes, isGestorContratos } = usePermission()
  const isGestaoContratos = isGestorUnidade || isGestorContratacoes || isGestorContratos
  const podeAtualizarCache = isAdmin || isGestorUnidade || isGestorContratos

  const [selectedUnidade, setSelectedUnidade] = useState<IUnidade | null>(() => {
    if (!isAdmin) return null
    try {
      const stored = sessionStorage.getItem(ADMIN_UNIT_SESSION_KEY)
      return stored ? (JSON.parse(stored) as IUnidade) : null
    } catch {
      return null
    }
  })
  const [pickerOpen, setPickerOpen] = useState(isAdmin && selectedUnidade === null)

  const handleSelectUnidade = (unidade: IUnidade | null) => {
    setSelectedUnidade(unidade)
    setPickerOpen(false)
    if (unidade) {
      sessionStorage.setItem(ADMIN_UNIT_SESSION_KEY, JSON.stringify(unidade))
    } else {
      sessionStorage.removeItem(ADMIN_UNIT_SESSION_KEY)
    }
  }

  const { data: unidades, isLoading: loadingUnidades } = useQuery<IUnidade[]>({
    queryKey: ['unidades'],
    queryFn: unidadesApi.listar,
    enabled: isAdmin,
    staleTime: 10 * 60 * 1000,
  })

  const adminParams = isAdmin && selectedUnidade
    ? { uasg: selectedUnidade.uasg, identUnidade: selectedUnidade.identificador, codGestao: selectedUnidade.codGestao }
    : undefined

  const dashboardEnabled = isAdmin ? selectedUnidade !== null : true

  const { data, isLoading, isError } = useQuery<IContratoDashboard>({
    queryKey: ['contratos-dashboard', adminParams],
    queryFn: () => contratosApi.dashboard(adminParams),
    enabled: dashboardEnabled,
    staleTime: 5 * 60 * 1000,
  })

  const syncCodGestao = isAdmin
    ? selectedUnidade?.codGestao ?? ''
    : (user as any)?.unidade?.codGestao ?? ''

  const syncMutation = useMutation({
    mutationFn: () => contratosApi.sincronizarCache({ codGestao: syncCodGestao }),
    onSuccess: () => {
      toast.success('Cache atualizado com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['contratos-dashboard'] })
    },
    onError: (error: unknown) => {
      const msg =
        (error as any)?.response?.data?.message ??
        (error as any)?.response?.data?.error ??
        'Erro ao atualizar cache.'
      toast.error(msg)
    },
  })

  const ultimaSyncFormatada = data?.ultimaSyncCache
    ? format(parseISO(data.ultimaSyncCache), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : 'Nunca sincronizado'

  const subtitleUnidade = isAdmin && selectedUnidade
    ? `${selectedUnidade.nomeAbrev || selectedUnidade.nome} — UASG ${selectedUnidade.uasg}`
    : undefined

  return (
    <div>
      {/* Admin unit picker dialog */}
      {isAdmin && (
        <Dialog
          open={pickerOpen}
          onOpenChange={(open) => { if (selectedUnidade !== null) setPickerOpen(open) }}
        >
          <DialogContent
            className="sm:max-w-md"
            onInteractOutside={(e) => { if (selectedUnidade === null) e.preventDefault() }}
          >
            <DialogHeader>
              <DialogTitle>Selecionar Unidade</DialogTitle>
              <DialogDescription>
                Escolha a unidade para filtrar os dados do painel de contratos.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2">
              {loadingUnidades ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  defaultValue={selectedUnidade?.identificador}
                  onValueChange={(value) => {
                    const unidade = unidades?.find((u) => u.identificador === value) ?? null
                    handleSelectUnidade(unidade)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma unidade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades?.map((u) => (
                      <SelectItem key={u.identificador} value={u.identificador}>
                        {u.nomeAbrev || u.nome} — UASG {u.uasg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <PageHeader
        title="Dashboard de Contratos"
        subtitle={subtitleUnidade ?? 'Visão geral dos contratos da unidade'}
        actions={
          isAdmin && selectedUnidade ? (
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              <Building2 className="h-4 w-4 mr-1.5" />
              Selecionar Unidade
            </Button>
          ) : undefined
        }
      />

      {isError && (
        <div className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Não foi possível carregar os dados do dashboard. Tente recarregar a página.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <StatCard
          title="Contratos Disponíveis"
          value={data?.contratosDisponiveis ?? 0}
          description="com status Disponível"
          icon={ScrollText}
          isLoading={isLoading}
          color="#2a593a"
        />
        <StatCard
          title="Itens Disponíveis"
          value={data?.itensDisponiveis ?? 0}
          description="fornecimentos com contrato"
          icon={Package}
          isLoading={isLoading}
          color="#2563eb"
        />
        <StatCard
          title="Total Empenhado (12 m)"
          value={isLoading ? '-' : formatCurrency(data?.totalEmpenhado12m ?? 0)}
          description="requisições Empenhadas c/ contrato"
          icon={DollarSign}
          isLoading={isLoading}
          color="#b45309"
        />
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-6">

        {/* Contratos — Vigência */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contratos — Vigência</CardTitle>
            <CardDescription>Ordenado por vencimento (decrescente)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !data?.contratosVigencia.length ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum contrato disponível.</p>
            ) : (
              <div className="divide-y">
                {data.contratosVigencia.map((c) => {
                  const diasRestantes = c.fimVigencia
                    ? differenceInDays(parseISO(c.fimVigencia), new Date())
                    : null
                  const isProximo = diasRestantes !== null && diasRestantes <= 90
                  return (
                    <div key={c.identificador} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{c.numContrato}</p>
                        <p className="text-xs text-muted-foreground">{c.nomeFornecedor}</p>
                      </div>
                      {c.fimVigencia ? (
                        <Badge
                          variant="outline"
                          className={
                            isProximo
                              ? 'border-yellow-300 bg-yellow-50 text-yellow-800'
                              : 'border-green-300 bg-green-50 text-green-800'
                          }
                        >
                          {format(parseISO(c.fimVigencia), 'dd/MM/yyyy')}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Fornecedores */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Fornecedores — Empenho</CardTitle>
            <CardDescription>Maior valor em requisições empenhadas (12 meses)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !data?.topFornecedores.length ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum dado de empenho no período.</p>
            ) : (
              <div className="divide-y">
                {data.topFornecedores.map((f) => (
                  <div key={f.identFornecedor} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{f.nomeFornecedor}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.numRequisicoes} {f.numRequisicoes === 1 ? 'requisição' : 'requisições'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(f.totalEmpenho)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Acesso Rápido */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Acesso Rápido
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <ActionCard
              icon={ScrollText}
              iconColor="#2a593a"
              iconBg="#2a593a18"
              accentColor="#2a593a"
              title="Consultar Contratos"
              description="Lista todos os contratos da unidade"
              onClick={() => navigate('/contratos')}
            />
            {isGestaoContratos && (
              <>
                <ActionCard
                  icon={Upload}
                  iconColor="#2563eb"
                  iconBg="#2563eb18"
                  accentColor="#2563eb"
                  title="Importar Contrato"
                  description="Carrega um novo contrato via API"
                  onClick={() => navigate('/contratos/importar')}
                />
                <ActionCard
                  icon={PackagePlus}
                  iconColor="#7c3aed"
                  iconBg="#7c3aed18"
                  accentColor="#7c3aed"
                  title="Importar Itens"
                  description="Importa itens de um contrato existente"
                  onClick={() => navigate('/contratos/importar-itens')}
                />
              </>
            )}
          </div>

          {isGestaoContratos && (
            <>
              <Separator className="my-3" />
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {podeAtualizarCache && (
                  <ActionCard
                    icon={Zap}
                    iconColor="#f97316"
                    iconBg="#f9731618"
                    accentColor="#f97316"
                    title="Atualizar Cache de Contratos"
                    description={`Sincroniza com Portal da Transparência. Última sync: ${ultimaSyncFormatada}`}
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                    isLoading={syncMutation.isPending}
                    className="sm:col-span-2"
                  />
                )}
                <ActionCard
                  icon={RefreshCw}
                  iconColor="#f97316"
                  iconBg="#f9731618"
                  accentColor="#f97316"
                  title="Carregar Renovação"
                  description="Atualiza vigência de contrato renovado"
                  onClick={() => navigate('/contratos/carregar-renovacao')}
                  className={podeAtualizarCache ? '' : 'sm:col-span-3'}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
