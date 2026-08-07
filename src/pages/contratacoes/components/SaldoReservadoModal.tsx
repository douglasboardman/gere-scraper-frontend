import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { IFornecimento, IFornecSaldoReservado, IItem } from '@/types'

const PAGE_SIZE = 10

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  fornecimentosUnidade: IFornecimento[]
  reservasAtuais: IFornecSaldoReservado[]
  onConcluir: (novasReservas: IFornecSaldoReservado[]) => void
}

export function SaldoReservadoModal({
  open,
  onOpenChange,
  fornecimentosUnidade,
  reservasAtuais,
  onConcluir,
}: Props) {
  const [workingReservas, setWorkingReservas] = useState<IFornecSaldoReservado[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saldoInput, setSaldoInput] = useState('')
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  // Radix só chama onOpenChange para fechar — nunca para abrir via prop externa.
  // O useEffect garante a inicialização correta quando open se torna true.
  useEffect(() => {
    if (open) {
      setWorkingReservas([...reservasAtuais])
      setSelectedId(null)
      setSaldoInput('')
      setPage(0)
      setSearch('')
    }
    // reservasAtuais intencionalmente omitido: inicializa só na abertura, não a cada mudança externa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen)
  }

  const resolveItem = (forn: IFornecimento) => {
    const item = typeof forn.identItem === 'object' ? (forn.identItem as IItem) : null
    const seqRaw = item?.sequencialItemPregao ?? item?.numItem ?? null
    return {
      seq: seqRaw ?? '—',
      seqNum: seqRaw != null ? parseInt(String(seqRaw), 10) : Infinity,
      desc:
        item?.descDetalhada ??
        item?.descricaoDetalhada ??
        item?.descBreve ??
        item?.descricaoBreve ??
        '—',
      saldoDisponivel: forn.saldoDisponivel ?? forn.saldo ?? 0,
    }
  }

  const getSaldoReservadoAtual = (identFornecimento: string) =>
    workingReservas.find((r) => r.identFornecimento === identFornecimento)?.saldoReservado ?? null

  const fornecimentosOrdenados = useMemo(() => {
    const sorted = [...fornecimentosUnidade].sort((a, b) => {
      return resolveItem(a).seqNum - resolveItem(b).seqNum
    })
    if (!search.trim()) return sorted
    const q = search.trim().toLowerCase()
    return sorted.filter((forn) => resolveItem(forn).desc.toLowerCase().includes(q))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fornecimentosUnidade, search])

  const totalPages = Math.ceil(fornecimentosOrdenados.length / PAGE_SIZE)
  const paginatedFornecimentos = fornecimentosOrdenados.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  )

  const handleRowClick = (identFornecimento: string) => {
    if (selectedId === identFornecimento) {
      setSelectedId(null)
      setSaldoInput('')
    } else {
      setSelectedId(identFornecimento)
      const reservaAtual = workingReservas.find((r) => r.identFornecimento === identFornecimento)
      setSaldoInput(reservaAtual ? String(reservaAtual.saldoReservado) : '')
    }
  }

  const handleLiberarSaldo = (identFornecimento: string) => {
    setWorkingReservas((prev) => prev.filter((r) => r.identFornecimento !== identFornecimento))
    if (selectedId === identFornecimento) {
      setSelectedId(null)
      setSaldoInput('')
    }
  }

  const handleReservar = () => {
    if (!selectedId) return
    const valor = parseFloat(saldoInput.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return
    const forn = fornecimentosUnidade.find((f) => f.identificador === selectedId)
    const saldoDisponivel = forn?.saldoDisponivel ?? forn?.saldo ?? 0
    if (valor > saldoDisponivel) return

    setWorkingReservas((prev) => {
      const sem = prev.filter((r) => r.identFornecimento !== selectedId)
      return [...sem, { identFornecimento: selectedId, saldoReservado: valor }]
    })
    setSelectedId(null)
    setSaldoInput('')
  }

  const selectedForn = selectedId
    ? (fornecimentosUnidade.find((f) => f.identificador === selectedId) ?? null)
    : null
  const selectedItemInfo = selectedForn ? resolveItem(selectedForn) : null

  const saldoValor = parseFloat(saldoInput.replace(',', '.'))
  const saldoValido =
    !isNaN(saldoValor) &&
    saldoValor > 0 &&
    selectedItemInfo != null &&
    saldoValor <= selectedItemInfo.saldoDisponivel

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Saldos Reservados</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden min-h-0 gap-3">
          {/* Campo de pesquisa */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Pesquisar por descrição do item..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
            />
          </div>

          {/* Tabela */}
          <div className="flex flex-col border rounded-md overflow-hidden flex-1 min-h-0">
            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground w-14">
                      Nº
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                      Descrição
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right w-40">
                      Saldo Disponível
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right w-40">
                      Qtd. Reservada
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFornecimentos.map((forn) => {
                    const { seq, desc, saldoDisponivel } = resolveItem(forn)
                    const saldoReservado = getSaldoReservadoAtual(forn.identificador)
                    const isSelected = selectedId === forn.identificador
                    const temReserva = saldoReservado !== null && saldoReservado > 0
                    return (
                      <TableRow
                        key={forn.identificador}
                        className={cn(
                          'cursor-pointer select-none',
                          isSelected && 'bg-primary/5 hover:bg-primary/5',
                          !isSelected &&
                            temReserva &&
                            'bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30',
                          !isSelected && !temReserva && 'hover:bg-muted/40',
                        )}
                        onClick={() => handleRowClick(forn.identificador)}
                      >
                        <TableCell className="font-mono text-sm">{seq}</TableCell>
                        <TableCell className="text-sm">
                          <p className="truncate max-w-[500px]" title={desc}>
                            {desc}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm text-right font-mono tabular-nums whitespace-nowrap">
                          {saldoDisponivel > 0
                            ? saldoDisponivel.toLocaleString('pt-BR', {
                                minimumFractionDigits: 5,
                              })
                            : '—'}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-sm text-right font-mono tabular-nums whitespace-nowrap',
                            temReserva && 'text-amber-600 dark:text-amber-400 font-semibold',
                          )}
                        >
                          {saldoReservado !== null
                            ? saldoReservado.toLocaleString('pt-BR', {
                                minimumFractionDigits: 5,
                              })
                            : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {paginatedFornecimentos.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground text-sm py-8"
                      >
                        Nenhum item encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t text-xs text-muted-foreground shrink-0">
                <span>
                  Página {page + 1} de {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ‹
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    ›
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Área de detalhe — largura total, abaixo da tabela */}
          <div className="shrink-0 border rounded-md p-4 min-h-[80px]">
            {selectedForn && selectedItemInfo ? (
              <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Item Selecionado
                  </p>
                  <p className="text-sm font-mono font-semibold">Nº {selectedItemInfo.seq}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {selectedItemInfo.desc}
                  </p>
                </div>
                <div className="shrink-0 text-right space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Saldo Disponível
                  </p>
                  <p className="text-sm font-mono tabular-nums">
                    {selectedItemInfo.saldoDisponivel > 0
                      ? selectedItemInfo.saldoDisponivel.toLocaleString('pt-BR', {
                          minimumFractionDigits: 5,
                        })
                      : '—'}
                  </p>
                </div>
                <div className="shrink-0 space-y-2 w-52">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Qtd. a Reservar
                  </p>
                  <Input
                    type="number"
                    step="1"
                    min="0.00001"
                    max={selectedItemInfo.saldoDisponivel}
                    placeholder="0,00000"
                    value={saldoInput}
                    onChange={(e) => setSaldoInput(e.target.value)}
                  />
                  {saldoInput && !saldoValido && (
                    <p className="text-xs text-destructive">
                      Valor deve ser positivo e não exceder o saldo disponível.
                    </p>
                  )}
                  <div className="flex gap-2">
                    {getSaldoReservadoAtual(selectedId!) !== null && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-destructive hover:text-destructive"
                        onClick={() => handleLiberarSaldo(selectedId!)}
                      >
                        Liberar
                      </Button>
                    )}
                    <Button
                      className="flex-1"
                      size="sm"
                      onClick={handleReservar}
                      disabled={!saldoValido}
                    >
                      Reservar
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-center text-muted-foreground py-2">
                Clique em uma linha da tabela para definir ou alterar o saldo reservado.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onConcluir(workingReservas)}>Concluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
