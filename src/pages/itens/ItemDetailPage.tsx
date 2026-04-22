import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, X, Check, Eye } from 'lucide-react'
import { itensApi } from '@/api/itens.api'
import { fornecimentosApi } from '@/api/fornecimentos.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
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
import type { IItem, IContratacao } from '@/types'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  )
}

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermission()
  const [editMode, setEditMode] = useState(false)
  const [editDescBreve, setEditDescBreve] = useState('')
  const [editDescDetalhada, setEditDescDetalhada] = useState('')
  const [editStatus, setEditStatus] = useState('')

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', id],
    queryFn: () => itensApi.obter(id!),
    enabled: !!id,
  })

  const { data: fornecimentos = [] } = useQuery({
    queryKey: ['fornecimentos', { identItem: id }],
    queryFn: () => fornecimentosApi.listar({ identItem: id! }),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<IItem>) => itensApi.atualizar(item!.identificador, data),
    onSuccess: () => {
      toast.success('Item atualizado com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['item', id] })
      queryClient.invalidateQueries({ queryKey: ['itens'] })
      setEditMode(false)
    },
    onError: (error: unknown) => {
      const data = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
      toast.error(data?.message ?? data?.error ?? 'Erro ao atualizar item.')
    },
  })

  const handleEdit = () => {
    setEditDescBreve(item?.descBreve ?? item?.descricaoBreve ?? '')
    setEditDescDetalhada(item?.descDetalhada ?? item?.descricaoDetalhada ?? '')
    setEditStatus(item?.status ?? '')
    setEditMode(true)
  }

  const handleSave = () => {
    const payload: Partial<IItem> = {}
    if (item?.status === 'Processado') {
      payload.descBreve = editDescBreve
      payload.descDetalhada = editDescDetalhada
    }
    if (editStatus) payload.status = editStatus as IItem['status']
    updateMutation.mutate(payload)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!item) return <div className="text-muted-foreground">Item não encontrado.</div>

  const numItem = item.sequencialItemPregao ?? item.numItem ?? item.identificador
  const descBreve = item.descBreve ?? item.descricaoBreve
  const descDetalhada = item.descDetalhada ?? item.descricaoDetalhada
  const valUnitario = item.valUnitario ?? item.valorUnitario
  const unMedida = item.unMedida ?? item.unidadeMedida

  const ataObj = typeof item.identAta !== 'string' ? item.identAta : null
  const contratacao = ataObj?.contratacao ?? (
    typeof ataObj?.identContratacao !== 'string' ? ataObj?.identContratacao : null
  )
  const subtitleContratacao = (() => {
    if (contratacao) {
      return `Contratação: ${contratacao.numContratacao}/${contratacao.anoContratacao} | UASG Gestora: ${contratacao.uasgUnGestora}`
    }
    const identStr =
      (typeof ataObj?.identContratacao === 'string' ? ataObj.identContratacao : null) ??
      (typeof item.identContratacao === 'string' ? item.identContratacao :
        item.identContratacao ? (item.identContratacao as IContratacao).identificador : null)
    if (identStr?.startsWith('C')) {
      const body = identStr.slice(1)
      if (body.length >= 11) return `Contratação: ${body.slice(6, -4)}/${body.slice(-4)} | UASG Gestora: ${body.slice(0, 6)}`
    }
    return null
  })()

  return (
    <div>
      <PageHeader
        title={`Item Nº ${numItem}`}
        subtitle={subtitleContratacao ?? descBreve ?? 'Sem descrição'}
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
                {can('edit:itens') && ['Processado', 'Disponivel', 'Encerrado'].includes(item.status) && (
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

      <Tabs defaultValue="informacoes">
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
                  <span className="font-mono text-xs">{item.identificador}</span>
                </Field>
                <Field label="Nº Item">
                  <span className="font-mono">{numItem}</span>
                </Field>
                {item.identAta && (
                  <Field label="Ata">
                    {typeof item.identAta === 'string' ? (
                      <Link to={`/atas/${item.identAta}`} className="font-mono text-primary hover:underline">
                        {item.identAta}
                      </Link>
                    ) : (
                      <Link to={`/atas/${(item.identAta as any).identificador}`} className="font-mono text-primary hover:underline">
                        {(item.identAta as any).identificador ?? '—'}
                      </Link>
                    )}
                  </Field>
                )}
                {!item.identAta && item.identContratacao && (
                  <Field label="Contratação">
                    {typeof item.identContratacao === 'string' ? (
                      <Link to={`/contratacoes/${item.identContratacao}`} className="font-mono text-primary hover:underline">
                        {item.identContratacao}
                      </Link>
                    ) : (
                      <Link to={`/contratacoes/${(item.identContratacao as IContratacao).identificador}`} className="font-mono text-primary hover:underline">
                        {(item.identContratacao as IContratacao).identificador}
                      </Link>
                    )}
                  </Field>
                )}
                <Field label="Tipo">{item.tipo || '—'}</Field>
                <Field label="Unidade de Medida">{unMedida || '—'}</Field>
                <Field label="Qtd Homologada">
                  {item.qtdHomologada != null ? `${item.qtdHomologada}${unMedida ? ` ${unMedida}` : ''}` : '—'}
                </Field>
                <Field label="Valor Unitário">
                  {valUnitario != null ? formatCurrency(valUnitario) : '—'}
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
                    <StatusBadge status={item.status} />
                  )}
                </Field>
                <div className="col-span-2 md:col-span-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Descrição Breve</span>
                  {editMode && item.status === 'Processado' ? (
                    <Textarea
                      className="mt-1"
                      rows={2}
                      value={editDescBreve}
                      onChange={(e) => setEditDescBreve(e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">{descBreve || '—'}</p>
                  )}
                </div>
                <div className="col-span-2 md:col-span-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Descrição Detalhada</span>
                  {editMode && item.status === 'Processado' ? (
                    <Textarea
                      className="mt-1"
                      rows={4}
                      value={editDescDetalhada}
                      onChange={(e) => setEditDescDetalhada(e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {descDetalhada || '—'}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-6">
                Atualizado em {format(new Date(item.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
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
                  Nenhum fornecimento vinculado a este item.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
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
    </div>
  )
}
