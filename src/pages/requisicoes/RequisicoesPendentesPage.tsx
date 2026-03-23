import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ClipboardCheck, Search } from 'lucide-react'
import { useState } from 'react'
import { tipoRequisicaoLabel } from '@/lib/utils'
import { requisicoesApi } from '@/api/requisicoes.api'
import { PageHeader } from '@/components/shared/PageHeader'
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
  const [search, setSearch] = useState('')

  const { data: todasRequisicoes = [], isLoading } = useQuery({
    queryKey: ['requisicoes'],
    queryFn: requisicoesApi.listar,
  })

  // Apenas as Enviadas aguardando análise
  const pendentes = todasRequisicoes.filter((r) => r.status === 'Enviada')

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
              key={req.id}
              req={req}
              onAnalisar={() => navigate(`/requisicoes/analise/${req.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface CardProps {
  req: IRequisicao
  onAnalisar: () => void
}

function RequisicaoPendenteCard({ req, onAnalisar }: CardProps) {
  return (
    <div className="border rounded-lg p-5 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        {/* Dados principais */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm font-semibold">{req.identificador}</span>
            <span className="text-xs px-2 py-0.5 rounded-full border border-amber-400 text-amber-700 bg-amber-50 font-medium">
              {tipoRequisicaoLabel(req.tipo)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Requisitante</span>
              <p className="font-medium">{getRequisitanteName(req)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Setor / UORG</span>
              <p className="font-medium">{req.uorg_key ?? '—'}</p>
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

        {/* Botão Analisar */}
        <div className="shrink-0">
          <Button
            onClick={onAnalisar}
            className="gap-2 bg-[#2a593a] hover:bg-[#1e4229] text-white"
          >
            <ClipboardCheck className="h-4 w-4" />
            Analisar
          </Button>
        </div>
      </div>
    </div>
  )
}
