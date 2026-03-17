import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Send, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { requisicoesApi } from '@/api/requisicoes.api'
import { itemRequisicaoApi } from '@/api/itemRequisicao.api'
import { fornecimentosApi } from '@/api/fornecimentos.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { usePermission } from '@/hooks/usePermission'
import { formatCurrency } from '@/lib/utils'
import type { IItemRequisicao, IFornecimento, IItem, IFornecedor, IUsuario, IUnidade } from '@/types'

export function RequisicaoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { isAdmin, isGestor } = usePermission()
  const [actionDialog, setActionDialog] = useState<'enviar' | 'aprovar' | 'rejeitar' | null>(null)
  const [addItemDialog, setAddItemDialog] = useState(false)
  const [selectedFornecimento, setSelectedFornecimento] = useState('')
  const [qtdSolicitada, setQtdSolicitada] = useState('')

  const { data: requisicao, isLoading } = useQuery({
    queryKey: ['requisicao', id],
    queryFn: () => requisicoesApi.obter(id!),
    enabled: !!id,
  })

  const { data: itensRequisicao = [], isLoading: loadingItens } = useQuery({
    queryKey: ['itens-requisicao', id],
    queryFn: () => itemRequisicaoApi.listar(id),
    enabled: !!id,
  })

  const { data: fornecimentos = [] } = useQuery({
    queryKey: ['fornecimentos'],
    queryFn: () => fornecimentosApi.listar(),
  })

  const enviarMutation = useMutation({
    mutationFn: () => requisicoesApi.enviar(id!),
    onSuccess: () => {
      toast.success('Requisição enviada para aprovação.')
      queryClient.invalidateQueries({ queryKey: ['requisicao', id] })
      setActionDialog(null)
    },
    onError: (error: unknown) => {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado')
    },
  })

  const aprovarMutation = useMutation({
    mutationFn: () => requisicoesApi.aprovar(id!),
    onSuccess: () => {
      toast.success('Requisição aprovada.')
      queryClient.invalidateQueries({ queryKey: ['requisicao', id] })
      setActionDialog(null)
    },
    onError: (error: unknown) => {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado')
    },
  })

  const rejeitarMutation = useMutation({
    mutationFn: () => requisicoesApi.rejeitar(id!),
    onSuccess: () => {
      toast.success('Requisição rejeitada.')
      queryClient.invalidateQueries({ queryKey: ['requisicao', id] })
      setActionDialog(null)
    },
    onError: (error: unknown) => {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado')
    },
  })

  const addItemMutation = useMutation({
    mutationFn: () =>
      itemRequisicaoApi.criar({
        idRequisicao: id!,
        idFornecimento: selectedFornecimento,
        qtdSolicitada: Number(qtdSolicitada),
      }),
    onSuccess: () => {
      toast.success('Item adicionado.')
      queryClient.invalidateQueries({ queryKey: ['itens-requisicao', id] })
      setAddItemDialog(false)
      setSelectedFornecimento('')
      setQtdSolicitada('')
    },
    onError: (error: unknown) => {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado')
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => itemRequisicaoApi.deletar(itemId),
    onSuccess: () => {
      toast.success('Item removido.')
      queryClient.invalidateQueries({ queryKey: ['itens-requisicao', id] })
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

  const isOwner = (() => {
    const r = requisicao.idRequisitante
    const uid = typeof r === 'string' ? r : (r as IUsuario)?._id
    return uid === user?._id
  })()

  const canEdit = isOwner && (requisicao.status === 'Rascunho' || requisicao.status === 'Enviada')
  const canSend = isOwner && requisicao.status === 'Rascunho'
  const canApproveReject = (isAdmin || isGestor) && requisicao.status === 'Enviada'

  const valorTotal = itensRequisicao.reduce((sum, item) => sum + (item.valorTotal ?? 0), 0)

  const getItemName = (item: IItemRequisicao) => {
    const f = item.idFornecimento as IFornecimento
    if (typeof f === 'string') return f
    const i = f?.idItem as IItem
    if (typeof i === 'string') return i
    return i?.descricaoBreve ?? i?.numItem ?? '—'
  }

  const getFornecedorName = (item: IItemRequisicao) => {
    const f = item.idFornecimento as IFornecimento
    if (typeof f === 'string') return '—'
    const forn = f?.idFornecedor as IFornecedor
    if (typeof forn === 'string') return forn
    return forn?.nome ?? forn?.razaoSocial ?? '—'
  }

  const unidadeLabel = (() => {
    const u = requisicao.idUnidade as IUnidade
    if (typeof u === 'string') return u
    return u?.nomeAbrev ?? u?.nome ?? '—'
  })()

  const requisitanteLabel = (() => {
    const r = requisicao.idRequisitante as IUsuario
    if (typeof r === 'string') return r
    return r?.nome ?? '—'
  })()

  return (
    <div>
      <PageHeader
        title={`Requisição ${requisicao.identificador}`}
        subtitle={`Criada em ${format(new Date(requisicao.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/requisicoes')}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      {/* Header card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6 items-start justify-between">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Requisitante</span>
                <p className="font-medium">{requisitanteLabel}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Unidade</span>
                <p className="font-medium">{unidadeLabel}</p>
              </div>
              {requisicao.observacao && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Observação</span>
                  <p className="font-medium">{requisicao.observacao}</p>
                </div>
              )}
              {requisicao.motivoRejeicao && (
                <div className="col-span-2">
                  <span className="text-muted-foreground text-destructive">Motivo de Rejeição</span>
                  <p className="font-medium text-destructive">{requisicao.motivoRejeicao}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={requisicao.status} />
              <div className="flex gap-2 mt-2">
                {canSend && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setActionDialog('enviar')}
                  >
                    <Send className="h-4 w-4" />
                    Enviar
                  </Button>
                )}
                {canApproveReject && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => setActionDialog('aprovar')}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => setActionDialog('rejeitar')}
                    >
                      <XCircle className="h-4 w-4" />
                      Rejeitar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Itens da Requisição</CardTitle>
          {canEdit && (
            <Button size="sm" onClick={() => setAddItemDialog(true)}>
              <Plus className="h-4 w-4" />
              Adicionar Item
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
                  {canEdit && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensRequisicao.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">
                      Nenhum item adicionado. {canEdit && 'Clique em "Adicionar Item" para incluir.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  itensRequisicao.map((item: IItemRequisicao) => (
                    <TableRow key={item._id}>
                      <TableCell className="text-sm font-medium">{getItemName(item)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{getFornecedorName(item)}</TableCell>
                      <TableCell className="text-right text-sm">{item.qtdSolicitada}</TableCell>
                      <TableCell className="text-right text-sm">
                        {item.valorUnitario != null ? formatCurrency(item.valorUnitario) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {item.valorTotal != null ? formatCurrency(item.valorTotal) : '—'}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => removeItemMutation.mutate(item._id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
              {valorTotal > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={canEdit ? 4 : 3} className="text-right font-semibold">
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

      {/* Action dialogs */}
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
      {actionDialog === 'aprovar' && (
        <ConfirmDialog
          open
          title="Aprovar Requisição"
          description="Deseja aprovar esta requisição?"
          confirmLabel="Aprovar"
          variant="default"
          isLoading={aprovarMutation.isPending}
          onConfirm={() => aprovarMutation.mutate()}
          onCancel={() => setActionDialog(null)}
        />
      )}
      {actionDialog === 'rejeitar' && (
        <ConfirmDialog
          open
          title="Rejeitar Requisição"
          description="Deseja rejeitar esta requisição?"
          confirmLabel="Rejeitar"
          variant="destructive"
          isLoading={rejeitarMutation.isPending}
          onConfirm={() => rejeitarMutation.mutate()}
          onCancel={() => setActionDialog(null)}
        />
      )}

      {/* Add Item dialog */}
      <Dialog open={addItemDialog} onOpenChange={setAddItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Fornecimento</Label>
              <Select value={selectedFornecimento} onValueChange={setSelectedFornecimento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecimento..." />
                </SelectTrigger>
                <SelectContent>
                  {fornecimentos
                    .filter((f) => f.status === 'Homologado' && (f.saldo ?? 0) > 0)
                    .map((f) => (
                      <SelectItem key={f._id} value={f._id}>
                        {f.identificador}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade Solicitada</Label>
              <Input
                type="number"
                min={1}
                placeholder="Ex: 5"
                value={qtdSolicitada}
                onChange={(e) => setQtdSolicitada(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialog(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!selectedFornecimento || !qtdSolicitada || addItemMutation.isPending}
              onClick={() => addItemMutation.mutate()}
            >
              {addItemMutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
