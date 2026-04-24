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
import { contratosApi } from '@/api/contratos.api'
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
  delay?: number
}

function StatCard({ title, value, description, icon: Icon, isLoading, color = '#2a593a', delay = 0 }: StatCardProps) {
  return (
    <Card
      className="hover:shadow-md transition-shadow duration-200 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${color}20 0%, ${color}35 100%)`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold text-foreground tabular-nums">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const { data: contratacoes, isLoading: loadingContratacoes } = useQuery({
    queryKey: ['contratacoes'],
    queryFn: contratacoesApi.listar,
  })

  const { data: contratos, isLoading: loadingContratos } = useQuery({
    queryKey: ['contratos'],
    queryFn: () => contratosApi.listar(),
  })

  const { data: fornecimentos, isLoading: loadingFornecimentos } = useQuery({
    queryKey: ['fornecimentos'],
    queryFn: () => fornecimentosApi.listar(),
  })

  const { data: requisicoes, isLoading: loadingRequisicoes } = useQuery({
    queryKey: ['requisicoes'],
    queryFn: () => requisicoesApi.listar(),
  })

  const contratacoesEmAnalise = contratacoes?.filter(
    (c) => c.status === 'Em_Processamento' || c.status === 'Processada'
  ) ?? []
  const contratacoesDisponiveis = contratacoes?.filter((c) => c.status === 'Disponivel') ?? []
  const contratosVigentes = contratos?.filter((c) => c.status === 'Disponivel') ?? []
  const fornecimentosDisponiveis = fornecimentos?.filter((f) => f.status === 'Disponivel') ?? []
  const requisicoesExpedidas = requisicoes?.filter(
    (r) => r.status === 'Enviada' || r.status === 'Aprovada' || r.status === 'Empenhada'
  ) ?? []

  const recentRequisicoes = (requisicoes ?? [])
    .filter((r) => r.status !== 'Rascunho')
    .slice(0, 5)

  return (
    <div>
      <PageHeader
        title={`Olá, ${user?.nome?.split(' ')[0] ?? 'Usuário'}`}
        subtitle="Aqui está um resumo do sistema"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Contratações Disponíveis"
          value={loadingContratacoes ? '-' : contratacoesDisponiveis.length}
          description="Contratações com status Disponível"
          icon={Gavel}
          isLoading={loadingContratacoes}
          color="#2a593a"
          delay={0}
        />
        <StatCard
          title="Contratos Vigentes"
          value={loadingContratos ? '-' : contratosVigentes.length}
          description="Contratos com status Disponível"
          icon={FileText}
          isLoading={loadingContratos}
          color="#4b8960"
          delay={50}
        />
        <StatCard
          title="Fornecimentos Disponíveis"
          value={loadingFornecimentos ? '-' : fornecimentosDisponiveis.length}
          description="Homologados com saldo"
          icon={ArrowLeftRight}
          isLoading={loadingFornecimentos}
          color="#82ab90"
          delay={100}
        />
        <StatCard
          title="Requisições Expedidas"
          value={loadingRequisicoes ? '-' : requisicoesExpedidas.length}
          description="Enviadas, Aprovadas ou Empenhadas"
          icon={ClipboardList}
          isLoading={loadingRequisicoes}
          color="#b45309"
          delay={150}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
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
              <div className="space-y-1">
                {recentRequisicoes.map((req: IRequisicao) => (
                  <div
                    key={req.identificador}
                    className="flex items-center justify-between py-2.5 px-2 border-b last:border-0 rounded-sm hover:bg-muted/30 transition-colors duration-100 cursor-default"
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
            <CardDescription>Em análise para disponibilização</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingContratacoes ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : contratacoesEmAnalise.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Nenhuma contratação em processamento</p>
              </div>
            ) : (
              <div className="space-y-1">
                {contratacoesEmAnalise.map((contratacao) => (
                  <div
                    key={contratacao.identificador}
                    className="flex items-center justify-between py-2.5 px-2 border-b last:border-0 rounded-sm hover:bg-muted/30 transition-colors duration-100 cursor-default"
                  >
                    <div>
                      <p className="text-sm font-medium">{contratacao.identificador}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {contratacao.objeto ?? contratacao.nomeUnGestora ?? 'Sem descrição'}
                      </p>
                    </div>
                    <StatusBadge status={contratacao.status} />
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
