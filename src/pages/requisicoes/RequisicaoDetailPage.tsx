import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Send, CheckCircle, XCircle, Trash2,
  Pencil, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2, Printer,
} from 'lucide-react'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useAuthStore } from '@/store/auth.store'
import { usePermission } from '@/hooks/usePermission'
import { cn, formatCurrency, tipoRequisicaoLabel } from '@/lib/utils'
import type { IItemRequisicao, IFornecimento, IItem, IUsuario, IUnidade, IUorg, IRequisicao } from '@/types'

// ---------------------------------------------------------------------------
// Utilities (shared with NovaRequisicaoPage)
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
function extrairIdContratacao(identFornecimento: string): string | null {
  const idx = identFornecimento.lastIndexOf('C')
  return idx !== -1 ? identFornecimento.slice(idx) : null
}

// ---------------------------------------------------------------------------
// Helpers to read enriched item data
// ---------------------------------------------------------------------------

function getItemName(item: IItemRequisicao): string {
  const f = item.identFornecimento as IFornecimento
  if (typeof f === 'string') return f
  const i = f?.identItem as IItem
  if (typeof i === 'string') return i
  return i?.descricaoBreve ?? i?.descBreve ?? i?.numItem ?? f?.identificador ?? '—'
}

function getFornecedorName(item: IItemRequisicao): string {
  const f = item.identFornecimento as IFornecimento
  if (typeof f === 'string') return '—'
  return f?.nomeFornecedor ?? '—'
}

// ---------------------------------------------------------------------------
// EditItemDialog — edit quantity of an existing item
// ---------------------------------------------------------------------------

interface EditItemDialogProps {
  item: IItemRequisicao
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}

function EditItemDialog({ item, open, onOpenChange, onSaved }: EditItemDialogProps) {
  const [qty, setQty] = useState(String(item.quantidadeSolicitada))

  const f = typeof item.identFornecimento === 'string' ? null : item.identFornecimento as IFornecimento
  const i = f ? (typeof f.identItem === 'string' ? null : f.identItem as IItem) : null
  const itemName = i ? (i.descricaoBreve ?? i.descBreve ?? '—') : f?.identificador ?? '—'
  const fornecedorName = f?.nomeFornecedor ?? '—'
  const saldoMax = f ? saldoDisp(f) : null
  const vUnit = item.valorUnitario ?? (f ? valUnitario(f) : 0)
  const newTotal = vUnit * (Number(qty) || 0)

  const mutation = useMutation({
    mutationFn: () =>
      itemRequisicaoApi.atualizar(item.id, { quantidadeSolicitada: Number(qty) }),
    onSuccess: () => {
      toast.success('Quantidade atualizada.')
      onSaved()
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Erro inesperado',
      )
    },
  })

  const qtdNum = Number(qty)
  const canSave =
    qtdNum >= 1 &&
    (saldoMax === null || qtdNum <= saldoMax) &&
    !mutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Descrição
            </p>
            <p className="text-sm font-medium">{itemName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Fornecedor
            </p>
            <p className="text-sm">{fornecedorName}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Valor Unitário
              </p>
              <p className="text-sm font-medium">{formatCurrency(vUnit)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Novo Total
              </p>
              <p className="text-sm font-bold text-green-700">{formatCurrency(newTotal)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              Quantidade{' '}
              {saldoMax !== null && (
                <span className="text-muted-foreground font-normal text-xs">
                  (máx. {saldoMax})
                </span>
              )}
            </Label>
            <Input
              type="number"
              min={1}
              max={saldoMax ?? undefined}
              step={1}
              value={qty}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (saldoMax !== null && v > saldoMax) {
                  setQty(String(saldoMax))
                } else {
                  setQty(e.target.value)
                }
              }}
              className="w-32"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
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
// AddItemsDialog — large Step-3-style dialog for adding new items
// ---------------------------------------------------------------------------

type NewItemEntry = { fornecimento: IFornecimento; item: IItem; quantidade: number }

interface AddItemsDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  existingItems: IItemRequisicao[]
  contratacaoIdStr: string | null
  userUasg: string
  requisicaoIdentificador: string
  onSaved: () => void
}

