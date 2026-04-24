import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Printer, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { requisicoesApi } from '@/api/requisicoes.api'
import { itemRequisicaoApi } from '@/api/itemRequisicao.api'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { destDespesaLabel } from '@/lib/utils'
import { usePermission } from '@/hooks/usePermission'
import type { IUsuario, IUnidade, IFornecimento, IItem } from '@/types'

export function RequisicaoViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAdmin } = usePermission()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const deletarMutation = useMutation({
    mutationFn: () => requisicoesApi.deletar(id!),
    onSuccess: () => {
      toast.success('Requisição excluída e saldos recalculados.')
      queryClient.invalidateQueries({ queryKey: ['requisicoes-unidade'] })
      navigate('/requisicoes')
    },
    onError: (error: unknown) => {
      toast.error(
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Erro ao excluir a requisição.'
      )
    },
  })

  const { data: requisicao, isLoading: loadingReq } = useQuery({
    queryKey: ['requisicao', id],
    queryFn: () => requisicoesApi.obter(id!),
    enabled: !!id,
  })

  const { data: itens = [], isLoading: loadingItens } = useQuery({
    queryKey: ['itens-requisicao', id],
    queryFn: () => itemRequisicaoApi.listar(id!),
    enabled: !!id,
  })

  if (loadingReq) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  if (!requisicao) {
    return <div className="p-6 text-muted-foreground">Requisição não encontrada.</div>
  }

  const requisitanteNome =
    typeof requisicao.requisitante === 'string'
      ? requisicao.requisitante
      : (requisicao.requisitante as IUsuario)?.nome ?? '—'

  const unidadeNome =
    typeof requisicao.identUnidade === 'string'
      ? requisicao.identUnidade
      : (requisicao.identUnidade as IUnidade)?.nomeAbrev ??
        (requisicao.identUnidade as IUnidade)?.nome ??
        '—'

  const canPrint = requisicao.status === 'Aprovada' || requisicao.status === 'Empenhada'
  const canDelete = isAdmin && (requisicao.status === 'Aprovada' || requisicao.status === 'Empenhada')

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div>
            <h1 className="text-xl font-semibold font-mono">{requisicao.identificador}</h1>
            <p className="text-sm text-muted-foreground">Visualização de Requisição</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={requisicao.status} />
          {canPrint && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/requisicoes/${requisicao.identificador}/imprimir`)}
            >
              <Printer className="h-4 w-4 mr-1" />
              Imprimir
            </Button>
          )}
          {canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir Requisição
            </Button>
          )}
        </div>
      </div>

      {/* Informações gerais */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Informações Gerais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Requisitante</p>
            <p className="text-sm font-medium">{requisitanteNome}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Unidade</p>
            <p className="text-sm font-medium">{unidadeNome}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Tipo</p>
            <p className="text-sm font-medium">{destDespesaLabel(requisicao.destDespesa)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Data de Criação</p>
            <p className="text-sm font-medium">
              {format(new Date(requisicao.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          {requisicao.dataEnvio && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Data de Envio</p>
              <p className="text-sm font-medium">
                {format(new Date(requisicao.dataEnvio), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
          )}
          {requisicao.dataAprovacao && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Data de Aprovação</p>
              <p className="text-sm font-medium">
                {format(new Date(requisicao.dataAprovacao), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
          )}
          {requisicao.dataRejeicao && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Data de Rejeição</p>
              <p className="text-sm font-medium">
                {format(new Date(requisicao.dataRejeicao), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
          )}
          {requisicao.valorTotal != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Valor Total</p>
              <p className="text-sm font-semibold" style={{ color: '#2a593a' }}>
                {requisicao.valorTotal.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
          )}
        </div>

        {requisicao.justificativa && (
          <div className="mt-5 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-1">Justificativa</p>
            <p className="text-sm whitespace-pre-wrap">{requisicao.justificativa}</p>
          </div>
        )}

        {(requisicao.observacoes ?? requisicao.observacao) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-1">Observações</p>
            <p className="text-sm whitespace-pre-wrap">
              {requisicao.observacoes ?? requisicao.observacao}
            </p>
          </div>
        )}

        {requisicao.motivoRejeicao && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-destructive mb-1">Motivo de Rejeição</p>
            <p className="text-sm text-destructive whitespace-pre-wrap">
              {requisicao.motivoRejeicao}
            </p>
          </div>
        )}
      </div>

      {/* Itens */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Itens da Requisição
        </h2>

        {loadingItens ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item adicionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">
                    Descrição / Fornecedor
                  </th>
                  <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground">
                    Qtd. Solicitada
                  </th>
                  <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground">
                    Valor Unitário
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-muted-foreground">
                    Valor Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => {
                  const forn =
                    typeof item.identFornecimento !== 'string'
                      ? (item.identFornecimento as IFornecimento)
                      : null
                  const itemData =
                    forn && typeof forn.identItem !== 'string'
                      ? (forn.identItem as IItem)
                      : null
                  const desc =
                    itemData?.descBreve ??
                    itemData?.descricaoBreve ??
                    itemData?.descDetalhada ??
                    (typeof item.identFornecimento === 'string' ? item.identFornecimento : '—')
                  const nomeForn = forn?.nomeFornecedor ?? '—'
                  const valUnit = item.valorUnitario ?? forn?.valorUnitario ?? forn?.valUnitHomologado ?? 0
                  const valTotal = item.valorTotal ?? valUnit * item.quantidadeSolicitada

                  return (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{desc}</p>
                        <p className="text-xs text-muted-foreground">{nomeForn}</p>
                        {item.observacao && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">
                            {item.observacao}
                          </p>
                        )}
                      </td>
                      <td className="text-right py-3 pr-4 font-mono">
                        {item.quantidadeSolicitada}
                      </td>
                      <td className="text-right py-3 pr-4 font-mono">
                        {valUnit > 0
                          ? valUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '—'}
                      </td>
                      <td className="text-right py-3 font-mono">
                        {valTotal > 0
                          ? valTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {requisicao.valorTotal != null && (
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-4 pr-4 text-right text-sm font-medium">
                      Total Geral
                    </td>
                    <td className="pt-4 text-right font-semibold font-mono" style={{ color: '#2a593a' }}>
                      {requisicao.valorTotal.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {canDelete && (
        <ConfirmDialog
          open={confirmDeleteOpen}
          title="Excluir Requisição"
          description={`Tem certeza que deseja excluir a requisição ${requisicao.identificador}?\n\nEsta ação não pode ser desfeita. Os saldos de todos os fornecimentos arrolados nesta requisição serão recalculados (estornados).`}
          confirmLabel="Excluir Requisição"
          variant="destructive"
          isLoading={deletarMutation.isPending}
          onConfirm={() => deletarMutation.mutate()}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}
    </div>
  )
}
