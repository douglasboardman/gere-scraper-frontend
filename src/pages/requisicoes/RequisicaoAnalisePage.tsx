import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft, CheckCircle, XCircle, Pencil, Trash2, Plus,
  Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import { requisicoesApi } from '@/api/requisicoes.api'
import { itemRequisicaoApi } from '@/api/itemRequisicao.api'
import { fornecimentosApi } from '@/api/fornecimentos.api'
import { itensApi } from '@/api/itens.api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn, formatCurrency } from '@/lib/utils'
import type { IItemRequisicao, IFornecimento, IItem, IUsuario, IUnidade, IUorg } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function descBreve(item: IItem): string {
  return item.descBreve ?? item.descricaoBreve ?? item.identificador ?? ''
}
function descDetalhada(item: IItem): string {
  return item.descDetalhada ?? item.descricaoDetalhada ?? 'Não informada.'
}
function unMedida(item: IItem): string {
  return item.unMedida ?? item.unidadeMedida ?? ''
}
function valUnitario(f: IFornecimento): number {
  return f.valUnitHomologado ?? f.valorUnitario ?? 0
}
function saldoDisp(f: IFornecimento): number {
  return f.saldoDisponivel ?? f.saldo ?? 0
}
function extrairIdCompra(idFornecimento: string): string | null {
  const idx = idFornecimento.lastIndexOf('C')
  return idx !== -1 ? idFornecimento.slice(idx) : null
}
function getItemName(item: IItemRequisicao): string {
  const f = item.idFornecimento as IFornecimento
  if (typeof f === 'string') return f
  const i = f?.idItem as IItem
  if (typeof i === 'string') return i
  return i?.descricaoBreve ?? i?.descBreve ?? f?.identificador ?? '—'
}
function getFornecedorName(item: IItemRequisicao): string {
  const f = item.idFornecimento as IFornecimento
  if (typeof f === 'string') return '—'
  return f?.nomeFornecedor ?? '—'
}

// ---------------------------------------------------------------------------
// EditItemDialog (gestor: editar quantidade)
// ---------------------------------------------------------------------------
interface EditItemDialogProps {
  item: IItemRequisicao
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}

