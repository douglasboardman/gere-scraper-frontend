import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Layers } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { outrasObrigacoesApi } from '@/api/outras-obrigacoes.api'
import { qk } from '@/lib/query-keys'
import { formatCurrency } from '@/lib/utils'
import type { IContratoOob, IItemOob, IFornecimentoOob } from '@/types'

const anoAtual = String(new Date().getFullYear())

// ── Schemas ──────────────────────────────────────────────────────────────────

const contratoSchema = z.object({
  objeto: z.string().min(1, 'Obrigatório'),
})
type ContratoForm = z.infer<typeof contratoSchema>

const despesaSchema = z.object({
  descBreve: z.string().min(1, 'Obrigatório'),
  descDetalhada: z.string().min(1, 'Obrigatório'),
  unMedida: z.string().min(1, 'Obrigatório'),
  valorUnitario: z.coerce.number().positive('Deve ser positivo'),
  qtdAutorizada: z.coerce.number().positive('Deve ser positivo'),
})
type DespesaForm = z.infer<typeof despesaSchema>

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusOobBadge({ status }: { status: string }) {
  const color = status === 'Disponivel'
    ? 'bg-green-100 text-green-800'
    : 'bg-yellow-100 text-yellow-800'
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{status}</span>
}

// ── Modal de Grupo de Despesa ─────────────────────────────────────────────────

function ContratoModal({
  open, onClose, ano, contrato,
}: { open: boolean; onClose: () => void; ano: string; contrato?: IContratoOob }) {
  const qc = useQueryClient()
  const form = useForm<ContratoForm>({
    resolver: zodResolver(contratoSchema),
    defaultValues: { objeto: contrato?.objeto ?? '' },
  })

  const mutation = useMutation({
    mutationFn: (data: ContratoForm) =>
      contrato
        ? outrasObrigacoesApi.atualizarContrato(ano, contrato.identificador, data)
        : outrasObrigacoesApi.criarContrato(ano, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.oob.byAno(Number(ano)) })
      toast.success(contrato ? 'Grupo de despesa atualizado.' : 'Grupo de despesa criado.')
      onClose()
    },
    onError: () => toast.error('Erro ao salvar grupo de despesa.'),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contrato ? 'Editar Grupo de Despesa' : 'Novo Grupo de Despesa'}</DialogTitle>
          <DialogDescription>Vigência automática: 01/01/{ano} — 31/12/{ano}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <Label>Objeto / Descrição</Label>
            <Input {...form.register('objeto')} placeholder="ex: Bolsas e Auxílios" />
            {form.formState.errors.objeto && <p className="text-xs text-red-500">{form.formState.errors.objeto.message}</p>}
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

// ── Modal de Despesa (unificado Item + Fornecimento) ──────────────────────────

