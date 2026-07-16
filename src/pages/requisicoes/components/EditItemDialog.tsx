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
import { saldoDisp, valUnitario } from '../utils/requisicaoUtils'
import { useQtdValorToggle } from '../hooks/useQtdValorToggle'

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

  const toggle = useQtdValorToggle({
    valorUnitario: vUnit,
    saldoDisponivel: saldoMax,
    qtdInicial: Number(item.qtdSolicitada),
  })

  const mutation = useMutation({
    mutationFn: () =>
      itemRequisicaoApi.atualizar(item.id, toggle.mutationPayload),
    onSuccess: () => {
      toast.success('Item atualizado.')
      onSaved()
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error))
    },
  })

  const canSave =
    toggle.qtdNum > 0 &&
    !toggle.excedeSaldo &&
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
              <p className="text-sm font-bold text-green-700">{formatCurrency(toggle.valorTotal)}</p>
            </div>
          </div>

          {/* Toggle Qtd | Valor */}
          <div className="flex rounded-md border overflow-hidden w-fit">
            <button
              type="button"
              onClick={() => toggle.alternarModo('qtd')}
              className={cn(
                'px-3 py-1 text-xs',
                toggle.modo === 'qtd'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              Quantidade
            </button>
            <button
              type="button"
              onClick={() => toggle.alternarModo('valor')}
              className={cn(
                'px-3 py-1 text-xs',
                toggle.modo === 'valor'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              Valor
            </button>
          </div>

          {toggle.modo === 'qtd' ? (
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
                value={toggle.qtdStr}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (saldoMax !== null && v > saldoMax) {
                    toggle.setQtdStr(saldoMax.toFixed(5))
                  } else {
                    toggle.setQtdStr(e.target.value)
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
                value={toggle.valorDisplay}
                onClick={(e) => {
                  const t = e.currentTarget
                  t.selectionStart = t.selectionEnd = t.value.length
                }}
                onKeyDown={toggle.handleCurrencyKeyDown}
                onChange={() => {}}
                className={cn(
                  'w-36',
                  toggle.excedeSaldo && 'border-destructive',
                )}
              />
              {toggle.qtdNum > 0 && (
                <p className={cn(
                  'text-xs',
                  toggle.excedeSaldo ? 'text-destructive' : 'text-muted-foreground',
                )}>
                  Quantidade calculada: {formatQtd(toggle.qtdNum)}
                  {toggle.excedeSaldo && saldoMax !== null && ` — excede saldo (máx. ${saldoMax})`}
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
