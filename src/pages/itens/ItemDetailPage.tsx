import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, X, Check, ExternalLink } from 'lucide-react'
import { itensApi } from '@/api/itens.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { usePermission } from '@/hooks/usePermission'
import type { IItem, StatusItem } from '@/types'

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
  const [editStatus, setEditStatus] = useState<StatusItem | ''>('')

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', id],
    queryFn: () => itensApi.obter(id!),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<IItem>) => itensApi.atualizar(item!._id, data),
    onSuccess: () => {
      toast.success('Item atualizado com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['item', id] })
      queryClient.invalidateQueries({ queryKey: ['itens'] })
      setEditMode(false)
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao atualizar item.'
      toast.error(msg)
    },
  })

  const handleEdit = () => {
    setEditStatus(item?.status ?? '')
    setEditMode(true)
  }

  const handleSave = () => {
    if (!editStatus) return
    updateMutation.mutate({ status: editStatus as StatusItem })
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

  // Backend field names (actual): descBreve, descDetalhada, valUnitario, unMedida, sequencialItemPregao
  const numItem = item.sequencialItemPregao ?? item.numItem ?? item.identificador
  const descBreve = item.descBreve ?? item.descricaoBreve
  const descDetalhada = item.descDetalhada ?? item.descricaoDetalhada
  const valUnitario = item.valUnitario ?? item.valorUnitario
  const unMedida = item.unMedida ?? item.unidadeMedida

  return (
    <div>
      <PageHeader
        title={`Item Nº ${numItem}`}
        subtitle={descBreve ?? 'Sem descrição'}
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
                {can('manage:itens') && (
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
              <span className="font-mono text-xs">{item.identificador}</span>
            </Field>
            <Field label="Nº Item">
              <span className="font-mono">{numItem}</span>
            </Field>
            <Field label="Ata">
              {typeof item.idAta === 'string' ? (
                <Link to={`/atas/${item.idAta}`} className="font-mono text-primary hover:underline">
                  {item.idAta}
                </Link>
              ) : (
                <Link to={`/atas/${item.idAta?.identificador}`} className="font-mono text-primary hover:underline">
                  {item.idAta?.identificador ?? '—'}
                </Link>
              )}
            </Field>
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
                <Select
                  value={editStatus}
                  onValueChange={(v) => setEditStatus(v as StatusItem)}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em Processamento">Em Processamento</SelectItem>
                    <SelectItem value="Processada">Processada</SelectItem>
                    <SelectItem value="Inconsistente">Inconsistente</SelectItem>
                    <SelectItem value="Aguardando">Aguardando</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <StatusBadge status={item.status} />
              )}
            </Field>
            {descBreve && (
              <div className="col-span-2 md:col-span-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Descrição Breve
                </span>
                <p className="mt-1 text-sm">{descBreve}</p>
              </div>
            )}
            {descDetalhada && (
              <div className="col-span-2 md:col-span-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Descrição Detalhada
                </span>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {descDetalhada}
                </p>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Atualizado em {format(new Date(item.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </p>
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" asChild>
        <Link to={`/fornecimentos?idItem=${item.identificador}`}>
          <ExternalLink className="h-4 w-4" />
          Ver Fornecimentos deste Item
        </Link>
      </Button>
    </div>
  )
}