function DespesaModal({
  open, onClose, ano, contratoId, despesa,
}: {
  open: boolean; onClose: () => void; ano: string; contratoId: string
  despesa?: IFornecimentoOob & { item?: IItemOob }
}) {
  const qc = useQueryClient()
  const item = despesa && typeof despesa.item === 'object' ? despesa.item as IItemOob : undefined

  const form = useForm<DespesaForm>({
    resolver: zodResolver(despesaSchema),
    defaultValues: despesa
      ? {
          descBreve: item?.descBreve ?? '',
          descDetalhada: item?.descDetalhada ?? '',
          unMedida: item?.unMedida ?? '',
          valorUnitario: Number(despesa.valUnitHomologado) || 0,
          qtdAutorizada: Number(despesa.qtdAutorizada) || 0,
        }
      : { descBreve: '', descDetalhada: '', unMedida: '', valorUnitario: 0, qtdAutorizada: 0 },
  })

  const [valorUnitario, qtdAutorizada] = useWatch({
    control: form.control,
    name: ['valorUnitario', 'qtdAutorizada'],
  })
  const total = (Number(valorUnitario) || 0) * (Number(qtdAutorizada) || 0)

  const mutation = useMutation({
    mutationFn: (data: DespesaForm) =>
      despesa
        ? outrasObrigacoesApi.atualizarDespesa(ano, contratoId, despesa.identificador, data)
        : outrasObrigacoesApi.criarDespesa(ano, contratoId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.oob.byAno(Number(ano)) })
      toast.success(despesa ? 'Despesa atualizada.' : 'Despesa adicionada.')
      onClose()
    },
    onError: () => toast.error('Erro ao salvar despesa.'),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{despesa ? 'Editar Despesa' : 'Adicionar Despesa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <Label>Descrição breve</Label>
            <Input {...form.register('descBreve')} placeholder="ex: Bolsa Permanência" />
            {form.formState.errors.descBreve && <p className="text-xs text-red-500">{form.formState.errors.descBreve.message}</p>}
          </div>
          <div>
            <Label>Descrição detalhada</Label>
            <Textarea {...form.register('descDetalhada')} rows={3} placeholder="Descrição completa da despesa..." />
            {form.formState.errors.descDetalhada && <p className="text-xs text-red-500">{form.formState.errors.descDetalhada.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Unidade de medida</Label>
              <Input {...form.register('unMedida')} placeholder="ex: bolsista" />
              {form.formState.errors.unMedida && <p className="text-xs text-red-500">{form.formState.errors.unMedida.message}</p>}
            </div>
            <div>
              <Label>Valor unitário (R$)</Label>
              <Input type="number" step="0.01" {...form.register('valorUnitario')} />
              {form.formState.errors.valorUnitario && <p className="text-xs text-red-500">{form.formState.errors.valorUnitario.message}</p>}
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" step="0.001" {...form.register('qtdAutorizada')} />
              {form.formState.errors.qtdAutorizada && <p className="text-xs text-red-500">{form.formState.errors.qtdAutorizada.message}</p>}
            </div>
          </div>
          {total > 0 && (
            <p className="text-sm text-right text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Painel de Despesas ────────────────────────────────────────────────────────

function DespesasPanel({ contrato, ano }: { contrato: IContratoOob; ano: string }) {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editDespesa, setEditDespesa] = useState<(IFornecimentoOob & { item?: IItemOob }) | undefined>()

  const deletarMutation = useMutation({
    mutationFn: (despesaId: string) =>
      outrasObrigacoesApi.deletarDespesa(ano, contrato.identificador, despesaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.oob.byAno(Number(ano)) })
      toast.success('Despesa removida.')
    },
    onError: () => toast.error('Não foi possível remover a despesa.'),
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">{contrato.objeto ?? contrato.identificador}</p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar Despesa
        </Button>
      </div>
      {contrato.fornecimentos.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma despesa cadastrada.</p>
      )}
      {contrato.fornecimentos.map((f) => {
        const item = typeof f.item === 'object' ? f.item as IItemOob : undefined
        const descBreve = item?.descBreve ?? f.identItem
        const unMedida = item?.unMedida ?? ''
        return (
          <div key={f.identificador} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
            <div>
              <p className="font-medium">{descBreve}</p>
              <p className="text-xs text-muted-foreground">
                {unMedida && `${unMedida} · `}Qtd: {f.qtdAutorizada} · Val. unit.: {formatCurrency(f.valUnitHomologado)} · Total: {formatCurrency(Number(f.qtdAutorizada) * Number(f.valUnitHomologado))}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Editar despesa" onClick={() => setEditDespesa(f)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="Remover despesa"
                onClick={() => { if (confirm('Remover despesa?')) deletarMutation.mutate(f.identificador) }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )
      })}
      <DespesaModal open={addOpen} onClose={() => setAddOpen(false)} ano={ano} contratoId={contrato.identificador} />
      {editDespesa && (
        <DespesaModal open onClose={() => setEditDespesa(undefined)} ano={ano} contratoId={contrato.identificador} despesa={editDespesa} />
      )}
    </div>
  )
}

// ── Estado A — sem OOB ────────────────────────────────────────────────────────

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

// ── Página principal ──────────────────────────────────────────────────────────

export function OutrasObrigacoesPage() {
  const [ano, setAno] = useState(anoAtual)
  const [selectedContratoId, setSelectedContratoId] = useState<string | null>(null)
  const [contratoModalOpen, setContratoModalOpen] = useState(false)
  const [editContrato, setEditContrato] = useState<IContratoOob | undefined>()
  const [disponibilizarConfirm, setDisponibilizarConfirm] = useState(false)
  const qc = useQueryClient()

  const { data: oob, isLoading } = useQuery({
    queryKey: qk.oob.byAno(Number(ano)),
    queryFn: () => outrasObrigacoesApi.buscar(ano),
  })

  const isDisponivel = oob?.status === 'Disponivel'

  const disponibilizarMutation = useMutation({
    mutationFn: () =>
      isDisponivel
        ? outrasObrigacoesApi.indisponibilizar(ano)
        : outrasObrigacoesApi.disponibilizar(ano),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.oob.byAno(Number(ano)) })
      qc.invalidateQueries({ queryKey: qk.oob.wizardAll })
      toast.success(isDisponivel ? 'Outras Obrigações indisponibilizadas.' : 'Outras Obrigações disponibilizadas.')
      setDisponibilizarConfirm(false)
    },
    onError: () => toast.error(isDisponivel ? 'Erro ao indisponibilizar.' : 'Erro ao disponibilizar.'),
  })

  const toggleContratoMutation = useMutation({
    mutationFn: ({ contratoId, disponivel }: { contratoId: string; disponivel: boolean }) =>
      outrasObrigacoesApi.toggleContrato(ano, contratoId, disponivel),
    onSuccess: (_, { disponivel }) => {
      qc.invalidateQueries({ queryKey: qk.oob.byAno(Number(ano)) })
      qc.invalidateQueries({ queryKey: qk.oob.wizardAll })
      toast.success(disponivel ? 'Grupo de despesa disponibilizado.' : 'Grupo de despesa indisponibilizado.')
    },
    onError: () => toast.error('Erro ao alterar disponibilidade do grupo de despesa.'),
  })

  const deletarContratoMutation = useMutation({
    mutationFn: (contratoId: string) => outrasObrigacoesApi.deletarContrato(ano, contratoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.oob.byAno(Number(ano)) })
      setSelectedContratoId(null)
      toast.success('Grupo de despesa removido.')
    },
    onError: () => toast.error('Não foi possível remover o grupo de despesa.'),
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
            {oob && (
              <Button
                variant={isDisponivel ? 'outline' : 'default'}
                onClick={() => setDisponibilizarConfirm(true)}
              >
                {isDisponivel
                  ? <><XCircle className="h-4 w-4 mr-2" /> Indisponibilizar</>
                  : <><CheckCircle className="h-4 w-4 mr-2" /> Disponibilizar</>
                }
              </Button>
            )}
          </div>
        }
      />

      {!oob && (
        <EstadoVazio ano={ano} onCreate={() => qc.invalidateQueries({ queryKey: qk.oob.byAno(Number(ano)) })} />
      )}

      {oob && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <StatusOobBadge status={oob.status} />
          </div>

          <div className="grid grid-cols-5 gap-4">
            {/* Coluna de grupos de despesa */}
            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Grupos de Despesa</p>
                <Button size="sm" onClick={() => { setEditContrato(undefined); setContratoModalOpen(true) }}>
                  <Plus className="h-3 w-3 mr-1" /> Novo
                </Button>
              </div>
              {(oob.contratos ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum grupo de despesa cadastrado.</p>
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
                          {formatCurrency(c.valGlobal)} · {c.fornecimentos.length} despesa(s)
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-2">
                        <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Editar grupo" onClick={(e) => { e.stopPropagation(); setEditContrato(c); setContratoModalOpen(true) }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6 text-destructive" aria-label="Remover grupo"
                          onClick={(e) => { e.stopPropagation(); if (confirm('Remover grupo de despesa?')) deletarContratoMutation.mutate(c.identificador) }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {c.status === 'Disponivel' ? 'Disponível' : 'Indisponível'}
                      </span>
                      <Switch
                        checked={c.status === 'Disponivel'}
                        onCheckedChange={(checked) => {
                          toggleContratoMutation.mutate({ contratoId: c.identificador, disponivel: checked })
                        }}
                        onClick={(e) => e.stopPropagation()}
                        disabled={toggleContratoMutation.isPending}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Painel de despesas */}
            <div className="col-span-3 border rounded-lg p-4">
              {!selectedContrato && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Selecione um grupo de despesa para ver suas despesas.
                </p>
              )}
              {selectedContrato && (
                <DespesasPanel contrato={selectedContrato} ano={ano} />
              )}
            </div>
          </div>
        </div>
      )}

      <ContratoModal
        open={contratoModalOpen}
        onClose={() => { setContratoModalOpen(false); setEditContrato(undefined) }}
        ano={ano}
        contrato={editContrato}
      />

      <Dialog open={disponibilizarConfirm} onOpenChange={setDisponibilizarConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isDisponivel ? 'Indisponibilizar' : 'Disponibilizar'} Outras Obrigações {ano}
            </DialogTitle>
            <DialogDescription>
              {isDisponivel
                ? 'Ao indisponibilizar, os grupos de despesa e suas despesas não poderão ser utilizados em novas requisições de empenho até que sejam disponibilizados novamente. Confirma?'
                : 'Após a disponibilização, os grupos de despesa e suas despesas ficarão disponíveis para requisições de empenho. Confirma?'
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisponibilizarConfirm(false)}>Cancelar</Button>
            <Button
              variant={isDisponivel ? 'destructive' : 'default'}
              onClick={() => disponibilizarMutation.mutate()}
              disabled={disponibilizarMutation.isPending}
            >
              {isDisponivel ? 'Indisponibilizar' : 'Disponibilizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