function EditItemDialog({ item, open, onOpenChange, onSaved }: EditItemDialogProps) {
  const [qty, setQty] = useState(String(item.quantidadeSolicitada))
  const f = typeof item.idFornecimento === 'string' ? null : item.idFornecimento as IFornecimento
  const saldoMax = f ? saldoDisp(f) : null
  const vUnit = item.valorUnitario ?? (f ? valUnitario(f) : 0)
  const newTotal = vUnit * (Number(qty) || 0)

  const mutation = useMutation({
    mutationFn: () => itemRequisicaoApi.atualizar(item._id, { quantidadeSolicitada: Number(qty) }),
    onSuccess: () => { toast.success('Quantidade atualizada.'); onSaved(); onOpenChange(false) },
    onError: (e: unknown) => {
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado')
    },
  })

  const qtdNum = Number(qty)
  const canSave = qtdNum >= 1 && (saldoMax === null || qtdNum <= saldoMax) && !mutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar Quantidade</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Valor Unitário</p>
              <p className="font-medium">{formatCurrency(vUnit)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Novo Total</p>
              <p className="font-bold text-green-700">{formatCurrency(newTotal)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              Quantidade{' '}
              {saldoMax !== null && (
                <span className="text-muted-foreground font-normal text-xs">(máx. {saldoMax})</span>
              )}
            </Label>
            <Input
              type="number" min={1} max={saldoMax ?? undefined} step={1}
              value={qty}
              onChange={(e) => {
                const v = Number(e.target.value)
                setQty(saldoMax !== null && v > saldoMax ? String(saldoMax) : e.target.value)
              }}
              className="w-32"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!canSave} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// AddItemsDialog (gestor: adicionar itens da mesma compra)
// ---------------------------------------------------------------------------
type NewItemEntry = { fornecimento: IFornecimento; item: IItem; quantidade: number }

interface AddItemsDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  existingItems: IItemRequisicao[]
  compraIdStr: string | null
  userUasg: string
  requisicaoIdentificador: string
  onSaved: () => void
}

function AddItemsDialog({
  open, onOpenChange, existingItems, compraIdStr, userUasg, requisicaoIdentificador, onSaved,
}: AddItemsDialogProps) {
  const [newItems, setNewItems] = useState<Map<string, NewItemEntry>>(new Map())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogSearch, setCatalogSearch] = useState('')

  const { data: fornecimentos = [], isLoading: loadingForn } = useQuery({
    queryKey: ['analise-fornecimentos', compraIdStr, userUasg],
    queryFn: () =>
      compraIdStr
        ? fornecimentosApi.listarPorCompraUnidade(compraIdStr, userUasg)
        : fornecimentosApi.listarPorUnidade(userUasg),
    enabled: open && !!userUasg,
  })

  const { data: itens = [], isLoading: loadingItens } = useQuery({
    queryKey: ['analise-itens', compraIdStr],
    queryFn: () => compraIdStr ? itensApi.listar({ idCompra: compraIdStr }) : Promise.resolve([]),
    enabled: open && !!compraIdStr,
  })

  const itemMap = new Map<string, IItem>(itens.map((it) => [it.identificador, it]))
  const existingFornIds = new Set(
    existingItems.map((ei) => {
      const f = ei.idFornecimento
      return typeof f === 'string' ? f : (f as IFornecimento).identificador
    }),
  )

  const CATALOG_PAGE_SIZE = 10
  const filteredForn = catalogSearch.trim()
    ? fornecimentos.filter((f) => {
        const item = itemMap.get(f.idItem as string)
        if (!item) return false
        const q = catalogSearch.toLowerCase()
        return descBreve(item).toLowerCase().includes(q) || descDetalhada(item).toLowerCase().includes(q)
      })
    : fornecimentos
  const totalPages = Math.max(1, Math.ceil(filteredForn.length / CATALOG_PAGE_SIZE))
  const paginated = filteredForn.slice((catalogPage - 1) * CATALOG_PAGE_SIZE, catalogPage * CATALOG_PAGE_SIZE)

  const newTotal = Array.from(newItems.values()).reduce((s, e) => s + valUnitario(e.fornecimento) * e.quantidade, 0)

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [idForn, entry] of newItems.entries()) {
        await itemRequisicaoApi.criar({
          idRequisicao: requisicaoIdentificador,
          idFornecimento: idForn,
          quantidadeSolicitada: entry.quantidade,
        })
      }
    },
    onSuccess: () => {
      toast.success(`${newItems.size} item(s) adicionado(s).`)
      setNewItems(new Map()); setCatalogSearch(''); setCatalogPage(1)
      onSaved(); onOpenChange(false)
    },
    onError: (e: unknown) => {
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao adicionar itens.')
    },
  })

  const isLoading = loadingForn || loadingItens

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saveMutation.isPending) { setNewItems(new Map()); setCatalogSearch(''); setCatalogPage(1); onOpenChange(v) } }}>
      <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden flex flex-col" style={{ height: '85vh' }}>
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Adicionar Itens à Requisição</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-col border-r" style={{ flex: '3' }}>
              <div className="px-4 py-3 border-b bg-muted/20 shrink-0 space-y-2">
                <p className="text-sm font-semibold">Itens disponíveis <span className="text-muted-foreground font-normal">({filteredForn.length})</span></p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-8 h-7 text-xs" placeholder="Pesquisar..." value={catalogSearch}
                    onChange={(e) => { setCatalogSearch(e.target.value); setCatalogPage(1) }} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                {paginated.map((f) => {
                  const item = itemMap.get(f.idItem as string)
                  const isExpanded = expandedId === f.identificador
                  const isAlready = existingFornIds.has(f.identificador)
                  const isNew = newItems.has(f.identificador)
                  const saldo = saldoDisp(f)
                  const noSaldo = saldo <= 0
                  return (
                    <div key={f.identificador} className={cn('transition-colors', (isAlready || isNew) && 'bg-primary/5', noSaldo && 'bg-muted/40 opacity-60')}>
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug line-clamp-1">{item ? descBreve(item) : f.idItem as string}</p>
                          <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span>Saldo: {saldo}</span>
                            <span className="font-medium text-foreground">{formatCurrency(valUnitario(f))}</span>
                            {isAlready && <span className="text-primary font-semibold">Já incluído</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setExpandedId((p) => p === f.identificador ? null : f.identificador)}>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                          {!noSaldo && !isAlready && (
                            <Button size="icon" variant={isNew ? 'secondary' : 'default'} className="h-7 w-7" disabled={isNew}
                              onClick={() => {
                                const it = itemMap.get(f.idItem as string)
                                if (!it) return
                                setNewItems((p) => { if (p.has(f.identificador)) return p; const n = new Map(p); n.set(f.identificador, { fornecimento: f, item: it, quantidade: 1 }); return n })
                              }}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {isExpanded && item && (
                        <div className="border-t bg-muted/20 px-4 py-3 space-y-2 text-sm">
                          <p className="text-xs text-muted-foreground uppercase font-medium">Descrição detalhada</p>
                          <p>{descDetalhada(item)}</p>
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div><p className="text-muted-foreground">Saldo</p><p className="font-medium">{saldo} {unMedida(item)}</p></div>
                            <div><p className="text-muted-foreground">Valor Unitário</p><p className="font-medium text-green-700">{formatCurrency(valUnitario(f))}</p></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {totalPages > 1 && (
                <div className="border-t px-3 py-2 bg-muted/10 shrink-0 flex items-center justify-between">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCatalogPage((p) => Math.max(1, p - 1))} disabled={catalogPage === 1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                  <span className="text-xs text-muted-foreground">{catalogPage} / {totalPages}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCatalogPage((p) => Math.min(totalPages, p + 1))} disabled={catalogPage === totalPages}><ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
              )}
            </div>
            <div className="flex flex-col overflow-hidden" style={{ flex: '2' }}>
              <div className="px-4 py-3 border-b bg-muted/20 shrink-0 flex items-center justify-between">
                <p className="text-sm font-semibold">Novos ({newItems.size})</p>
                {newTotal > 0 && <span className="text-sm font-bold text-green-700">+{formatCurrency(newTotal)}</span>}
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                {newItems.size === 0 ? (
                  <div className="flex items-center justify-center h-40 text-muted-foreground text-sm text-center px-4">
                    Use o <span className="mx-1 font-bold">(+)</span> para adicionar.
                  </div>
                ) : (
                  Array.from(newItems.entries()).map(([idForn, entry]) => (
                    <div key={idForn} className="px-3 py-2.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium line-clamp-2 flex-1">{descBreve(entry.item)}</p>
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-destructive"
                          onClick={() => setNewItems((p) => { const n = new Map(p); n.delete(idForn); return n })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Qtd:</span>
                        <Input type="number" min={0} max={saldoDisp(entry.fornecimento)} step={1}
                          value={entry.quantidade}
                          onChange={(e) => setNewItems((p) => {
                            const en = p.get(idForn); if (!en) return p
                            const max = saldoDisp(en.fornecimento); const q = Number(e.target.value)
                            const n = new Map(p); n.set(idForn, { ...en, quantidade: Math.min(q, max) }); return n
                          })}
                          className="h-7 w-20 text-xs" />
                        <span className="text-xs text-muted-foreground flex-1 text-right">{formatCurrency(valUnitario(entry.fornecimento) * entry.quantidade)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saveMutation.isPending}>Cancelar</Button>
          <Button disabled={newItems.size === 0 || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar {newItems.size > 0 ? `${newItems.size} item(s)` : 'Itens'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export function RequisicaoAnalisePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [observacoes, setObservacoes] = useState<string | null>(null)
  const [itemsMutated, setItemsMutated] = useState(false)
  const [editItemTarget, setEditItemTarget] = useState<IItemRequisicao | null>(null)
  const [addItemsOpen, setAddItemsOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'aprovar' | 'rejeitar' | null>(null)
  const [showLeaveAlert, setShowLeaveAlert] = useState(false)

  const { data: requisicao, isLoading } = useQuery({
    queryKey: ['requisicao-analise', id],
    queryFn: () => requisicoesApi.obter(id!),
    enabled: !!id,
    select: (data) => {
      // Inicializa o campo observacoes somente uma vez
      return data
    },
  })

  // Inicializar observacoes quando os dados chegam
  const originalObservacoes = requisicao?.observacoes ?? (requisicao as unknown as { observacao?: string } | undefined)?.observacao ?? ''
  const currentObservacoes = observacoes !== null ? observacoes : originalObservacoes

  const { data: itensRequisicao = [], isLoading: loadingItens } = useQuery({
    queryKey: ['itens-analise', requisicao?.identificador],
    queryFn: () => itemRequisicaoApi.listar(requisicao!.identificador),
    enabled: !!requisicao?.identificador,
  })

  const invalidateItems = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['itens-analise', requisicao?.identificador] })
    setItemsMutated(true)
  }, [queryClient, requisicao?.identificador])

  const isDirty = currentObservacoes !== originalObservacoes || itemsMutated
  const canRejeitar = currentObservacoes.trim() !== originalObservacoes.trim() && currentObservacoes.trim() !== ''

  const aprovarMutation = useMutation({
    mutationFn: async () => {
      if (currentObservacoes !== originalObservacoes) {
        await requisicoesApi.atualizar(id!, { observacoes: currentObservacoes })
      }
      return requisicoesApi.aprovar(id!)
    },
    onSuccess: () => {
      toast.success('Requisição aprovada.')
      navigate('/requisicoes/pendentes')
    },
    onError: (e: unknown) => {
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado')
    },
  })

  const rejeitarMutation = useMutation({
    mutationFn: async () => {
      await requisicoesApi.atualizar(id!, { observacoes: currentObservacoes })
      return requisicoesApi.rejeitar(id!)
    },
    onSuccess: () => {
      toast.success('Requisição rejeitada.')
      navigate('/requisicoes/pendentes')
    },
    onError: (e: unknown) => {
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado')
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => itemRequisicaoApi.deletar(itemId),
    onSuccess: () => { toast.success('Item removido.'); invalidateItems() },
    onError: (e: unknown) => {
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao remover item.')
    },
  })

  const handleVoltar = () => {
    if (isDirty) {
      setShowLeaveAlert(true)
    } else {
      navigate('/requisicoes/pendentes')
    }
  }

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

  const valorTotal = itensRequisicao.reduce((sum, i) => sum + (i.valorTotal ?? 0), 0)
  const unidade = typeof requisicao.idUnidade === 'string' ? null : (requisicao.idUnidade as IUnidade)
  const uorg = requisicao.uorg as IUorg | undefined
  const userUasg = unidade?.uasg ?? ''
  const requisitante = typeof requisicao.requisitante === 'string'
    ? null
    : (requisicao.requisitante as IUsuario)

  const compraIdStr = (() => {
    if (itensRequisicao.length === 0) return null
    const f = itensRequisicao[0].idFornecimento
    const fIdent = typeof f === 'string' ? f : (f as IFornecimento).identificador
    return extrairIdCompra(fIdent)
  })()

  // Agrupar itens por fornecedor
  const itensPorFornecedor = itensRequisicao.reduce((acc, item) => {
    const nome = getFornecedorName(item)
    if (!acc[nome]) acc[nome] = []
    acc[nome].push(item)
    return acc
  }, {} as Record<string, IItemRequisicao[]>)

  const isMutating = aprovarMutation.isPending || rejeitarMutation.isPending

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={handleVoltar}
                className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
            </div>
            <h1 className="text-2xl font-bold">{requisicao.identificador}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Criada em {format(new Date(requisicao.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              {requisicao.dataEnvio && (
                <> · Enviada em {format(new Date(requisicao.dataEnvio), 'dd/MM/yyyy', { locale: ptBR })}</>
              )}
            </p>
          </div>

          {/* Impacto financeiro em destaque */}
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-0.5">
              Impacto Financeiro
            </p>
            <p className="text-3xl font-bold text-green-700">{formatCurrency(valorTotal)}</p>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <Button
            variant="outline"
            onClick={handleVoltar}
            disabled={isMutating}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            className="gap-1 border-destructive text-destructive hover:bg-destructive/10"
            disabled={!canRejeitar || isMutating}
            title={!canRejeitar ? 'Preencha o campo Observações para habilitar a rejeição' : undefined}
            onClick={() => setConfirmAction('rejeitar')}
          >
            {rejeitarMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <XCircle className="h-4 w-4" />}
            Rejeitar
          </Button>
          <Button
            className="gap-1 bg-green-700 hover:bg-green-800 text-white"
            disabled={isMutating}
            onClick={() => setConfirmAction('aprovar')}
          >
            {aprovarMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <CheckCircle className="h-4 w-4" />}
            Aprovar
          </Button>
        </div>
      </div>

      {/* Dados da requisição */}
      <Card className="mb-6 border-l-4 border-l-amber-400">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Dados da Requisição</CardTitle>
            <StatusBadge status={requisicao.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Requisitante</span>
              <p className="font-medium">{requisitante?.nome ?? '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Unidade (UASG)</span>
              <p className="font-medium">
                {unidade ? `${unidade.uasg} — ${unidade.nomeAbrev ?? unidade.nome}` : (requisicao.idUnidade as string ?? '—')}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Setor / UORG</span>
              <p className="font-medium">
                {uorg ? `${uorg.uorg_sg ? uorg.uorg_sg + ' — ' : ''}${uorg.uorg_no}` : (requisicao.uorg_key ?? '—')}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Tipo</span>
              <p className="font-medium">{requisicao.tipo ?? '—'}</p>
            </div>
            {requisicao.justificativa && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Justificativa</span>
                <p className="font-medium whitespace-pre-wrap">{requisicao.justificativa}</p>
              </div>
            )}
          </div>

          {/* Observações — editável pelo gestor */}
          <div className="border-t pt-4 space-y-2">
            <Label htmlFor="observacoes" className="text-sm font-medium flex items-center gap-2">
              Observações
              <span className="text-xs text-muted-foreground font-normal">
                (obrigatório para rejeitar)
              </span>
            </Label>
            <Textarea
              id="observacoes"
              rows={3}
              placeholder="Registre observações, ajustes solicitados ou motivo de rejeição..."
              value={currentObservacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
            {canRejeitar && (
              <p className="text-xs text-amber-600 font-medium">
                Observações alteradas — o botão "Rejeitar" está habilitado.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Itens agrupados por fornecedor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Itens da Requisição</h2>
          <Button size="sm" onClick={() => setAddItemsOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Itens
          </Button>
        </div>

        {loadingItens ? (
          <Skeleton className="h-48 w-full" />
        ) : itensRequisicao.length === 0 ? (
          <div className="border rounded-lg flex items-center justify-center py-16 text-muted-foreground text-sm">
            Nenhum item na requisição.
          </div>
        ) : (
          Object.entries(itensPorFornecedor).map(([fornecedor, itensForn]) => {
            const totalFornecedor = itensForn.reduce((s, i) => s + (i.valorTotal ?? 0), 0)
            return (
              <Card key={fornecedor}>
                <CardHeader className="pb-0 pt-4 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Fornecedor
                    </CardTitle>
                  </div>
                  <p className="text-base font-bold">{fornecedor}</p>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y bg-muted/30">
                        <th className="text-left px-5 py-2 font-medium text-muted-foreground">Item</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Qtd</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Valor Unit.</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Valor Total</th>
                        <th className="w-16 px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {itensForn.map((item) => (
                        <tr key={item._id} className="hover:bg-muted/10">
                          <td className="px-5 py-2.5 font-medium">{getItemName(item)}</td>
                          <td className="px-4 py-2.5 text-right">{item.quantidadeSolicitada}</td>
                          <td className="px-4 py-2.5 text-right">
                            {item.valorUnitario != null ? formatCurrency(item.valorUnitario) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium">
                            {item.valorTotal != null ? formatCurrency(item.valorTotal) : '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Editar quantidade"
                                onClick={() => setEditItemTarget(item)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                title="Remover item"
                                disabled={removeItemMutation.isPending}
                                onClick={() => removeItemMutation.mutate(item._id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/20">
                        <td colSpan={3} className="px-5 py-2.5 text-right text-sm font-semibold">
                          Total a ser empenhado para {fornecedor}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-green-700">
                          {formatCurrency(totalFornecedor)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* ── Dialogs ── */}

      {/* Confirmação de Aprovar */}
      {confirmAction === 'aprovar' && (
        <ConfirmDialog
          open
          title="Aprovar Requisição"
          description={`Deseja aprovar a requisição ${requisicao.identificador}? Esta ação não pode ser desfeita.`}
          confirmLabel="Aprovar"
          variant="default"
          isLoading={aprovarMutation.isPending}
          onConfirm={() => { aprovarMutation.mutate(); setConfirmAction(null) }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Confirmação de Rejeitar */}
      {confirmAction === 'rejeitar' && (
        <ConfirmDialog
          open
          title="Rejeitar Requisição"
          description={`Deseja rejeitar a requisição ${requisicao.identificador}? As observações serão salvas e a requisição retornará ao requisitante para correção.`}
          confirmLabel="Rejeitar"
          variant="destructive"
          isLoading={rejeitarMutation.isPending}
          onConfirm={() => { rejeitarMutation.mutate(); setConfirmAction(null) }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Confirmação de saída com alterações pendentes */}
      <ConfirmDialog
        open={showLeaveAlert}
        title="Sair sem concluir a análise?"
        description="Você realizou alterações que ainda não foram aplicadas (aprovar/rejeitar). Se sair agora, as alterações serão perdidas."
        confirmLabel="Sair mesmo assim"
        variant="destructive"
        onConfirm={() => navigate('/requisicoes/pendentes')}
        onCancel={() => setShowLeaveAlert(false)}
      />

      {/* Editar quantidade */}
      {editItemTarget && (
        <EditItemDialog
          item={editItemTarget}
          open={!!editItemTarget}
          onOpenChange={(v) => { if (!v) setEditItemTarget(null) }}
          onSaved={invalidateItems}
        />
      )}

      {/* Adicionar itens */}
      {addItemsOpen && (
        <AddItemsDialog
          open={addItemsOpen}
          onOpenChange={setAddItemsOpen}
          existingItems={itensRequisicao}
          compraIdStr={compraIdStr}
          userUasg={userUasg}
          requisicaoIdentificador={requisicao.identificador}
          onSaved={invalidateItems}
        />
      )}
    </div>
  )
}
