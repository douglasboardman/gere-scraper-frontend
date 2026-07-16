import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  Loader2, Plus, Search, Trash2,
} from 'lucide-react'
import { itemRequisicaoApi } from '@/api/itemRequisicao.api'
import { fornecimentosApi } from '@/api/fornecimentos.api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency, formatQtd } from '@/lib/utils'
import type { IItemRequisicao, IFornecimento, IItem } from '@/types'
import {
  descBreve, descDetalhada, unMedida, saldoDisp, valUnitario,
  formatCurrencyMask, floatToMaskDigits, getItemName,
} from '../utils/requisicaoUtils'

type NewItemEntry = {
  fornecimento: IFornecimento
  item: IItem
  quantidade: number
  modo: 'qtd' | 'valor'
  valDigitado: number
}

interface AddItemsDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  existingItems: IItemRequisicao[]
  contratacaoIdStr: string | null
  userUasg: string
  requisicaoIdentificador: string
  onSaved: () => void
}

export function AddItemsDialog({
  open,
  onOpenChange,
  existingItems,
  contratacaoIdStr,
  userUasg,
  requisicaoIdentificador,
  onSaved,
}: AddItemsDialogProps) {
  const [newItems, setNewItems] = useState<Map<string, NewItemEntry>>(new Map())
  const [valorRawDigits, setValorRawDigits] = useState<Map<string, string>>(new Map())
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
      next.set(f.identificador, {
        fornecimento: f,
        item,
        quantidade: 1,
        modo: 'qtd',
        valDigitado: valUnitario(f),
      })
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

  function handleValor(idForn: string, val: number) {
    setNewItems((prev) => {
      const entry = prev.get(idForn)
      if (!entry) return prev
      const vUnit = valUnitario(entry.fornecimento)
      const qtdCalculada = vUnit > 0 ? Math.round((val / vUnit) * 100000) / 100000 : 0
      const next = new Map(prev)
      next.set(idForn, { ...entry, valDigitado: val, quantidade: qtdCalculada })
      return next
    })
  }

  function handleModo(idForn: string, novoModo: 'qtd' | 'valor') {
    if (novoModo === 'valor') {
      setValorRawDigits((d) => {
        const nd = new Map(d)
        nd.set(idForn, '0')
        return nd
      })
      setNewItems((prev) => {
        const e = prev.get(idForn)
        if (!e) return prev
        const next = new Map(prev)
        next.set(idForn, { ...e, modo: novoModo, valDigitado: 0 })
        return next
      })
    } else {
      setNewItems((prev) => {
        const e = prev.get(idForn)
        if (!e) return prev
        const next = new Map(prev)
        next.set(idForn, { ...e, modo: novoModo })
        return next
      })
    }
  }

  const newTotal = Array.from(newItems.values()).reduce(
    (sum, e) => sum + (e.modo === 'valor' ? e.valDigitado : valUnitario(e.fornecimento) * e.quantidade),
    0,
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [idForn, entry] of newItems.entries()) {
        await itemRequisicaoApi.criar({
          identRequisicao: requisicaoIdentificador,
          identFornecimento: idForn,
          ...(entry.modo === 'valor'
            ? { valDesejado: entry.valDigitado }
            : { qtdSolicitada: entry.quantidade }),
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

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!saveMutation.isPending) {
          setNewItems(new Map())
          setValorRawDigits(new Map())
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

        {loadingForn ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* LEFT — catalog */}
            <div className="flex flex-col border-r" style={{ flex: '3' }}>
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
                              <span className="text-muted-foreground font-normal">{f.identificador.slice(-5)}</span>
                              {' — '}
                              {item ? descBreve(item) : (f.identItem as string)}
                            </p>
                            <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-muted-foreground">
                              <span>Saldo: {formatQtd(saldo)} {item ? unMedida(item) : ''}</span>
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
                                  {item.qtdHomologada != null ? formatQtd(item.qtdHomologada) : '—'} {unMedida(item)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Saldo Disponível</p>
                                <p className="font-medium">{formatQtd(saldo)} {unMedida(item)}</p>
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
                          <span>Qtd: {formatQtd(ei.qtdSolicitada)}</span>
                          <span className="font-medium">
                            {ei.valTotal != null ? formatCurrency(ei.valTotal) : '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}

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
                      const qtdExcedesSaldo = entry.quantidade > saldoMax
                      return (
                        <div key={idForn} className="px-3 py-2.5 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium leading-snug line-clamp-2 flex-1">
                              <span className="text-muted-foreground font-normal">{idForn.slice(-5)}</span>
                              {' — '}
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

                          <div className="flex rounded-md border overflow-hidden w-fit">
                            <button
                              type="button"
                              onClick={() => handleModo(idForn, 'qtd')}
                              className={cn(
                                'px-2 py-0.5 text-xs',
                                entry.modo === 'qtd'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-background text-muted-foreground hover:bg-muted',
                              )}
                            >
                              Qtd
                            </button>
                            <button
                              type="button"
                              onClick={() => handleModo(idForn, 'valor')}
                              className={cn(
                                'px-2 py-0.5 text-xs',
                                entry.modo === 'valor'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-background text-muted-foreground hover:bg-muted',
                              )}
                            >
                              Valor
                            </button>
                          </div>

                          {entry.modo === 'qtd' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                Qtd:
                              </span>
                              <Input
                                type="number"
                                min={1}
                                max={saldoMax}
                                step={1}
                                value={entry.quantidade}
                                onChange={(e) => handleQtd(idForn, Number(e.target.value))}
                                className={cn('h-7 w-20 text-xs', qtdExcedesSaldo && 'border-destructive')}
                              />
                              <span className="text-xs text-muted-foreground flex-1 text-right">
                                {formatCurrency(vUnit * entry.quantidade)}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  R$:
                                </span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  autoFocus
                                  value={formatCurrencyMask(valorRawDigits.get(idForn) ?? floatToMaskDigits(entry.valDigitado))}
                                  onClick={(e) => {
                                    const t = e.currentTarget
                                    t.selectionStart = t.selectionEnd = t.value.length
                                  }}
                                  onKeyDown={(e) => {
                                    e.preventDefault()
                                    const key = e.key
                                    if (!/[0-9]/.test(key) && key !== 'Backspace') return
                                    const current = valorRawDigits.get(idForn) ?? floatToMaskDigits(entry.valDigitado)
                                    const digits = key === 'Backspace' ? current.slice(0, -1) : current + key
                                    setValorRawDigits((prev) => {
                                      const nd = new Map(prev)
                                      nd.set(idForn, digits)
                                      return nd
                                    })
                                    handleValor(idForn, (parseInt(digits, 10) || 0) / 100)
                                  }}
                                  onChange={() => {}}
                                  className={cn('h-7 w-28 text-xs', qtdExcedesSaldo && 'border-destructive')}
                                />
                              </div>
                              {entry.quantidade > 0 && (
                                <p className={cn(
                                  'text-xs',
                                  qtdExcedesSaldo ? 'text-destructive' : 'text-muted-foreground',
                                )}>
                                  Qtd: {formatQtd(entry.quantidade)}
                                  {qtdExcedesSaldo && ` — excede saldo (máx. ${saldoMax})`}
                                </p>
                              )}
                            </div>
                          )}
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
            disabled={
              newItems.size === 0 ||
              saveMutation.isPending ||
              Array.from(newItems.values()).some(
                (e) => e.quantidade > saldoDisp(e.fornecimento),
              )
            }
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
