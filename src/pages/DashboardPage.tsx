import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Gavel,
  FileText,
  ArrowLeftRight,
  ClipboardList,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { contratacoesApi } from '@/api/contratacoes.api'
import { atasApi } from '@/api/atas.api'
import { fornecimentosApi } from '@/api/fornecimentos.api'
import { requisicoesApi } from '@/api/requisicoes.api'
import { useAuthStore } from '@/store/auth.store'
import type { IRequisicao } from '@/types'

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div
          className="h-8 w-8 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold text-foreground">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const { data: compras, isLoading: loadingCompras } = useQuery({
    queryKey: ['contratacoes'],
    queryFn: contratacoesApi.listar,
  })

  const { data: atas, isLoading: loadingAtas } = useQuery({
    queryKey: ['atas'],
    queryFn: () => atasApi.listar(),
  })

  const { data: fornecimentos, isLoading: loadingFornecimentos } = useQuery({
    queryKey: ['fornecimentos'],
    queryFn: () => fornecimentosApi.listar(),
  })

  const { data: requisicoes, isLoading: loadingRequisicoes } = useQuery({
    queryKey: ['requisicoes'],
    queryFn: requisicoesApi.listar,
  })

  const comprasEmProcessamento = compras?.filter((c) => c.status === 'Em_Processamento') ?? []
  const atasVigentes = atas?.filter((a) => a.status === 'Processada') ?? []
  const fornecimentosHomologados = fornecimentos?.filter((f) => f.status === 'Homologado') ?? []
  const requisicoesAbertas = requisicoes?.filter(
    (r) => r.status === 'Enviada' || r.status === 'Rascunho'
  ) ?? []

  const recentRequisicoes = (requisicoes ?? []).slice(0, 5)

  return (
    <div>
      <PageHeader
        title={`Olá, ${user?.nome?.split(' ')[0] ?? 'Usuário'}`}
        subtitle="Aqui está um resumo do sistema"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total de Contratações"
          value={loadingCompras ? '-' : (compras?.length ?? 0)}
          description="Contratações cadastradas"
          icon={Gavel}
          isLoading={loadingCompras}
          color="#2a593a"
        />
        <StatCard
          title="Atas Vigentes"
          value={loadingAtas ? '-' : atasVigentes.length}
          description="Atas com status Processada"
          icon={FileText}
          isLoading={loadingAtas}
          color="#4b8960"
        />
        <StatCard
          title="Fornecimentos Disponíveis"
          value={loadingFornecimentos ? '-' : fornecimentosHomologados.length}
          description="Homologados com saldo"
          icon={ArrowLeftRight}
          isLoading={loadingFornecimentos}
          color="#82ab90"
        />
        <StatCard
          title="Requisições Abertas"
          value={loadingRequisicoes ? '-' : requisicoesAbertas.length}
          description="Rascunho ou Enviadas"
          icon={ClipboardList}
          isLoading={loadingRequisicoes}
          color="#b45309"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requisitions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requisições Recentes</CardTitle>
            <CardDescription>Últimas 5 requisições no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRequisicoes ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recentRequisicoes.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <ClipboardList className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Nenhuma requisição encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRequisicoes.map((req: IRequisicao) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{req.identificador}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(req.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contratações em processamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contratações em Processamento</CardTitle>
            <CardDescription>Aguardando importação de dados</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCompras ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : comprasEmProcessamento.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Nenhuma contratação em processamento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comprasEmProcessamento.map((compra) => (
                  <div
                    key={compra.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{compra.identificador}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {compra.objeto ?? compra.nomeUnGestora ?? 'Sem descrição'}
                      </p>
                    </div>
                    <StatusBadge status={compra.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
