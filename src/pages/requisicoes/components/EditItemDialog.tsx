import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { itemRequisicaoApi } from '@/api/itemRequisicao.api'
import { getApiErrorMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, formatCurrency, formatQtd } from '@/lib/utils'
import type { IItemRequisicao, IFornecimento, IItem } from '@/types'
import { saldoDisp, valUnitario, formatCurrencyMask } from '../utils/requisicaoUtils'

interface EditItemDialogProps {
  item: IItemRequisicao
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}

export function EditItemDialog({ item, open, onOpenChange, onSaved }: EditItemDialogProps) {
  const f = typeof item.identFornecimento === 'string' ? null : item.identFornecimento as IFornecimento
  const i = f ? (typeof f.identItem === 'string' ? null : f.identItem as IItem) : null
  const itemName = i ? (i.descricaoBreve ?? i.descBreve ?? '—') : f?.identificador ?? '—'
  const fornecedorName = f?.nomeFornecedor ?? '—'
  const saldoMax = f ? saldoDisp(f) : null
  const vUnit = Math.round((item.valUnitario ?? (f ? valUnitario(f) : 0)) * 100) / 100

  const [modo, setModo] = useState<'qtd' | 'valor'>('qtd')
  const [qty, setQty] = useState(Number(item.qtdSolicitada).toFixed(5))
  const [valorRawDigits, setValorRawDigits] = useState('0')

  const mutation = useMutation({
    mutationFn: () =>
      itemRequisicaoApi.atualizar(
        item.id,
        modo === 'valor'
          ? { valDesejado: (parseInt(valorRawDigits, 10) || 0) / 100 }
          : { qtdSolicitada: Number(qty) },
      ),
    onSuccess: () => {
      toast.success('Item atualizado.')
      onSaved()
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error))
    },
  })

  const valFloat = (parseInt(valorRawDigits, 10) || 0) / 100
  const qtdNum = modo === 'qtd'
    ? Number(qty)
    : vUnit > 0 ? Math.round((valFloat / vUnit) * 100000) / 100000 : 0
  const newTotal = modo === 'valor' ? valFloat : vUnit * qtdNum
  const canSave =
    qtdNum > 0 &&
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
            <p className="text-sm font-medium">
              <span className="text-muted-foreground font-normal">{f?.identificador?.slice(-5) ?? ''}</span>
              {f ? ' — ' : ''}
              {itemName}
            </p>
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

          {/* Toggle Qtd | Valor */}
          <div className="flex rounded-md border overflow-hidden w-fit">
            <button
              type="button"
              onClick={() => setModo('qtd')}
              className={cn(
                'px-3 py-1 text-xs',
                modo === 'qtd'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              Quantidade
            </button>
            <button
              type="button"
              onClick={() => { setModo('valor'); setValorRawDigits('0') }}
              className={cn(
                'px-3 py-1 text-xs',
                modo === 'valor'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              Valor
            </button>
          </div>

          {modo === 'qtd' ? (
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
                    setQty(saldoMax.toFixed(5))
                  } else {
                    setQty(e.target.value)
                  }
                }}
                className="w-32"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>
                Valor (R$){' '}
                {saldoMax !== null && (
                  <span className="text-muted-foreground font-normal text-xs">
                    (máx. {formatCurrency(saldoMax * vUnit)})
                  </span>
                )}
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                autoFocus
                value={formatCurrencyMask(valorRawDigits)}
                onClick={(e) => {
                  const t = e.currentTarget
                  t.selectionStart = t.selectionEnd = t.value.length
                }}
                onKeyDown={(e) => {
                  e.preventDefault()
                  const key = e.key
                  if (!/[0-9]/.test(key) && key !== 'Backspace') return
                  const digits = key === 'Backspace' ? valorRawDigits.slice(0, -1) : valorRawDigits + key
                  setValorRawDigits(digits)
                }}
                onChange={() => {}}
                className={cn(
                  'w-36',
                  saldoMax !== null && qtdNum > saldoMax && 'border-destructive',
                )}
              />
              {qtdNum > 0 && (
                <p className={cn(
                  'text-xs',
                  saldoMax !== null && qtdNum > saldoMax ? 'text-destructive' : 'text-muted-foreground',
                )}>
                  Quantidade calculada: {formatQtd(qtdNum)}
                  {saldoMax !== null && qtdNum > saldoMax && ` — excede saldo (máx. ${saldoMax})`}
                </p>
              )}
            </div>
          )}
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
