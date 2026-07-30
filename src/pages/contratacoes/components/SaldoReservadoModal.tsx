import { useState } from 'react'
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

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setWorkingReservas([...reservasAtuais])
      setSelectedId(null)
      setSaldoInput('')
      setPage(0)
    }
    onOpenChange(isOpen)
  }

  const resolveItem = (forn: IFornecimento) => {
    const item = typeof forn.identItem === 'object' ? (forn.identItem as IItem) : null
    return {
      seq: item?.sequencialItemPregao ?? item?.numItem ?? '—',
      desc: item?.descDetalhada ?? item?.descricaoDetalhada ?? item?.descBreve ?? item?.descricaoBreve ?? '—',
      saldoDisponivel: forn.saldoDisponivel ?? forn.saldo ?? 0,
    }
  }

  const totalPages = Math.ceil(fornecimentosUnidade.length / PAGE_SIZE)
  const paginatedFornecimentos = fornecimentosUnidade.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  )

  const getSaldoReservadoAtual = (identFornecimento: string) =>
    workingReservas.find((r) => r.identFornecimento === identFornecimento)?.saldoReservado ?? null

  const handleSelecionar = (identFornecimento: string) => {
    setSelectedId(identFornecimento)
    const reservaAtual = workingReservas.find((r) => r.identFornecimento === identFornecimento)
    setSaldoInput(reservaAtual ? String(reservaAtual.saldoReservado) : '')
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
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Saldos Reservados</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 flex-1 overflow-hidden min-h-0">
          {/* Painel esquerdo — tabela de fornecimentos */}
          <div className="flex-[3] flex flex-col overflow-hidden border rounded-md">
            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground w-14">Nº</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Descrição</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right">Disponível</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right">Reservado</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right w-36">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFornecimentos.map((forn) => {
                    const { seq, desc, saldoDisponivel } = resolveItem(forn)
                    const saldoReservado = getSaldoReservadoAtual(forn.identificador)
                    const isSelected = selectedId === forn.identificador
                    return (
                      <TableRow
                        key={forn.identificador}
                        className={isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'}
                      >
                        <TableCell className="font-mono text-sm">{seq}</TableCell>
                        <TableCell className="text-sm max-w-[180px]">
                          <p className="truncate" title={desc}>{desc}</p>
                        </TableCell>
                        <TableCell className="text-sm text-right font-mono tabular-nums whitespace-nowrap">
                          {saldoDisponivel > 0
                            ? saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 5 })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-right font-mono tabular-nums whitespace-nowrap">
                          {saldoReservado != null
                            ? saldoReservado.toLocaleString('pt-BR', { minimumFractionDigits: 5 })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {saldoReservado != null && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                onClick={() => handleLiberarSaldo(forn.identificador)}
                              >
                                Liberar
                              </Button>
                            )}
                            <Button
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleSelecionar(forn.identificador)}
                            >
                              {isSelected ? 'Selecionado' : 'Selecionar'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t text-xs text-muted-foreground">
                <span>Página {page + 1} de {totalPages}</span>
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

          {/* Painel direito — detalhe do item selecionado */}
          <div className="flex-[2] border rounded-md p-4 flex flex-col gap-4">
            {selectedForn && selectedItemInfo ? (
              <>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Item Selecionado
                  </p>
                  <p className="text-sm font-mono font-semibold">Nº {selectedItemInfo.seq}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                    {selectedItemInfo.desc}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Saldo Disponível
                  </p>
                  <p className="text-sm font-mono tabular-nums">
                    {selectedItemInfo.saldoDisponivel > 0
                      ? selectedItemInfo.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 5 })
                      : '—'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Saldo a Reservar
                  </p>
                  <Input
                    type="number"
                    step="0.00001"
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
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={handleReservar}
                    disabled={!saldoValido}
                  >
                    Reservar
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-sm text-muted-foreground px-4">
                Selecione um item na tabela para definir o saldo a reservar.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onConcluir(workingReservas)}>
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