function AddItemsDialog({
  open,
  onOpenChange,
  existingItems,
  contratacaoIdStr,
  userUasg,
  requisicaoIdentificador,
  onSaved,
}: AddItemsDialogProps) {
  const [newItems, setNewItems] = useState<Map<string, NewItemEntry>>(new Map())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogSearch, setCatalogSearch] = useState('')

  const { data: fornecimentos = [], isLoading: loadingForn } = useQuery({
    queryKey: ['add-items-fornecimentos', contratacaoIdStr, userUasg],
    queryFn: () =>
      contratacaoIdStr
        ? fornecimentosApi.listarPorContratacaoUnidade(contratacaoIdStr, userUasg)
        : fornecimentosApi.listarPorUnidade(userUasg),
    enabled: open && !!userUasg,
  })

  // Identifiers already in requisição (lock them in the catalog)
  const existingFornIds = new Set(
    existingItems.map((ei) => {
      const f = ei.identFornecimento
      return typeof f === 'string' ? f : (f as IFornecimento).identificador
    }),
  )

  const CATALOG_PAGE_SIZE = 10
  function resolveItem(f: IFornecimento): IItem | undefined {
    return typeof f.identItem === 'string' ? undefined : (f.identItem as IItem)
  }

  const filteredFornecimentos = catalogSearch.trim()
    ? fornecimentos.filter((f) => {
        const item = resolveItem(f)
        if (!item) return false
        const q = catalogSearch.toLowerCase()
        return (
          descBreve(item).toLowerCase().includes(q) ||
          descDetalhada(item).toLowerCase().includes(q)
        )
      })
    : fornecimentos
  const totalCatalogPages = Math.max(1, Math.ceil(filteredFornecimentos.length / CATALOG_PAGE_SIZE))
  const paginatedFornecimentos = filteredFornecimentos.slice(
    (catalogPage - 1) * CATALOG_PAGE_SIZE,
    catalogPage * CATALOG_PAGE_SIZE,
  )

  function handleAdd(f: IFornecimento) {
    const item = resolveItem(f)
    if (!item) return
    setNewItems((prev) => {
      if (prev.has(f.identificador)) return prev
      const next = new Map(prev)
      next.set(f.identificador, { fornecimento: f, item, quantidade: 1 })
      return next
    })
  }

  function handleRemoveNew(idForn: string) {
    setNewItems((prev) => {
      const next = new Map(prev)
      next.delete(idForn)
      return next
    })
  }

  function handleQtd(idForn: string, qtd: number) {
    setNewItems((prev) => {
      const entry = prev.get(idForn)
      if (!entry) return prev
      const maxSaldo = saldoDisp(entry.fornecimento)
      if (qtd <= 0) return prev
      const next = new Map(prev)
      next.set(idForn, { ...entry, quantidade: Math.min(qtd, maxSaldo) })
      return next
    })
  }

  const newTotal = Array.from(newItems.values()).reduce(
    (sum, e) => sum + valUnitario(e.fornecimento) * e.quantidade,
    0,
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [idForn, entry] of newItems.entries()) {
        await itemRequisicaoApi.criar({
          identRequisicao: requisicaoIdentificador,
          identFornecimento: idForn,
          quantidadeSolicitada: entry.quantidade,
        })
      }
    },
    onSuccess: () => {
      toast.success(`${newItems.size} item(s) adicionado(s).`)
      setNewItems(new Map())
      onSaved()
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Erro ao adicionar itens.',
      )
    },
  })

  const isLoading = loadingForn

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!saveMutation.isPending) {
          setNewItems(new Map())
          setCatalogSearch('')
          setCatalogPage(1)
          onOpenChange(v)
        }
      }}
    >
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
            {/* LEFT — catalog */}
            <div className="flex flex-col border-r" style={{ flex: '3' }}>
              {/* Catalog header */}
              <div className="px-4 py-3 border-b bg-muted/20 shrink-0 space-y-2">
                <p className="text-sm font-semibold">
                  Itens disponíveis{' '}
                  <span className="text-muted-foreground font-normal">
                    (
                    {catalogSearch.trim()
                      ? `${filteredFornecimentos.length} de ${fornecimentos.length}`
                      : fornecimentos.length}
                    )
                  </span>
                </p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 h-7 text-xs"
                    placeholder="Pesquisar por descrição..."
                    value={catalogSearch}
                    onChange={(e) => {
                      setCatalogSearch(e.target.value)
                      setCatalogPage(1)
                    }}
                  />
                </div>
              </div>

              {/* Catalog items */}
              <div className="flex-1 overflow-y-auto divide-y">
                {paginatedFornecimentos.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-muted-foreground text-sm text-center px-6">
                    Nenhum item encontrado.
                  </div>
                ) : (
                  paginatedFornecimentos.map((f) => {
                    const item = resolveItem(f)
                    const isExpanded = expandedId === f.identificador
                    const isAlreadyInReq = existingFornIds.has(f.identificador)
                    const isNewlyAdded = newItems.has(f.identificador)
                    const saldo = saldoDisp(f)
                    const isSaldoZero = saldo <= 0

                    return (
                      <div
                        key={f.identificador}
                        className={cn(
                          'transition-colors',
                          (isAlreadyInReq || isNewlyAdded) && 'bg-primary/5',
                          isSaldoZero && 'bg-muted/40 opacity-60',
                        )}
                      >
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug line-clamp-1">
                              {item ? descBreve(item) : (f.identItem as string)}
                            </p>
                            <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-muted-foreground">
                              <span>Saldo: {saldo} {item ? unMedida(item) : ''}</span>
                              <span className="text-foreground font-medium">
                                {formatCurrency(valUnitario(f))}
                              </span>
                              {isAlreadyInReq && (
                                <span className="text-primary font-semibold">Já incluído</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() =>
                                setExpandedId((prev) =>
                                  prev === f.identificador ? null : f.identificador,
                                )
                              }
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            {!isSaldoZero && !isAlreadyInReq && (
                              <Button
                                size="icon"
                                variant={isNewlyAdded ? 'secondary' : 'default'}
                                className="h-7 w-7"
                                disabled={isNewlyAdded}
                                onClick={() => handleAdd(f)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {isExpanded && item && (
                          <div className="border-t bg-muted/20 px-4 py-3 space-y-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                                Descrição detalhada
                              </p>
                              <p className="leading-relaxed">{descDetalhada(item)}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Qtd Homologada</p>
                                <p className="font-medium">
                                  {item.qtdHomologada ?? '—'} {unMedida(item)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Saldo Disponível</p>
                                <p className="font-medium">{saldo} {unMedida(item)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Valor Unitário</p>
                                <p className="font-medium text-green-700">
                                  {formatCurrency(valUnitario(f))}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Pagination */}
              {totalCatalogPages > 1 && (
                <div className="border-t px-3 py-2 bg-muted/10 shrink-0 flex items-center justify-between">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                    disabled={catalogPage === 1}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {catalogPage} / {totalCatalogPages}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                    disabled={catalogPage === totalCatalogPages}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* RIGHT — existing items (locked) + new selections */}
            <div className="flex flex-col overflow-hidden" style={{ flex: '2' }}>
              <div className="px-4 py-3 border-b bg-muted/20 shrink-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Itens da Requisição{' '}
                    <span className="text-muted-foreground font-normal">
                      ({existingItems.length} existente{existingItems.length !== 1 ? 's' : ''} +{' '}
                      {newItems.size} novo{newItems.size !== 1 ? 's' : ''})
                    </span>
                  </p>
                  {newTotal > 0 && (
                    <span className="text-sm font-bold text-green-700">
                      +{formatCurrency(newTotal)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y">
                {/* Existing items — locked */}
                {existingItems.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 bg-muted/30">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                        Já incluídos
                      </p>
                    </div>
                    {existingItems.map((ei) => (
                      <div
                        key={ei.id}
                        className="px-3 py-2.5 opacity-60 bg-muted/10"
                      >
                        <p className="text-xs font-medium leading-snug line-clamp-2 mb-1">
                          {getItemName(ei)}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Qtd: {ei.quantidadeSolicitada}</span>
                          <span className="font-medium">
                            {ei.valorTotal != null ? formatCurrency(ei.valorTotal) : '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* New selections */}
                {newItems.size > 0 && (
                  <>
                    <div className="px-3 py-1.5 bg-primary/5">
                      <p className="text-xs text-primary font-semibold uppercase tracking-wide">
                        Novos
                      </p>
                    </div>
                    {Array.from(newItems.entries()).map(([idForn, entry]) => {
                      const vUnit = valUnitario(entry.fornecimento)
                      const saldoMax = saldoDisp(entry.fornecimento)
                      return (
                        <div key={idForn} className="px-3 py-2.5 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium leading-snug line-clamp-2 flex-1">
                              {descBreve(entry.item)}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveNew(idForn)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              Qtd:
                            </span>
                            <Input
                              type="number"
                              min={0}
                              max={saldoMax}
                              step={1}
                              value={entry.quantidade}
                              onChange={(e) => handleQtd(idForn, Number(e.target.value))}
                              className="h-7 w-20 text-xs"
                            />
                            <span className="text-xs text-muted-foreground flex-1 text-right">
                              {formatCurrency(vUnit * entry.quantidade)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {existingItems.length === 0 && newItems.size === 0 && (
                  <div className="flex items-center justify-center h-40 text-muted-foreground text-sm text-center px-4">
                    Nenhum item. Use o <span className="mx-1 font-bold">(+)</span> para adicionar.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            disabled={newItems.size === 0 || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar {newItems.size > 0 ? `${newItems.size} item(s)` : 'Itens'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// EditRequisicaoDialog — edit justificativa / observações (tipo locked)
// ---------------------------------------------------------------------------

const editReqSchema = z.object({
  justificativa: z.string().min(30, 'A justificativa deve ter pelo menos 30 caracteres'),
  observacoes: z.string().optional(),
})
type EditReqData = z.infer<typeof editReqSchema>

interface EditRequisicaoDialogProps {
  requisicao: IRequisicao
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}

function EditRequisicaoDialog({
  requisicao,
  open,
  onOpenChange,
  onSaved,
}: EditRequisicaoDialogProps) {
  const form = useForm<EditReqData>({
    resolver: zodResolver(editReqSchema),
    defaultValues: {
      justificativa: requisicao.justificativa ?? '',
      observacoes: (requisicao.observacoes ?? requisicao.observacao) ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: EditReqData) => requisicoesApi.atualizar(requisicao.identificador, data),
    onSuccess: () => {
      toast.success('Requisição atualizada.')
      onSaved()
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Erro inesperado',
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Dados da Requisição</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4 py-2">
            {/* Tipo — locked */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo</Label>
              <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                {tipoRequisicaoLabel(requisicao.tipo)}
              </div>
              <p className="text-xs text-muted-foreground">
                O tipo da requisição não pode ser alterado.
              </p>
            </div>

            <FormField
              control={form.control}
              name="justificativa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Justificativa *{' '}
                    <span className="text-muted-foreground font-normal text-xs">(mín. 30 caracteres)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="Descreva a necessidade e justificativa da requisição..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Observações{' '}
                    <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Informações adicionais..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function RequisicaoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { isGestor } = usePermission()

  const [actionDialog, setActionDialog] = useState<'enviar' | 'aprovar' | 'rejeitar' | null>(null)
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
      if (axiosErr.response?.status === 409 && axiosErr.response.data?.conflitos?.length) {
        setConflitoPendente({ conflitos: axiosErr.response.data.conflitos as any })
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

  const aprovarMutation = useMutation({
    mutationFn: () => requisicoesApi.aprovar(id!),
    onSuccess: () => {
      toast.success('Requisição aprovada.')
      queryClient.invalidateQueries({ queryKey: ['requisicao', id] })
      setActionDialog(null)
    },
    onError: (error: unknown) => {
      toast.error(
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Erro inesperado',
      )
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
      toast.error(
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Erro inesperado',
      )
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

  const isOwner = requisicao.requisitanteId === user?.id

  const canEdit = isOwner && (requisicao.status === 'Rascunho' || requisicao.status === 'Rejeitada')
  const canSend = isOwner && (requisicao.status === 'Rascunho' || requisicao.status === 'Rejeitada') && itensRequisicao.length > 0
  const canApproveReject = isGestor && requisicao.status === 'Enviada'

  const valorTotal = itensRequisicao.reduce((sum, item) => sum + (item.valorTotal ?? 0), 0)

  const unidade = typeof requisicao.identUnidade === 'string' ? null : (requisicao.identUnidade as IUnidade)
  const uorg = requisicao.uorg as IUorg | undefined
  const userUasg = unidade?.uasg ?? ''

  // Derive the compra identifier from the first existing item
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
    ? `${uorg.uorg_sg ? uorg.uorg_sg + ' — ' : ''}${uorg.uorg_no}`
    : (requisicao.uorg_key ?? '—')

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
                onClick={() => navigate(`/requisicoes/${requisicao.identificador}/imprimir`)}
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
              <p className="font-medium">{tipoRequisicaoLabel(requisicao.tipo)}</p>
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

          {/* Bottom row: Aprovar/Rejeitar (left) + Editar (right) */}
          {(canApproveReject || canEdit) && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <div className="flex gap-2">
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
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 ml-auto"
                  onClick={() => setEditReqOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              )}
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
                        {item.quantidadeSolicitada}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.valorUnitario != null ? formatCurrency(item.valorUnitario) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {item.valorTotal != null ? formatCurrency(item.valorTotal) : '—'}
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

      {/* ── Workflow action dialogs ── */}
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
                    <div><span className="text-muted-foreground">Saldo disponível</span><br />{c.saldoDisponivel}</div>
                    <div><span className="text-muted-foreground">Comprometido</span><br />{c.qtdComprometida}</div>
                    <div><span className="text-muted-foreground">Solicitado aqui</span><br />{c.qtdSolicitadaAtual}</div>
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
                  const atual = (requisicao.observacoes ?? (requisicao as any).observacao ?? '').trim()
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

      {/* ── Edit item quantity dialog ── */}
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

      {/* ── Add items (large catalog dialog) ── */}
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

      {/* ── Edit requisição data dialog ── */}
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
