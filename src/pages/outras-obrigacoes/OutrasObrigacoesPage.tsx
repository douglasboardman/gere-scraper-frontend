import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, CheckCircle, Layers } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { outrasObrigacoesApi } from '@/api/outras-obrigacoes.api'
import { formatCurrency } from '@/lib/utils'
import type { IContratoOob, IItemOob, IFornecimentoOob, IOutrasObrigacoesData } from '@/types'

const anoAtual = String(new Date().getFullYear())

// ── Schemas de formulário ────────────────────────────────────────────────────

const itemSchema = z.object({
  descBreve: z.string().min(1, 'Obrigatório'),
  descDetalhada: z.string().min(1, 'Obrigatório'),
  unMedida: z.string().min(1, 'Obrigatório'),
  valUnitario: z.coerce.number().positive('Deve ser positivo'),
})
type ItemForm = z.infer<typeof itemSchema>

const contratoSchema = z.object({
  objeto: z.string().min(1, 'Obrigatório'),
  valGlobal: z.coerce.number().positive('Deve ser positivo'),
})
type ContratoForm = z.infer<typeof contratoSchema>

const fornecimentoSchema = z.object({
  identItem: z.string().min(1, 'Selecione um item'),
  qtdAutorizada: z.coerce.number().positive('Deve ser positivo'),
  valUnitHomologado: z.coerce.number().positive('Deve ser positivo'),
})
type FornecimentoForm = z.infer<typeof fornecimentoSchema>

// ── StatusBadge local ────────────────────────────────────────────────────────

function StatusOobBadge({ status }: { status: string }) {
  const color = status === 'Disponivel'
    ? 'bg-green-100 text-green-800'
    : 'bg-yellow-100 text-yellow-800'
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{status}</span>
}

// ── Modal de Item ────────────────────────────────────────────────────────────

