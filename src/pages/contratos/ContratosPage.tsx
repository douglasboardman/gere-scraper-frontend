import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, PlusCircle, Search, Trash2, TriangleAlert } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { contratosApi } from '@/api/contratos.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatCNPJ, ENTITY } from '@/lib/utils'
import { usePermission } from '@/hooks/usePermission'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { IContrato } from '@/types'

export function ContratosPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { can, isAdmin, isGestorUnidade } = usePermission()
  const queryClient = useQueryClient()
  const identContratacao = searchParams.get('identContratacao') ?? undefined
  const [uasgFilter, setUasgFilter] = useState('')
  const [cnpjFilter, setCnpjFilter] = useState('')
  const [objetoFilter, setObjetoFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ['contratos', identContratacao],
    queryFn: () => contratosApi.listar({ identContratacao }),
  })

  const deleteMutation = useMutation({
    mutationFn: (identificador: string) => contratosApi.deletar(identificador),
    onSuccess: () => {
      toast.success('Contrato excluído com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      setDeleteId(null)
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message ??
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao excluir contrato.'
      toast.error(msg)
      setDeleteId(null)
    },
  })

  const podeExcluir = isAdmin || isGestorUnidade

  const contratosFiltrados = contratos.filter((c) => {
    if (uasgFilter.trim() && !c.uasgContratante.includes(uasgFilter.trim())) return false
    if (cnpjFilter.trim() && !(c.fornecedor?.cnpj ?? '').replace(/\D/g, '').includes(cnpjFilter.replace(/\D/g, ''))) return false
    if (objetoFilter.trim() && !(c.objeto ?? '').toLowerCase().includes(objetoFilter.toLowerCase())) return false
    if (statusFilter && c.status !== statusFilter) return false
    return true
  })

  const columns: ColumnDef<IContrato, unknown>[] = [
    {
      id: 'contratacao',
      header: 'Contratação',
      cell: ({ row }) => {
        const ct = row.original.contratacao
        if (!ct) return <span className="font-mono text-xs text-muted-foreground">{typeof row.original.identContratacao === 'string' ? row.original.identContratacao : '—'}</span>
        return (
          <span className="font-mono text-sm font-medium whitespace-nowrap">
            {ct.numContratacao}/{ct.anoContratacao}
          </span>
        )
      },
    },
    {
      accessorKey: 'numContrato',
      header: 'Nº Contrato',
      cell: ({ row }) => (
        <div>
          <p className="font-mono text-xs text-muted-foreground">{row.original.tipoContrato ?? 'Contrato'}</p>
          <span className="font-mono text-sm">{row.original.numContrato}</span>
        </div>
      ),
    },
    {
      id: 'objeto',
      header: 'Objeto',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.objeto ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'uasgContratante',
      header: 'UASG Contratante',
      cell: ({ row }) => (
        <div>
          {row.original.unGestoraOrigemContrato && (
            <p className="font-mono text-xs text-muted-foreground">Origem: {row.original.unGestoraOrigemContrato}</p>
          )}
          <span className="text-sm font-mono">{row.original.uasgContratante}</span>
        </div>
      ),
    },
    {
      id: 'fornecedor',
      header: 'Fornecedor',
      cell: ({ row }) => (
        <div>
          <p className="font-mono text-xs text-muted-foreground">{formatCNPJ(row.original.fornecedor?.cnpj ?? '')}</p>
          {row.original.fornecedor?.nome && (
            <p className="text-sm">{row.original.fornecedor.nome}</p>
          )}
        </div>
      ),
    },
    {
      id: 'vigencia',
      header: 'Vigência',
      cell: ({ row }) => {
        const ini = row.original.iniVigencia ? format(new Date(row.original.iniVigencia), 'dd/MM/yyyy', { locale: ptBR }) : '—'
        const fim = row.original.fimVigencia ? format(new Date(row.original.fimVigencia), 'dd/MM/yyyy', { locale: ptBR }) : '—'
        return <span className="text-xs whitespace-nowrap">{ini} – {fim}</span>
      },
    },
    {
      accessorKey: 'valorGlobal',
      header: 'Valor Global',
      cell: ({ row }) => (
        <span className="text-sm font-medium">{formatCurrency(row.original.valorGlobal)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'acoes',
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Ver detalhes"
            onClick={() => navigate(`/contratos/${row.original.identificador}`)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {podeExcluir && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Excluir contrato"
              onClick={() => setDeleteId(row.original.identificador)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const STATUS_OPTIONS = ['Processado', 'Disponivel', 'Encerrado', 'Em_Processamento', 'Inconsistente']

  return (
    <div>
      <PageHeader
        title="Contratos"
        subtitle={identContratacao ? `Filtrando por Contratação: ${identContratacao}` : "Contratos administrativos vinculados às contratações"}
        entity={ENTITY.contrato}
        actions={
          can('create:contratos') ? (
            <Button size="sm" onClick={() => navigate('/contratos/novo')}>
              <PlusCircle className="h-4 w-4 mr-1" />
              Novo Contrato
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 rounded-lg border bg-muted/40 p-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Filtrar por:</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="UASG contratante..."
              value={uasgFilter}
              onChange={(e) => setUasgFilter(e.target.value)}
              className="pl-8 bg-background"
            />
          </div>
          <Input
            placeholder="CNPJ contratado..."
            value={cnpjFilter}
            onChange={(e) => setCnpjFilter(e.target.value)}
            className="bg-background"
          />
          <Input
            placeholder="Objeto do contrato..."
            value={objetoFilter}
            onChange={(e) => setObjetoFilter(e.target.value)}
            className="bg-background"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={contratosFiltrados}
        isLoading={isLoading}
        searchable={false}
        emptyMessage="Nenhum contrato encontrado."
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Excluir Contrato"
        description={`Confirma a exclusão do contrato "${deleteId}"?`}
        confirmLabel="Excluir"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      >
        <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800">
          <TriangleAlert className="mt-0.5 h-10 w-10 shrink-0 text-amber-500" />
          <p className="text-sm leading-relaxed">
            <strong>Atenção:</strong> Esta operação excluirá permanentemente o contrato e todos os seus
            fornecimentos vinculados. Requisições em rascunho que referenciem esses fornecimentos também
            serão removidas.<br /><br />
            A exclusão será <strong>bloqueada</strong> caso existam requisições com status
            <em> Enviada, Aprovada, Rejeitada</em> ou <em>Empenhada</em> vinculadas a este contrato.<br /><br />
            <strong>Esta ação não pode ser desfeita.</strong>
          </p>
        </div>
      </ConfirmDialog>
    </div>
  )
}
