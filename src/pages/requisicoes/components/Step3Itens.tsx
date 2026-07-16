import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { fornecimentosApi } from '@/api/fornecimentos.api'
import { itensApi } from '@/api/itens.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency, formatQtd } from '@/lib/utils'
import { qk } from '@/lib/query-keys'
import type { IContratacao, IFornecimento, IItem } from '@/types'
import {
  valUnitario,
  saldoDisp,
  descBreve,
  descDetalhada,
  unMedida,
  floatToMaskDigits,
  formatCurrencyMask,
  type SelectedItemEntry,
} from '../utils/requisicaoUtils'

interface Step3ItensProps {
  selectedCompra: IContratacao
  userUasg: string
  destDespesa: 'Material' | 'Servico' | 'Outras_Obrigacoes'
  initialItems: Map<string, SelectedItemEntry>
  identContratoOob?: string
  onComplete: (items: Map<string, SelectedItemEntry>) => void
  onBack: () => void
}

export function Step3Itens({
  selectedCompra,
  userUasg,
  destDespesa,
  initialItems,
  identContratoOob,
  onComplete,
  onBack,
}: Step3ItensProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItemEntry>>(initialItems)
  const [valorRawDigits, setValorRawDigits] = useState<Map<string, string>>(new Map())
  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogSearch, setCatalogSearch] = useState('')

  const { data: fornecimentos = [], isLoading: loadingForn } = useQuery({
    queryKey: qk.fornecimentos.wizard(selectedCompra.identificador, userUasg, identContratoOob),
    queryFn: () =>
      identContratoOob
        ? fornecimentosApi.listar({ identContrato: identContratoOob, status: 'Disponivel' })
        : fornecimentosApi.listarPorContratacaoUnidade(selectedCompra.identificador, userUasg),
  })

  const { data: itens = [], isLoading: loadingItens } = useQuery({
    queryKey: qk.itens.wizard(selectedCompra.identificador),
    queryFn: () => itensApi.listar({ identContratacao: selectedCompra.identificador }),
  })

  const fornecimentosFiltrados = fornecimentos
    .filter((f) => f.destDespesa === destDespesa)
    .sort(
      (a, b) =>
        parseInt(a.identificador.slice(-5), 10) - parseInt(b.identificador.slice(-5), 10),
    )
  const itemMap = new Map<string, IItem>(itens.map((it) => [it.identificador, it]))
  const isLoading = loadingForn || loadingItens

  function resolveItem(f: IFornecimento): IItem | undefined {
    if (typeof f.identItem !== 'string') return f.identItem as IItem
    return itemMap.get(f.identItem)
  }

  const CATALOG_PAGE_SIZE = 10
  const filteredFornecimentos = catalogSearch.trim()
    ? fornecimentosFiltrados.filter((f) => {
        const item = resolveItem(f)
        if (!item) return false
        const q = catalogSearch.toLowerCase()
        return (
          descBreve(item).toLowerCase().includes(q) ||
          descDetalhada(item).toLowerCase().includes(q)
        )
      })
    : fornecimentosFiltrados
  const totalCatalogPages = Math.max(
    1,
    Math.ceil(filteredFornecimentos.length / CATALOG_PAGE_SIZE),
  )
  const paginatedFornecimentos = filteredFornecimentos.slice(
    (catalogPage - 1) * CATALOG_PAGE_SIZE,
    catalogPage * CATALOG_PAGE_SIZE,
  )

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function handleAdd(f: IFornecimento) {
    const item = resolveItem(f)
    if (!item) return
    setSelectedItems((prev) => {
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

  function handleRemove(idForn: string) {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      next.delete(idForn)
      return next
    })
  }

  function handleQtd(idForn: string, qtd: number) {
    setSelectedItems((prev) => {
      const entry = prev.get(idForn)
      if (!entry) return prev
      if (qtd <= 0) return prev
      const next = new Map(prev)
      next.set(idForn, { ...entry, quantidade: qtd })
      return next
    })
  }

  function handleValor(idForn: string, val: number) {
    setSelectedItems((prev) => {
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
      setSelectedItems((prev) => {
        const e = prev.get(idForn)
        if (!e) return prev
        const next = new Map(prev)
        next.set(idForn, { ...e, modo: novoModo, valDigitado: 0 })
        return next
      })
    } else {
      setSelectedItems((prev) => {
        const e = prev.get(idForn)
        if (!e) return prev
        const next = new Map(prev)
        next.set(idForn, { ...e, modo: novoModo })
        return next
      })
    }
  }

  const totalValue = Array.from(selectedItems.values()).reduce(
    (sum, e) =>
      sum + (e.modo === 'valor' ? e.valDigitado : valUnitario(e.fornecimento) * e.quantidade),
    0,
  )

  function handleNext() {
    if (selectedItems.size === 0) {
      toast.warning('Adicione pelo menos um item antes de prosseguir.')
      return
    }
    const excedeSaldo = Array.from(selectedItems.values()).some(
      (e) => e.quantidade > saldoDisp(e.fornecimento),
    )
    if (excedeSaldo) {
      toast.warning('Um ou mais itens excedem o saldo disponível.')
      return
    }
    onComplete(selectedItems)
  }

  return (
    <div className="flex flex-col gap-4" style={{ minHeight: '520px' }}>
      {/* Compra info banner */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2 text-sm shrink-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="font-semibold text-primary">{selectedCompra.numEdital}</span>
        <span className="text-muted-foreground">—</span>
        <span className="line-clamp-1 text-muted-foreground">{selectedCompra.objeto}</span>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4 flex-1 overflow-hidden" style={{ height: '480px' }}>
          {/* LEFT — catalog */}
          <div className="col-span-3 flex flex-col border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/20 shrink-0 space-y-2">
              <p className="text-sm font-semibold">
                Itens disponíveis{' '}
                <span className="text-muted-foreground font-normal">
                  (
                  {catalogSearch.trim()
                    ? `${filteredFornecimentos.length} de ${fornecimentosFiltrados.length}`
                    : fornecimentosFiltrados.length}
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
              {fornecimentosFiltrados.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm text-center px-6">
                  Nenhum fornecimento encontrado para sua unidade nesta contratação.
                </div>
              ) : (
                paginatedFornecimentos.map((f) => {
                  const item = resolveItem(f)
                  const isExpanded = expandedId === f.identificador
                  const isAdded = selectedItems.has(f.identificador)
                  const vUnit = valUnitario(f)
                  const saldo = saldoDisp(f)
                  const isSaldoZero = saldo <= 0

                  return (
                    <div
                      key={f.identificador}
                      className={cn(
                        'transition-colors',
                        isAdded && !isSaldoZero && 'bg-primary/5',
                        isSaldoZero && 'bg-muted/40 opacity-60',
                      )}
                    >
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug line-clamp-1">
                            <span className="text-muted-foreground font-normal">
                              {f.identificador.slice(-5)}
                            </span>
                            {' — '}
                            {item ? descBreve(item) : f.identificador}
                          </p>
                          <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-muted-foreground">
                            <span>
                              Saldo: {formatQtd(saldo)} {item ? unMedida(item) : ''}
                            </span>
                            <span className="text-foreground font-medium">
                              {formatCurrency(vUnit)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => toggleExpand(f.identificador)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                            {isExpanded ? 'Fechar' : 'Detalhes'}
                          </Button>
                          {!isSaldoZero && (
                            <Button
                              size="icon"
                              variant={isAdded ? 'secondary' : 'default'}
                              className="h-7 w-7"
                              title={isAdded ? 'Já adicionado' : 'Adicionar item'}
                              disabled={isAdded}
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
                                {item.qtdHomologada != null ? formatQtd(item.qtdHomologada) : '—'}{' '}
                                {unMedida(item)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Saldo Disponível</p>
                              <p className="font-medium">
                                {formatQtd(saldo)} {unMedida(item)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Valor Unitário</p>
                              <p className="font-medium text-green-700">
                                {formatCurrency(vUnit)}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">
                            Fornecimento: {f.identificador}
                          </p>
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

          {/* RIGHT — cart */}
          <div className="col-span-2 flex flex-col border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/20 shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Selecionados{' '}
                  <span className="text-muted-foreground font-normal">
                    ({selectedItems.size})
                  </span>
                </p>
                <span className="text-sm font-bold text-green-700">
                  {formatCurrency(totalValue)}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y">
              {selectedItems.size === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm text-center px-4">
                  Nenhum item adicionado. Use o{' '}
                  <span className="mx-1 font-bold">(+)</span> para adicionar.
                </div>
              ) : (
                Array.from(selectedItems.entries()).map(([idForn, entry]) => {
                  const vUnit = valUnitario(entry.fornecimento)
                  const saldoMax = saldoDisp(entry.fornecimento)
                  const uMed = unMedida(entry.item)
                  const qtdExcedeSaldo = entry.quantidade > saldoMax
                  return (
                    <div key={idForn} className="px-3 py-3 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium leading-snug line-clamp-2 flex-1">
                          <span className="text-muted-foreground font-normal">
                            {idForn.slice(-5)}
                          </span>
                          {' — '}
                          {descBreve(entry.item)}
                        </p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => handleRemove(idForn)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(vUnit)} / {uMed}
                        {' · '}
                        Saldo: {formatQtd(saldoMax)} {uMed}
                      </p>

                      <div className="flex items-center gap-2">
                        <div className="flex rounded-md border overflow-hidden shrink-0">
                          <button
                            type="button"
                            onClick={() => handleModo(idForn, 'qtd')}
                            className={cn(
                              'px-2.5 py-1 text-xs',
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
                              'px-2.5 py-1 text-xs',
                              entry.modo === 'valor'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-background text-muted-foreground hover:bg-muted',
                            )}
                          >
                            Valor
                          </button>
                        </div>
                        {entry.modo === 'qtd' ? (
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={entry.quantidade.toFixed(5)}
                            onChange={(e) => handleQtd(idForn, Number(e.target.value))}
                            className={cn(
                              'h-8 flex-1 text-sm',
                              qtdExcedeSaldo && 'border-destructive',
                            )}
                          />
                        ) : (
                          <Input
                            type="text"
                            inputMode="numeric"
                            autoFocus
                            value={formatCurrencyMask(
                              valorRawDigits.get(idForn) ??
                                floatToMaskDigits(entry.valDigitado),
                            )}
                            onClick={(e) => {
                              const t = e.currentTarget
                              t.selectionStart = t.selectionEnd = t.value.length
                            }}
                            onKeyDown={(e) => {
                              e.preventDefault()
                              const key = e.key
                              if (!/[0-9]/.test(key) && key !== 'Backspace') return
                              const current =
                                valorRawDigits.get(idForn) ??
                                floatToMaskDigits(entry.valDigitado)
                              const digits =
                                key === 'Backspace' ? current.slice(0, -1) : current + key
                              setValorRawDigits((prev) => {
                                const nd = new Map(prev)
                                nd.set(idForn, digits)
                                return nd
                              })
                              handleValor(idForn, (parseInt(digits, 10) || 0) / 100)
                            }}
                            onChange={() => {}}
                            className={cn(
                              'h-8 flex-1 text-sm',
                              qtdExcedeSaldo && 'border-destructive',
                            )}
                          />
                        )}
                      </div>

                      <p
                        className={cn(
                          'text-xs text-right',
                          qtdExcedeSaldo ? 'text-destructive' : 'text-muted-foreground',
                        )}
                      >
                        {entry.modo === 'qtd'
                          ? `= ${formatCurrency(vUnit * entry.quantidade)}`
                          : `Qtd calculada: ${formatQtd(entry.quantidade)}`}
                        {qtdExcedeSaldo &&
                          ` · excede saldo (máx: ${formatQtd(saldoMax)} ${uMed})`}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between shrink-0 pt-1">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={handleNext} disabled={selectedItems.size === 0 || isLoading}>
          Revisar Requisição
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