function ItemModal({
  open, onClose, ano, item,
}: { open: boolean; onClose: () => void; ano: string; item?: IItemOob }) {
  const qc = useQueryClient()
  const form = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: item
      ? { descBreve: item.descBreve, descDetalhada: item.descDetalhada, unMedida: item.unMedida, valUnitario: item.valUnitario }
      : { descBreve: '', descDetalhada: '', unMedida: '', valUnitario: 0 },
  })

  const mutation = useMutation({
    mutationFn: (data: ItemForm) =>
      item
        ? outrasObrigacoesApi.atualizarItem(ano, item.identificador, data)
        : outrasObrigacoesApi.criarItem(ano, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oob', ano] })
      toast.success(item ? 'Item atualizado.' : 'Item criado.')
      onClose()
    },
    onError: () => toast.error('Erro ao salvar item.'),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Item' : 'Novo Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <Label>Descrição breve</Label>
            <Input {...form.register('descBreve')} />
            {form.formState.errors.descBreve && <p className="text-xs text-red-500">{form.formState.errors.descBreve.message}</p>}
          </div>
          <div>
            <Label>Descrição detalhada</Label>
            <Textarea {...form.register('descDetalhada')} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unidade de medida</Label>
              <Input {...form.register('unMedida')} placeholder="ex: bolsista, diária" />
            </div>
            <div>
              <Label>Valor unitário (R$)</Label>
              <Input type="number" step="0.01" {...form.register('valUnitario')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal de Contrato ────────────────────────────────────────────────────────

function ContratoModal({
  open, onClose, ano, contrato,
}: { open: boolean; onClose: () => void; ano: string; contrato?: IContratoOob }) {
  const qc = useQueryClient()
  const form = useForm<ContratoForm>({
    resolver: zodResolver(contratoSchema),
    defaultValues: contrato
      ? { objeto: contrato.objeto ?? '', valGlobal: contrato.valGlobal }
      : { objeto: '', valGlobal: 0 },
  })

  const mutation = useMutation({
    mutationFn: (data: ContratoForm) =>
      contrato
        ? outrasObrigacoesApi.atualizarContrato(ano, contrato.identificador, data)
        : outrasObrigacoesApi.criarContrato(ano, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oob', ano] })
      toast.success(contrato ? 'Contrato atualizado.' : 'Contrato criado.')
      onClose()
    },
    onError: () => toast.error('Erro ao salvar contrato.'),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contrato ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
          <DialogDescription>Vigência automática: 01/01/{ano} — 31/12/{ano}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <Label>Objeto / Descrição</Label>
            <Input {...form.register('objeto')} placeholder="ex: Bolsas e Auxílios" />
            {form.formState.errors.objeto && <p className="text-xs text-red-500">{form.formState.errors.objeto.message}</p>}
          </div>
          <div>
            <Label>Valor global (R$)</Label>
            <Input type="number" step="0.01" {...form.register('valGlobal')} />
            {form.formState.errors.valGlobal && <p className="text-xs text-red-500">{form.formState.errors.valGlobal.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal de Fornecimento ────────────────────────────────────────────────────

function FornecimentoModal({
  open, onClose, ano, contratoId, itens, fornecimento,
}: {
  open: boolean; onClose: () => void; ano: string; contratoId: string
  itens: IItemOob[]; fornecimento?: IFornecimentoOob
}) {
  const qc = useQueryClient()
  const form = useForm<FornecimentoForm>({
    resolver: zodResolver(fornecimentoSchema),
    defaultValues: fornecimento
      ? { identItem: fornecimento.identItem, qtdAutorizada: fornecimento.qtdAutorizada, valUnitHomologado: fornecimento.valUnitHomologado }
      : { identItem: '', qtdAutorizada: 0, valUnitHomologado: 0 },
  })

  const mutation = useMutation({
    mutationFn: (data: FornecimentoForm) =>
      fornecimento
        ? outrasObrigacoesApi.atualizarFornecimento(ano, contratoId, fornecimento.identificador, { qtdAutorizada: data.qtdAutorizada, valUnitHomologado: data.valUnitHomologado })
        : outrasObrigacoesApi.criarFornecimento(ano, contratoId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oob', ano] })
      toast.success(fornecimento ? 'Fornecimento atualizado.' : 'Fornecimento adicionado.')
      onClose()
    },
    onError: () => toast.error('Erro ao salvar fornecimento.'),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fornecimento ? 'Editar Fornecimento' : 'Adicionar Fornecimento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <Label>Item</Label>
            <Select
              value={form.watch('identItem')}
              onValueChange={(v) => form.setValue('identItem', v)}
              disabled={!!fornecimento}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um item..." />
              </SelectTrigger>
              <SelectContent>
                {itens.map((it) => (
                  <SelectItem key={it.identificador} value={it.identificador}>
                    {it.descBreve}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.identItem && <p className="text-xs text-red-500">{form.formState.errors.identItem.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Qtd autorizada</Label>
              <Input type="number" step="0.001" {...form.register('qtdAutorizada')} />
            </div>
            <div>
              <Label>Valor unitário (R$)</Label>
              <Input type="number" step="0.01" {...form.register('valUnitHomologado')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Painel de Fornecimentos ──────────────────────────────────────────────────

function FornecimentosPanel({
  contrato, itens, ano,
}: { contrato: IContratoOob; itens: IItemOob[]; ano: string }) {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editForn, setEditForn] = useState<IFornecimentoOob | undefined>()

  const deletarMutation = useMutation({
    mutationFn: (fornId: string) =>
      outrasObrigacoesApi.deletarFornecimento(ano, contrato.identificador, fornId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oob', ano] })
      toast.success('Fornecimento removido.')
    },
    onError: () => toast.error('Não foi possível remover o fornecimento.'),
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">{contrato.objeto ?? contrato.identificador}</p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar Fornecimento
        </Button>
      </div>
      {contrato.fornecimentos.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum fornecimento cadastrado.</p>
      )}
      {contrato.fornecimentos.map((f) => {
        const itemNome = typeof f.item === 'object' ? f.item.descBreve : f.identItem
        return (
          <div key={f.identificador} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
            <div>
              <p className="font-medium">{itemNome}</p>
              <p className="text-xs text-muted-foreground">
                Qtd: {f.qtdAutorizada} · Val. unit.: {formatCurrency(f.valUnitHomologado)} · Saldo: {f.saldoDisponivel}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditForn(f)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                onClick={() => { if (confirm('Remover fornecimento?')) deletarMutation.mutate(f.identificador) }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )
      })}
      <FornecimentoModal open={addOpen} onClose={() => setAddOpen(false)} ano={ano} contratoId={contrato.identificador} itens={itens} />
      {editForn && (
        <FornecimentoModal open onClose={() => setEditForn(undefined)} ano={ano} contratoId={contrato.identificador} itens={itens} fornecimento={editForn} />
      )}
    </div>
  )
}

// ── Estado A — sem OOB ───────────────────────────────────────────────────────

function EstadoVazio({ ano, onCreate }: { ano: string; onCreate: () => void }) {
  const mutation = useMutation({
    mutationFn: () => outrasObrigacoesApi.criar(ano),
    onSuccess: onCreate,
    onError: () => toast.error('Erro ao iniciar Outras Obrigações.'),
  })
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <Layers className="h-12 w-12 text-muted-foreground/40" />
      <p className="text-muted-foreground text-sm">
        Nenhuma contratação de Outras Obrigações cadastrada para {ano}.
      </p>
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        Iniciar Outras Obrigações {ano}
      </Button>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

export function OutrasObrigacoesPage() {
  const [ano, setAno] = useState(anoAtual)
  const [selectedContratoId, setSelectedContratoId] = useState<string | null>(null)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<IItemOob | undefined>()
  const [contratoModalOpen, setContratoModalOpen] = useState(false)
  const [editContrato, setEditContrato] = useState<IContratoOob | undefined>()
  const [publicarConfirm, setPublicarConfirm] = useState(false)
  const qc = useQueryClient()

  const { data: oob, isLoading } = useQuery({
    queryKey: ['oob', ano],
    queryFn: () => outrasObrigacoesApi.buscar(ano),
  })

  const publicarMutation = useMutation({
    mutationFn: () => outrasObrigacoesApi.publicar(ano),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oob', ano] })
      toast.success('Outras Obrigações publicadas com sucesso.')
      setPublicarConfirm(false)
    },
    onError: () => toast.error('Erro ao publicar.'),
  })

  const deletarItemMutation = useMutation({
    mutationFn: (itemId: string) => outrasObrigacoesApi.deletarItem(ano, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oob', ano] })
      toast.success('Item removido.')
    },
    onError: () => toast.error('Não foi possível remover o item.'),
  })

  const deletarContratoMutation = useMutation({
    mutationFn: (contratoId: string) => outrasObrigacoesApi.deletarContrato(ano, contratoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oob', ano] })
      setSelectedContratoId(null)
      toast.success('Contrato removido.')
    },
    onError: () => toast.error('Não foi possível remover o contrato.'),
  })

  const selectedContrato = (oob?.contratos ?? []).find((c) => c.identificador === selectedContratoId) ?? null

  const anos = Array.from({ length: 3 }, (_, i) => String(Number(anoAtual) - i))

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Carregando...</div>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outras Obrigações"
        subtitle={`Gestão de despesas sem licitação — ${ano}`}
        actions={
          <div className="flex items-center gap-2">
            <select
              className="text-sm border rounded px-2 py-1"
              value={ano}
              onChange={(e) => { setAno(e.target.value); setSelectedContratoId(null) }}
            >
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            {oob && oob.status !== 'Disponivel' && (
              <Button onClick={() => setPublicarConfirm(true)}>
                <CheckCircle className="h-4 w-4 mr-2" /> Publicar
              </Button>
            )}
          </div>
        }
      />

      {!oob && (
        <EstadoVazio ano={ano} onCreate={() => qc.invalidateQueries({ queryKey: ['oob', ano] })} />
      )}

      {oob && (
        <div className="space-y-4">
          {/* Status + Itens */}
          <div className="flex items-center gap-3">
            <StatusOobBadge status={oob.status} />
            <Button size="sm" variant="outline" onClick={() => { setEditItem(undefined); setItemModalOpen(true) }}>
              <Plus className="h-3 w-3 mr-1" /> Gerenciar Itens
            </Button>
          </div>

          {/* Itens cadastrados */}
          {(oob.itens ?? []).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Itens cadastrados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {(oob.itens ?? []).map((it) => (
                  <div key={it.identificador} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                    <div>
                      <p className="font-medium">{it.descBreve}</p>
                      <p className="text-xs text-muted-foreground">{it.unMedida} · {formatCurrency(it.valUnitario)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditItem(it); setItemModalOpen(true) }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => { if (confirm('Remover item?')) deletarItemMutation.mutate(it.identificador) }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Duas colunas: contratos | fornecimentos */}
          <div className="grid grid-cols-5 gap-4">
            {/* Coluna de contratos */}
            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Contratos</p>
                <Button size="sm" onClick={() => { setEditContrato(undefined); setContratoModalOpen(true) }}>
                  <Plus className="h-3 w-3 mr-1" /> Novo
                </Button>
              </div>
              {(oob.contratos ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum contrato cadastrado.</p>
              )}
              {(oob.contratos ?? []).map((c) => (
                <Card
                  key={c.identificador}
                  className={`cursor-pointer transition-colors ${selectedContratoId === c.identificador ? 'border-primary' : ''}`}
                  onClick={() => setSelectedContratoId(c.identificador)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.objeto ?? c.identificador}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(c.valGlobal)} · {c.fornecimentos.length} fornecimento(s)
                        </p>
                        <StatusOobBadge status={c.status} />
                      </div>
                      <div className="flex gap-1 shrink-0 ml-2">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditContrato(c); setContratoModalOpen(true) }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                          onClick={(e) => { e.stopPropagation(); if (confirm('Remover contrato?')) deletarContratoMutation.mutate(c.identificador) }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Coluna de fornecimentos */}
            <div className="col-span-3 border rounded-lg p-4">
              {!selectedContrato && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Selecione um contrato para ver seus fornecimentos.
                </p>
              )}
              {selectedContrato && (
                <FornecimentosPanel contrato={selectedContrato} itens={oob.itens ?? []} ano={ano} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ItemModal
        open={itemModalOpen}
        onClose={() => { setItemModalOpen(false); setEditItem(undefined) }}
        ano={ano}
        item={editItem}
      />
      <ContratoModal
        open={contratoModalOpen}
        onClose={() => { setContratoModalOpen(false); setEditContrato(undefined) }}
        ano={ano}
        contrato={editContrato}
      />

      {/* Confirmar publicação */}
      <Dialog open={publicarConfirm} onOpenChange={setPublicarConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar Outras Obrigações {ano}</DialogTitle>
            <DialogDescription>
              Após a publicação, os contratos e fornecimentos ficarão disponíveis para requisições de empenho.
              Confirma?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublicarConfirm(false)}>Cancelar</Button>
            <Button onClick={() => publicarMutation.mutate()} disabled={publicarMutation.isPending}>
              Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
