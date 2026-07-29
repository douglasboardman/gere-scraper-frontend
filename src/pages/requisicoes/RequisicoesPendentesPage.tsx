import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ClipboardCheck, Search, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { destDespesaLabel } from '@/lib/utils'
import { qk } from '@/lib/query-keys'
import { requisicoesApi } from '@/api/requisicoes.api'
import { getApiErrorMessage } from '@/lib/api-error'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { IRequisicao, IUsuario } from '@/types'

function getRequisitanteName(req: IRequisicao): string {
  const r = req.requisitante
  if (typeof r === 'string') return r
  return (r as IUsuario)?.nome ?? '—'
}

export function RequisicoesPendentesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [confirmDevolver, setConfirmDevolver] = useState<string | null>(null)

  const { data: todasRequisicoes = [], isLoading } = useQuery({
    queryKey: qk.requisicoes.all,
    queryFn: () => requisicoesApi.listar(),
  })

  const devolverMutation = useMutation({
    mutationFn: (identificador: string) => requisicoesApi.devolver(identificador),
    onSuccess: () => {
      toast.success('Requisição devolvida para edição.')
      queryClient.invalidateQueries({ queryKey: qk.requisicoes.all })
      setConfirmDevolver(null)
    },
    onError: (e: unknown) => {
      toast.error(getApiErrorMessage(e, 'Erro ao devolver requisição.'))
      setConfirmDevolver(null)
    },
  })

  // Apenas Enviadas cuja contratação esteja Disponivel (ou sem contratação)
  const pendentes = todasRequisicoes.filter((r) => {
    if (r.status !== 'Enviada') return false;
    const sp = (r as any).statusParticipacao as string | null | undefined;
    return !sp || sp === 'Disponivel';
  })

  const filtered = search.trim()
    ? pendentes.filter((r) =>
        r.identificador.toLowerCase().includes(search.toLowerCase()) ||
        getRequisitanteName(r).toLowerCase().includes(search.toLowerCase()) ||
        (r.justificativa ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : pendentes

  return (
    <div>
      <PageHeader
        title="Requisições para Análise"
        subtitle={`${pendentes.length} requisição(ões) aguardando análise`}
      />

      {/* Busca */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por identificador, requisitante..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <ClipboardCheck className="h-12 w-12 opacity-30" />
          <p className="text-base">
            {search ? 'Nenhuma requisição encontrada.' : 'Nenhuma requisição pendente de análise.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <RequisicaoPendenteCard
              key={req.identificador}
              req={req}
              onAnalisar={() => navigate(`/requisicoes/analise?id=${encodeURIComponent(req.identificador)}`)}
              onDevolver={() => setConfirmDevolver(req.identificador)}
              isDevolverPending={devolverMutation.isPending && confirmDevolver === req.identificador}
            />
          ))}
        </div>
      )}

      {confirmDevolver && (
        <ConfirmDialog
          open
          title="Devolver Requisição para Edição"
          description={`Deseja devolver a requisição "${confirmDevolver}" para rascunho? O requisitante poderá editá-la e reenviar.`}
          confirmLabel="Devolver"
          variant="default"
          isLoading={devolverMutation.isPending}
          onConfirm={() => devolverMutation.mutate(confirmDevolver)}
          onCancel={() => setConfirmDevolver(null)}
        />
      )}
    </div>
  )
}

interface CardProps {
  req: IRequisicao
  onAnalisar: () => void
  onDevolver: () => void
  isDevolverPending: boolean
}

function RequisicaoPendenteCard({ req, onAnalisar, onDevolver, isDevolverPending }: CardProps) {
  return (
    <div className="border rounded-lg p-5 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        {/* Dados principais */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm font-semibold">{req.identificador}</span>
            <span className="text-xs px-2 py-0.5 rounded-full border border-amber-400 text-amber-700 bg-amber-50 font-medium">
              {destDespesaLabel(req.destDespesa)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Requisitante</span>
              <p className="font-medium">{getRequisitanteName(req)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Setor / UORG</span>
              <p className="font-medium">{req.uorg?.nome ?? req.identUorg ?? '—'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Data de Criação</span>
              <p>{format(new Date(req.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Data de Envio</span>
              <p>
                {req.dataEnvio
                  ? format(new Date(req.dataEnvio), 'dd/MM/yyyy', { locale: ptBR })
                  : '—'}
              </p>
            </div>
          </div>

          {req.justificativa && (
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Justificativa</span>
              <p className="text-sm mt-0.5 line-clamp-2 text-muted-foreground">{req.justificativa}</p>
            </div>
          )}
        </div>

        {/* Botões de ação */}
        <div className="shrink-0 flex flex-col gap-2">
          <Button
            onClick={onAnalisar}
            className="gap-2 bg-[#2a593a] hover:bg-[#1e4229] text-white"
          >
            <ClipboardCheck className="h-4 w-4" />
            Analisar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-amber-700 border-amber-400 hover:bg-amber-50 hover:text-amber-800"
            disabled={isDevolverPending}
            onClick={onDevolver}
          >
            <Undo2 className="h-4 w-4" />
            Devolver para Edição
          </Button>
        </div>
      </div>
    </div>
  )
}
