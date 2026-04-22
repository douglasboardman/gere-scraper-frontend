import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, X, Check } from 'lucide-react'
import { fornecimentosApi } from '@/api/fornecimentos.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { usePermission } from '@/hooks/usePermission'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { IFornecimento, IItem, IFornecedor, IContratacao } from '@/types'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  )
}

export function FornecimentoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermission()
  const [editMode, setEditMode] = useState(false)
  const [editValUnit, setEditValUnit] = useState('')
  const [editQtdAutorizada, setEditQtdAutorizada] = useState('')
  const [editQtdUtilizada, setEditQtdUtilizada] = useState('')
  const [editSaldo, setEditSaldo] = useState('')
  const [editStatus, setEditStatus] = useState('')

  const { data: fornecimento, isLoading } = useQuery({
    queryKey: ['fornecimento', id],
    queryFn: () => fornecimentosApi.obter(id!),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<IFornecimento>) => fornecimentosApi.atualizar(fornecimento!.identificador, data),
    onSuccess: () => {
      toast.success('Fornecimento atualizado com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['fornecimento', id] })
      queryClient.invalidateQueries({ queryKey: ['fornecimentos'] })
      setEditMode(false)
    },
    onError: (error: unknown) => {
      const data = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
      toast.error(data?.message ?? data?.error ?? 'Erro ao atualizar fornecimento.')
    },
  })

  const handleEdit = () => {
    setEditValUnit(fornecimento?.valUnitHomologado?.toString() ?? '')
    setEditQtdAutorizada(fornecimento?.qtdAutorizada?.toString() ?? '')
    setEditQtdUtilizada(fornecimento?.qtdUtilizada?.toString() ?? '')
    setEditSaldo((fornecimento?.saldoDisponivel ?? fornecimento?.saldo)?.toString() ?? '')
    setEditStatus(fornecimento?.status ?? '')
    setEditMode(true)
  }

  const handleSave = () => {
    const payload: Partial<IFornecimento> = {}
    if (fornecimento?.status === 'Processado') {
      if (editValUnit !== '') payload.valUnitHomologado = Number(editValUnit)
      if (editQtdAutorizada !== '') payload.qtdAutorizada = Number(editQtdAutorizada)
      if (editQtdUtilizada !== '') payload.qtdUtilizada = Number(editQtdUtilizada)
      if (editSaldo !== '') payload.saldoDisponivel = Number(editSaldo)
    }
    if (editStatus) payload.status = editStatus as IFornecimento['status']
    updateMutation.mutate(payload)
  }

  const getFornecedorInfo = (identFornecedor: string | IFornecedor): { label: string; id: string } => {
    if (typeof identFornecedor === 'string') return { label: identFornecedor, id: identFornecedor }
    return { label: identFornecedor.nome ?? '—', id: identFornecedor.identificador }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!fornecimento) return <div className="text-muted-foreground">Fornecimento não encontrado.</div>

  const saldo = fornecimento.saldoDisponivel ?? fornecimento.saldo
  const fornecedorInfo = getFornecedorInfo(fornecimento.identFornecedor)
  const isItemObj = typeof fornecimento.identItem !== 'string'
  const isFornecedorObj = typeof fornecimento.identFornecedor !== 'string'

  const contratacaoSuffix = (() => {
    if (!isItemObj) return ''
    const ic = (fornecimento.identItem as IItem).identContratacao
    if (!ic) return ''
    if (typeof ic !== 'string') {
      const c = ic as IContratacao
      return ` | C ${c.numContratacao}/${c.anoContratacao}`
    }
    const body = ic.startsWith('C') ? ic.slice(1) : ''
    return body.length >= 11 ? ` | C ${body.slice(6, -4)}/${body.slice(-4)}` : ''
  })()

  return (
    <div>
      <PageHeader
        title={`Fornecimento ${fornecimento.identificador}`}
        subtitle={`UASG Participante: ${fornecimento.uasgUnParticipante}${fornecimento.nomeUnParticipante ? ` — ${fornecimento.nomeUnParticipante}` : ''}${contratacaoSuffix}`}
        actions={
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                  <Check className="h-4 w-4" />
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            ) : (
              <>
                {can('edit:fornecimentos') && ['Processado', 'Disponivel', 'Encerrado'].includes(fornecimento.status) && (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
            <Field label="Identificador">
              <span className="font-mono text-xs">{fornecimento.identificador}</span>
            </Field>
            <Field label="UASG Participante">{fornecimento.uasgUnParticipante}</Field>
            {fornecimento.nomeUnParticipante && (
              <Field label="Nome UN Participante">{fornecimento.nomeUnParticipante}</Field>
            )}
            <Field label="Fornecedor">
              {isFornecedorObj ? (
                <Link to={`/fornecedores/${fornecedorInfo.id}`} className="text-primary hover:underline">
                  {fornecedorInfo.label}
                </Link>
              ) : (
                <Link to={`/fornecedores/${fornecedorInfo.id}`} className="font-mono text-primary hover:underline text-xs">
                  {fornecedorInfo.label}
                </Link>
              )}
            </Field>
            <Field label="Valor Unitário">
              {editMode && fornecimento.status === 'Processado' ? (
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={editValUnit}
                  onChange={(e) => setEditValUnit(e.target.value)}
                  className="w-36"
                />
              ) : (
                fornecimento.valUnitHomologado != null ? formatCurrency(fornecimento.valUnitHomologado) : '—'
              )}
            </Field>
            <Field label="Qtd Autorizada">
              {editMode && fornecimento.status === 'Processado' ? (
                <Input
                  type="number"
                  min={0}
                  value={editQtdAutorizada}
                  onChange={(e) => setEditQtdAutorizada(e.target.value)}
                  className="w-32"
                />
              ) : (
                fornecimento.qtdAutorizada ?? '—'
              )}
            </Field>
            <Field label="Qtd Utilizada">
              {editMode && fornecimento.status === 'Processado' ? (
                <Input
                  type="number"
                  min={0}
                  value={editQtdUtilizada}
                  onChange={(e) => setEditQtdUtilizada(e.target.value)}
                  className="w-32"
                />
              ) : (
                fornecimento.qtdUtilizada ?? '—'
              )}
            </Field>
            <Field label="Saldo Disponível">
              {editMode && fornecimento.status === 'Processado' ? (
                <Input
                  type="number"
                  min={0}
                  value={editSaldo}
                  onChange={(e) => setEditSaldo(e.target.value)}
                  className="w-32"
                />
              ) : (
                saldo ?? '—'
              )}
            </Field>
            <Field label="Status">
              {editMode ? (
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Processado">Processado</SelectItem>
                    <SelectItem value="Disponivel">Disponível</SelectItem>
                    <SelectItem value="Encerrado">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <StatusBadge status={fornecimento.status} />
              )}
            </Field>
          </div>
          {isItemObj && (
            <div className="mt-6 rounded-lg border bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Informações do Item</p>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-muted-foreground">Identificador</span>
                  <Link
                    to={`/itens/${(fornecimento.identItem as IItem).identificador}`}
                    className="block text-xs font-mono mt-0.5 text-primary hover:underline"
                  >
                    {(fornecimento.identItem as IItem).identificador}
                  </Link>
                </div>
                {((fornecimento.identItem as IItem).descBreve ?? (fornecimento.identItem as IItem).descricaoBreve) && (
                  <div>
                    <span className="text-xs text-muted-foreground">Descrição Breve</span>
                    <p className="text-sm mt-0.5">
                      {(fornecimento.identItem as IItem).descBreve ?? (fornecimento.identItem as IItem).descricaoBreve}
                    </p>
                  </div>
                )}
                {((fornecimento.identItem as IItem).descDetalhada ?? (fornecimento.identItem as IItem).descricaoDetalhada) && (
                  <div>
                    <span className="text-xs text-muted-foreground">Descrição Detalhada</span>
                    <p className="text-sm mt-0.5 text-muted-foreground leading-relaxed">
                      {(fornecimento.identItem as IItem).descDetalhada ?? (fornecimento.identItem as IItem).descricaoDetalhada}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-6">
            Atualizado em {format(new Date(fornecimento.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </p>
        </CardContent>
      </Card>

    </div>
  )
}
