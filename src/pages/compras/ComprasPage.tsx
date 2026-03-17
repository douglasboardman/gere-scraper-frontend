import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Plus, Eye, Trash2 } from 'lucide-react'
import { ManageSearchIcon } from '@/components/icons/ManageSearchIcon'
import type { ColumnDef } from '@tanstack/react-table'
import { comprasApi } from '@/api/compras.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { usePermission } from '@/hooks/usePermission'
import type { ICompra } from '@/types'
import { truncate } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ComprasPage() {
  const navigate = useNavigate()
  const { can, isAdmin } = usePermission()
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: compras = [], isLoading } = useQuery({
    queryKey: ['compras'],
    queryFn: comprasApi.listar,
  })

  const deleteMutation = useMutation({
    mutationFn: (identificador: string) => comprasApi.deletar(identificador),
    onSuccess: () => {
      toast.success('Compra excluída com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['compras'] })
      setDeleteId(null)
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao excluir compra.'
      toast.error(msg)
    },
  })

  const filtered = statusFilter === 'all'
    ? compras
    : compras.filter((c) => c.status === statusFilter)

  const columns: ColumnDef<ICompra, unknown>[] = [
    {
      accessorKey: 'identificador',
      header: 'Identificador',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.original.identificador}</span>
      ),
    },
    {
      accessorKey: 'objeto',
      header: 'Objeto',
      cell: ({ row }) => (
        <span className="text-sm" title={row.original.objeto}>
          {row.original.objeto ? truncate(row.original.objeto, 60) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'uasgUnGestora',
      header: 'UASG Gestora',
    },
    {
      id: 'vigencia',
      header: 'Vigência',
      cell: ({ row }) => {
        const ini = row.original.iniVigencia
        const fim = row.original.fimVigencia
        if (!ini && !fim) return <span className="text-muted-foreground">—</span>
        return (
          <span className="text-sm whitespace-nowrap">
            {ini ? format(new Date(ini), 'dd/MM/yyyy', { locale: ptBR }) : '?'}
            {' → '}
            {fim ? format(new Date(fim), 'dd/MM/yyyy', { locale: ptBR }) : '?'}
          </span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Ver detalhes"
            onClick={() => navigate(`/compras/${row.original.identificador}`)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Ver Atas"
            onClick={() => navigate(`/atas?idCompra=${row.original.identificador}`)}
          >
            <ManageSearchIcon className="h-3.5 w-3.5" />
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteId(row.original.identificador)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Compras"
        subtitle="Gerencie as compras e pregões eletrônicos"
        actions={
          can('manage:compras') ? (
            <Button onClick={() => navigate('/compras/nova')}>
              <Plus className="h-4 w-4" />
              Nova Compra
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="Em Processamento">Em Processamento</SelectItem>
            <SelectItem value="Processada">Processada</SelectItem>
            <SelectItem value="Inconsistente">Inconsistente</SelectItem>
            <SelectItem value="Aguardando">Aguardando</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage="Nenhuma compra encontrada."
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Excluir Compra"
        description={`Tem certeza que deseja excluir a compra "${deleteId}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
