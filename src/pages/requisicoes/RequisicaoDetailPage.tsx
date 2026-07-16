import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIdParam } from '@/hooks/useIdParam'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Send, Pencil, Printer, Trash2,
} from 'lucide-react'
import { requisicoesApi } from '@/api/requisicoes.api'
import { itemRequisicaoApi } from '@/api/itemRequisicao.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { useAuthStore } from '@/store/auth.store'
import { formatCurrency, formatQtd, destDespesaLabel } from '@/lib/utils'
import type { IItemRequisicao, IFornecimento, IUnidade, IUorg, IUsuario } from '@/types'
import { extrairIdContratacao, getItemName, getFornecedorName } from './utils/requisicaoUtils'
import { EditItemDialog } from './components/EditItemDialog'
import { AddItemsDialog } from './components/AddItemsDialog'
import { EditRequisicaoDialog } from './components/EditRequisicaoDialog'

export function RequisicaoDetailPage() {
  const id = useIdParam()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [actionDialog, setActionDialog] = useState<'enviar' | null>(null)
  const [conflitoPendente, setConflitoPendente] = useState<{
    conflitos: Array<{
      identFornecimento: string
      descricaoItem: string
      qtdSolicitadaAtual: number
      qtdComprometida: number
      saldoDisponivel: number
      requisicoesConcorrentes: Array<{ identificador: string; nomeRequisitante: string }>
    }>
  } | null>(null)
  const [editItemTarget, setEditItemTarget] = useState<IItemRequisicao | null>(null)
  const [addItemsOpen, setAddItemsOpen] = useState(false)
  const [editReqOpen, setEditReqOpen] = useState(false)

  const { data: requisicao, isLoading } = useQuery({
    queryKey: ['requisicao', id],
    queryFn: () => requisicoesApi.obter(id!),
    enabled: !!id,
  })

  const { data: itensRequisicao = [], isLoading: loadingItens } = useQuery({
    queryKey: ['itens-requisicao', requisicao?.identificador],
    queryFn: () => itemRequisicaoApi.listar(requisicao!.identificador),
    enabled: !!requisicao?.identificador,
  })

  const enviarMutation = useMutation({
    mutationFn: () => requisicoesApi.enviar(id!),
    onSuccess: () => {
      toast.success('Requisição enviada para aprovação.')
      queryClient.invalidateQueries({ queryKey: ['requisicao', id] })
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      setActionDialog(null)
      navigate('/requisicoes/minhas_requisicoes')
    },
    onError: (error: unknown) => {
      type ConflitosItem = { identFornecimento: string; descricaoItem: string; qtdSolicitadaAtual: number; qtdComprometida: number; saldoDisponivel: number; requisicoesConcorrentes: Array<{ identificador: string; nomeRequisitante: string }> }
      const axiosErr = error as { response?: { status?: number; data?: { message?: string; error?: string; conflitos?: ConflitosItem[] } } }
      const conflitos = axiosErr.response?.data?.conflitos
      if (axiosErr.response?.status === 409 && conflitos?.length) {
        setConflitoPendente({ conflitos })
        setActionDialog(null)
      } else {
        const msg = axiosErr.response?.data?.message ?? axiosErr.response?.data?.error ?? 'Erro inesperado'
        toast.error(msg, { duration: 8000 })
        setActionDialog(null)
      }
    },
  })

  const confirmarCienciaMutation = useMutation({
    mutationFn: (novasObservacoes: string) =>
      requisicoesApi.atualizar(id!, { observacoes: novasObservacoes }),
    onSuccess: () => {
      toast.info('Requisição mantida como rascunho. O conflito foi registrado nas observações.')
      queryClient.invalidateQueries({ queryKey: ['requisicao', id] })
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      setConflitoPendente(null)
    },
    onError: () => {
      toast.error('Erro ao salvar a anotação de conflito.')
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => itemRequisicaoApi.deletar(itemId),
    onSuccess: () => {
      toast.success('Item removido.')
      queryClient.invalidateQueries({ queryKey: ['itens-requisicao', requisicao?.identificador] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!requisicao) return <div>Requisição não encontrada.</div>

  const isOwner = requisicao.identRequisitante === user?.id

  const canEdit = isOwner && (requisicao.status === 'Rascunho' || requisicao.status === 'Rejeitada')
  const canSend = isOwner && (requisicao.status === 'Rascunho' || requisicao.status === 'Rejeitada') && itensRequisicao.length > 0

  const valorTotal = itensRequisicao.reduce((sum, item) => sum + (item.valTotal ?? 0), 0)

  const unidade = typeof requisicao.identUnidade === 'string' ? null : (requisicao.identUnidade as IUnidade)
  const uorg = requisicao.uorg as IUorg | undefined
  const userUasg = unidade?.uasg ?? ''

  const contratacaoIdStr = (() => {
    if (requisicao.identContratacao) return requisicao.identContratacao
    if (itensRequisicao.length === 0) return null
    const f = itensRequisicao[0].identFornecimento
    const fIdent = typeof f === 'string' ? f : (f as IFornecimento).identificador
    return extrairIdContratacao(fIdent)
  })()

  const requisitanteLabel = (() => {
    const r = requisicao.requisitante as IUsuario
    if (typeof r === 'string') return r
    return r?.nome ?? '—'
  })()

  const unidadeLabel = unidade
    ? `${unidade.uasg} — ${unidade.nomeAbrev ?? unidade.nome}`
    : (typeof requisicao.identUnidade === 'string' ? requisicao.identUnidade : '—')

  const uorgLabel = uorg
    ? `${uorg.sigla ? uorg.sigla + ' — ' : ''}${uorg.nome}`
    : (requisicao.identUorg ?? '—')

  return (
    <div>
      <PageHeader
        title={`Requisição ${requisicao.identificador}`}
        subtitle={`Criada em ${format(new Date(requisicao.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/requisicoes/minhas_requisicoes')}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            {requisicao.status === 'Aprovada' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/requisicoes/imprimir?id=${encodeURIComponent(requisicao.identificador)}`)}
                title="Imprimir PDF"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
            )}
            {canSend && (
              <Button
                size="sm"
                className="gap-1 bg-green-700 hover:bg-green-800 text-white"
                onClick={() => setActionDialog('enviar')}
              >
                <Send className="h-4 w-4" />
                Enviar
              </Button>
            )}
          </div>
        }
      />

      {/* Header card */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Dados da Requisição</CardTitle>
            <div className="flex items-center gap-3">
              <StatusBadge status={requisicao.status} />
              {valorTotal > 0 && (
                <p className="text-sm font-bold text-green-700">{formatCurrency(valorTotal)}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Requisitante</span>
              <p className="font-medium">{requisitanteLabel}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Unidade (UASG)</span>
              <p className="font-medium">{unidadeLabel}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Setor / UORG</span>
              <p className="font-medium">{uorgLabel}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tipo</span>
              <p className="font-medium">{destDespesaLabel(requisicao.destDespesa)}</p>
            </div>
            {requisicao.justificativa && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Justificativa</span>
                <p className="font-medium whitespace-pre-wrap">{requisicao.justificativa}</p>
              </div>
            )}
            {(requisicao.observacoes || requisicao.observacao) && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Observação</span>
                <p className="font-medium">{requisicao.observacoes ?? requisicao.observacao}</p>
              </div>
            )}
            {requisicao.motivoRejeicao && (
              <div className="col-span-2">
                <span className="text-muted-foreground text-destructive">Motivo de Rejeição</span>
                <p className="font-medium text-destructive">{requisicao.motivoRejeicao}</p>
              </div>
            )}
          </div>

          {canEdit && (
            <div className="flex items-center justify-end mt-4 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setEditReqOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Itens da Requisição</CardTitle>
          {canEdit && (
            <Button size="sm" onClick={() => setAddItemsOpen(true)}>
              <Plus className="h-4 w-4" />
              Adicionar Itens
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingItens ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Item / Fornecimento</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Qtd Solicitada</TableHead>
                  <TableHead className="text-right">Valor Unit.</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  {canEdit && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensRequisicao.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canEdit ? 6 : 5}
                      className="text-center text-muted-foreground py-8"
                    >
                      Nenhum item adicionado.{' '}
                      {canEdit && 'Clique em "Adicionar Itens" para incluir.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  itensRequisicao.map((item: IItemRequisicao) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm font-medium">{getItemName(item)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getFornecedorName(item)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatQtd(item.qtdSolicitada)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.valUnitario != null ? formatCurrency(item.valUnitario) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {item.valTotal != null ? formatCurrency(item.valTotal) : '—'}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Editar quantidade"
                              onClick={() => setEditItemTarget(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              title="Remover item"
                              onClick={() => removeItemMutation.mutate(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
              {valorTotal > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-semibold">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(valorTotal)}
                    </TableCell>
                    {canEdit && <TableCell />}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Workflow action dialogs */}
      {actionDialog === 'enviar' && (
        <ConfirmDialog
          open
          title="Enviar Requisição"
          description="Deseja enviar esta requisição para aprovação? Após o envio, não será possível editar os itens."
          confirmLabel="Enviar"
          variant="default"
          isLoading={enviarMutation.isPending}
          onConfirm={() => enviarMutation.mutate()}
          onCancel={() => setActionDialog(null)}
        />
      )}

      {conflitoPendente && (
        <Dialog open onOpenChange={() => setConflitoPendente(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Conflito de Saldo Detectado</DialogTitle>
              <DialogDescription>
                Os itens abaixo possuem saldo bloqueado por requisições da sua unidade já enviadas e pendentes de aprovação.
                A requisição será salva como rascunho para que você possa resolver o conflito antes de tentar o envio novamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm max-h-60 overflow-y-auto">
              {conflitoPendente.conflitos.map((c) => (
                <div key={c.identFornecimento} className="rounded-md border p-3 space-y-1">
                  <p className="font-medium">{c.descricaoItem}</p>
                  <p className="text-muted-foreground text-xs">Fornecimento: {c.identFornecimento}</p>
                  <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                    <div><span className="text-muted-foreground">Saldo disponível</span><br />{formatQtd(c.saldoDisponivel)}</div>
                    <div><span className="text-muted-foreground">Comprometido</span><br />{formatQtd(c.qtdComprometida)}</div>
                    <div><span className="text-muted-foreground">Solicitado aqui</span><br />{formatQtd(c.qtdSolicitadaAtual)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p className="font-medium">Requisições concorrentes:</p>
                    {c.requisicoesConcorrentes.map((r) => (
                      <p key={r.identificador}>{r.identificador} — {r.nomeRequisitante}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConflitoPendente(null)} disabled={confirmarCienciaMutation.isPending}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  const INICIO = '[ANOTAÇÃO AUTOMÁTICA DO SISTEMA - INÍCIO]'
                  const FIM = '[ANOTAÇÃO AUTOMÁTICA DO SISTEMA - FIM]'
                  const dataHora = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  const detalhes = conflitoPendente.conflitos.map((c) =>
                    `"${c.descricaoItem}" (fornecimento: ${c.identFornecimento}) — saldo disponível: ${c.saldoDisponivel}, comprometido: ${c.qtdComprometida}, solicitado aqui: ${c.qtdSolicitadaAtual} (concorrentes: ${c.requisicoesConcorrentes.map((r) => `${r.identificador} [${r.nomeRequisitante}]`).join(', ')})`
                  ).join('; ')
                  const conteudo = `Em ${dataHora}, o sistema detectou conflito de saldo ao tentar enviar esta requisição. Os seguintes fornecimentos possuem saldo insuficiente em razão de outras requisições enviadas pendentes de aprovação: ${detalhes}. A requisição foi mantida como rascunho para que o conflito seja resolvido antes de nova tentativa de envio.`
                  const bloco = `${INICIO}\n${conteudo}\n${FIM}`
                  const atual = (requisicao.observacoes ?? requisicao.observacao ?? '').trim()
                  const idxI = atual.indexOf(INICIO)
                  const idxF = atual.indexOf(FIM)
                  let novas: string
                  if (idxI !== -1 && idxF !== -1) {
                    const antes = atual.slice(0, idxI).trimEnd()
                    const depois = atual.slice(idxF + FIM.length).trimStart()
                    novas = [antes, bloco, depois].filter(Boolean).join('\n')
                  } else {
                    novas = atual ? `${atual}\n${bloco}` : bloco
                  }
                  confirmarCienciaMutation.mutate(novas)
                }}
                disabled={confirmarCienciaMutation.isPending}
              >
                Entendi, salvar como rascunho
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {editItemTarget && (
        <EditItemDialog
          item={editItemTarget}
          open={!!editItemTarget}
          onOpenChange={(v) => { if (!v) setEditItemTarget(null) }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['itens-requisicao', requisicao.identificador] })
          }}
        />
      )}

      {addItemsOpen && (
        <AddItemsDialog
          open={addItemsOpen}
          onOpenChange={setAddItemsOpen}
          existingItems={itensRequisicao}
          contratacaoIdStr={contratacaoIdStr}
          userUasg={userUasg}
          requisicaoIdentificador={requisicao.identificador}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['itens-requisicao', requisicao.identificador] })
          }}
        />
      )}

      {editReqOpen && (
        <EditRequisicaoDialog
          requisicao={requisicao}
          open={editReqOpen}
          onOpenChange={setEditReqOpen}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['requisicao', id] })
          }}
        />
      )}
    </div>
  )
}
