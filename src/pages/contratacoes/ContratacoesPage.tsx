import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Plus, Eye, Trash2, TriangleAlert, FileText, ScrollText, Package } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { contratacoesApi } from '@/api/contratacoes.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { usePermission } from '@/hooks/usePermission'
import type { IContratacao } from '@/types'
import { truncate } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ContratacoesPage() {
  const navigate = useNavigate()
  const { can, isAdmin } = usePermission()
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: compras = [], isLoading } = useQuery({
    queryKey: ['contratacoes'],
    queryFn: contratacoesApi.listar,
  })

  const deleteMutation = useMutation({
    mutationFn: (identificador: string) => contratacoesApi.deletar(identificador),
    onSuccess: () => {
      toast.success('Contratação excluída com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['contratacoes'] })
      setDeleteId(null)
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao excluir contratação.'
      toast.error(msg)
    },
  })

  const filtered = statusFilter === 'all'
    ? compras
    : compras.filter((c) => c.status === statusFilter)

  const columns: ColumnDef<IContratacao, unknown>[] = [
    {
      accessorKey: 'identificador',
      header: 'Identificador',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.original.identificador}</span>
      ),
    },
    {
      id: 'numContratacao',
      header: 'Núm. Contratação',
      cell: ({ row }) => {
        const id = row.original.identificador;
        const raw = id.slice(-9);
        return (
          <span className="font-mono text-sm">{raw.slice(0, 5)}/{raw.slice(5)}</span>
        );
      },
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
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        const c = row.original
        const hasAtas = (c._count?.atas ?? 0) > 0
        const hasContratos = (c._count?.contratos ?? 0) > 0
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Ver detalhes"
              onClick={() => navigate(`/contratacoes/${c.identificador}`)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            {hasAtas && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Ver Atas"
                onClick={() => navigate(`/atas?identContratacao=${c.identificador}`)}
              >
                <FileText className="h-3.5 w-3.5" />
              </Button>
            )}
            {hasContratos && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Ver Contratos"
                onClick={() => navigate(`/contratos?identContratacao=${c.identificador}`)}
              >
                <ScrollText className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Ver Itens"
              onClick={() => navigate(`/itens?identContratacao=${c.identificador}`)}
            >
              <Package className="h-3.5 w-3.5" />
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteId(c.identificador)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title="Contratações"
        subtitle="Gerencie as contratações e pregões eletrônicos"
        actions={
          can('create:contratacoes') ? (
            <Button onClick={() => navigate('/contratacoes/nova')}>
              <Plus className="h-4 w-4" />
              Nova Contratação
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
            <SelectItem value="Em_Processamento">Em Processamento</SelectItem>
            <SelectItem value="Processada">Processada</SelectItem>
            <SelectItem value="Inconsistente">Inconsistente</SelectItem>
            <SelectItem value="Disponivel">Disponível</SelectItem>
            <SelectItem value="Encerrada">Encerrada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage="Nenhuma contratacao encontrada."
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Excluir Contratação"
        description={`Tem certeza que deseja excluir a contratacao "${deleteId}"?`}
        confirmLabel="Excluir"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      >
        <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800">
          <TriangleAlert className="mt-0.5 h-10 w-10 shrink-0 text-amber-500" />
          <p className="text-sm leading-relaxed">
            <strong>Atenção:</strong> Esta operação excluirá todas as atas, itens e fornecimentos ligados à contratação.
            Apenas os registros de fornecedores importados na inclusão da contratacao permanecerão na base de dados.
            <br /><br />
            <strong>Esta ação não pode ser desfeita.</strong>
          </p>
        </div>
      </ConfirmDialog>
    </div>
  )
}
