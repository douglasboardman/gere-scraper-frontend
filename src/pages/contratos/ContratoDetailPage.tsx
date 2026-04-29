import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, X, Check, Eye } from 'lucide-react'
import { contratosApi } from '@/api/contratos.api'
import { useEditGuard } from '@/hooks/useEditGuard'
import { UnsavedChangesDialog } from '@/components/shared/UnsavedChangesDialog'
import { fornecimentosApi } from '@/api/fornecimentos.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatCNPJ } from '@/lib/utils'
import { usePermission } from '@/hooks/usePermission'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { IContrato, IContratacao } from '@/types'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  )
}

export function ContratoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermission()
  const [editMode, setEditMode] = useState(false)
  const [editObjeto, setEditObjeto] = useState('')
  const [editIniVigencia, setEditIniVigencia] = useState('')
  const [editFimVigencia, setEditFimVigencia] = useState('')
  const [editValorGlobal, setEditValorGlobal] = useState('')
  const [editNumParcelas, setEditNumParcelas] = useState('')
  const [editValorParcelas, setEditValorParcelas] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [activeTab, setActiveTab] = useState('informacoes')

  const { data: contrato, isLoading } = useQuery({
    queryKey: ['contrato', id],
    queryFn: () => contratosApi.obter(id!),
    enabled: !!id,
  })

  const { data: fornecimentos = [] } = useQuery({
    queryKey: ['fornecimentos', 'contrato', id],
    queryFn: () => fornecimentosApi.listar({ identContrato: contrato!.identificador }),
    enabled: !!contrato,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<IContrato>) => contratosApi.atualizar(contrato!.identificador, data),
    onSuccess: () => {
      toast.success('Contrato atualizado com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['contrato', id] })
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      setEditMode(false)
    },
    onError: (error: unknown) => {
      const d = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data
      toast.error(d?.message ?? d?.error ?? 'Erro ao atualizar contrato.')
    },
  })

  const handleEdit = () => {
    if (!contrato) return
    setEditObjeto(contrato.objeto ?? '')
    setEditIniVigencia(contrato.iniVigencia ? contrato.iniVigencia.substring(0, 10) : '')
    setEditFimVigencia(contrato.fimVigencia ? contrato.fimVigencia.substring(0, 10) : '')
    setEditValorGlobal(contrato.valorGlobal?.toString() ?? '')
    setEditNumParcelas(contrato.numParcelas?.toString() ?? '')
    setEditValorParcelas(contrato.valorParcelas?.toString() ?? '')
    setEditStatus(contrato.status)
    setEditMode(true)
  }

  const handleSave = () => {
    if (!contrato) return
    const payload: Partial<IContrato> = {}
    if (contrato.status === 'Processado') {
      if (editObjeto !== '') payload.objeto = editObjeto
      if (editIniVigencia) payload.iniVigencia = editIniVigencia
      if (editFimVigencia) payload.fimVigencia = editFimVigencia
      if (editValorGlobal !== '') payload.valorGlobal = Number(editValorGlobal)
      if (editNumParcelas !== '') payload.numParcelas = Number(editNumParcelas)
      if (editValorParcelas !== '') payload.valorParcelas = Number(editValorParcelas)
    }
    if (editStatus) payload.status = editStatus as IContrato['status']
    updateMutation.mutate(payload)
  }

  const getContratacaoLink = (identContratacao: string | IContratacao) => {
    if (typeof identContratacao === 'string') {
      const body = identContratacao.startsWith('C') ? identContratacao.slice(1) : ''
      const label = body.length >= 11 ? `${body.slice(6, -4)}/${body.slice(-4)}` : identContratacao
      return { id: identContratacao, label }
    }
    return {
      id: identContratacao.identificador,
      label: `${identContratacao.numContratacao}/${identContratacao.anoContratacao}`,
    }
  }

  const resetEditState = () => {
    setEditMode(false)
    setEditObjeto(contrato?.objeto ?? '')
    setEditIniVigencia(contrato?.iniVigencia ? contrato.iniVigencia.substring(0, 10) : '')
    setEditFimVigencia(contrato?.fimVigencia ? contrato.fimVigencia.substring(0, 10) : '')
    setEditValorGlobal(contrato?.valorGlobal?.toString() ?? '')
    setEditNumParcelas(contrato?.numParcelas?.toString() ?? '')
    setEditValorParcelas(contrato?.valorParcelas?.toString() ?? '')
    setEditStatus(contrato?.status ?? '')
  }

  const { isDialogOpen, handleNavigate, handleStay, guardTabChange } = useEditGuard(
    editMode,
    resetEditState,
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!contrato) return <div className="text-muted-foreground">Contrato não encontrado.</div>

  const ctLink = getContratacaoLink(contrato.identContratacao)
  const canEdit = can('edit:contratos') && contrato.status === 'Processado'
  const formatDate = (d?: string) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : '—'

  return (
    <div>
      <PageHeader
        title={`Contrato ${contrato.numContrato}`}
        subtitle={`UASG Contratante: ${contrato.uasgContratante}${contrato.unGestoraOrigemContrato ? ` — UASG Origem Contrato: ${contrato.unGestoraOrigemContrato}` : ''} | C ${ctLink.label}`}
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
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              </>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={guardTabChange(setActiveTab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="informacoes">Informações</TabsTrigger>
          <TabsTrigger value="fornecimentos">
            Fornecimentos
            {fornecimentos.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                {fornecimentos.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA: Informações ─────────────────────────── */}
        <TabsContent value="informacoes">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
                <Field label="Identificador">
                  <span className="font-mono text-xs">{contrato.identificador}</span>
                </Field>
                <Field label="Nº Contrato">
                  <span className="font-mono">{contrato.numContrato}</span>
                </Field>
                <Field label="Contratação">
                  <Link to={`/contratacoes/${ctLink.id}`} className="text-primary hover:underline">
                    {ctLink.label}
                  </Link>
                </Field>
                <Field label="UASG Contratante">{contrato.uasgContratante}</Field>
                {contrato.unGestoraOrigemContrato && (
                  <Field label="UN Gestora Origem">{contrato.unGestoraOrigemContrato}</Field>
                )}
                <Field label="Fornecedor">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{formatCNPJ(contrato.fornecedor?.cnpj ?? '')}</span>
                    {contrato.fornecedor?.nome && (
                      <p className="text-sm">{contrato.fornecedor.nome}</p>
                    )}
                  </div>
                </Field>
                <Field label="Objeto">
                  {editMode && contrato.status === 'Processado' ? (
                    <Input value={editObjeto} onChange={(e) => setEditObjeto(e.target.value)} className="w-full" />
                  ) : (contrato.objeto ?? '—')}
                </Field>
                <Field label="Início Vigência">
                  {editMode && contrato.status === 'Processado' ? (
                    <Input type="date" value={editIniVigencia} onChange={(e) => setEditIniVigencia(e.target.value)} className="w-44" />
                  ) : formatDate(contrato.iniVigencia)}
                </Field>
                <Field label="Fim Vigência">
                  {editMode && contrato.status === 'Processado' ? (
                    <Input type="date" value={editFimVigencia} onChange={(e) => setEditFimVigencia(e.target.value)} className="w-44" />
                  ) : formatDate(contrato.fimVigencia)}
                </Field>
                <Field label="Valor Global">
                  {editMode && contrato.status === 'Processado' ? (
                    <Input type="number" step="0.01" min={0} value={editValorGlobal} onChange={(e) => setEditValorGlobal(e.target.value)} className="w-44" />
                  ) : formatCurrency(contrato.valorGlobal)}
                </Field>
                <Field label="Nº Parcelas">
                  {editMode && contrato.status === 'Processado' ? (
                    <Input type="number" min={1} value={editNumParcelas} onChange={(e) => setEditNumParcelas(e.target.value)} className="w-32" />
                  ) : (contrato.numParcelas ?? '—')}
                </Field>
                <Field label="Valor Parcelas">
                  {editMode && contrato.status === 'Processado' ? (
                    <Input type="number" step="0.01" min={0} value={editValorParcelas} onChange={(e) => setEditValorParcelas(e.target.value)} className="w-44" />
                  ) : (contrato.valorParcelas != null ? formatCurrency(contrato.valorParcelas) : '—')}
                </Field>
                <Field label="Status">
                  {editMode ? (
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Processado">Processado</SelectItem>
                        <SelectItem value="Disponivel">Disponível</SelectItem>
                        <SelectItem value="Encerrado">Encerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <StatusBadge status={contrato.status} />
                  )}
                </Field>
              </div>
              {canEdit && !editMode && (
                <div className="flex gap-3 flex-wrap mt-6 pt-5 border-t">
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-6">
                Atualizado em {format(new Date(contrato.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA: Fornecimentos ───────────────────────── */}
        <TabsContent value="fornecimentos">
          <Card>
            <CardContent className="p-0">
              {fornecimentos.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Nenhum fornecimento vinculado a este contrato.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Item</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descrição</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">UASG Participante</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qtd Autorizada</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saldo</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valor Unit.</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fornecimentos.map((f) => (
                      <TableRow key={f.identificador} className="hover:bg-muted/40 transition-colors duration-100">
                        <TableCell className="font-mono text-sm">
                          {typeof f.identItem === 'object' ? f.identItem.sequencialItemPregao ?? '—' : '—'}
                        </TableCell>
                        <TableCell className="text-sm max-w-[220px]">
                          {typeof f.identItem === 'object' ? (f.identItem.descDetalhada ?? f.identItem.descBreve ?? '—') : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{f.uasgUnParticipante}</TableCell>
                        <TableCell className="text-sm">{f.qtdAutorizada ?? '—'}</TableCell>
                        <TableCell className="text-sm">{f.saldoDisponivel ?? f.saldo ?? '—'}</TableCell>
                        <TableCell className="text-sm">
                          {(f.valorUnitario ?? f.valUnitHomologado) != null
                            ? formatCurrency(f.valorUnitario ?? f.valUnitHomologado ?? 0)
                            : '—'}
                        </TableCell>
                        <TableCell><StatusBadge status={f.status} /></TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Ver detalhes"
                            onClick={() => navigate(`/fornecimentos/${f.identificador}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <UnsavedChangesDialog
        open={isDialogOpen}
        onNavigate={handleNavigate}
        onStay={handleStay}
      />
    </div>
  )
}
