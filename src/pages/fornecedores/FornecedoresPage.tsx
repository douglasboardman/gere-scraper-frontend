import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Eye, ShieldAlert, Loader2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { fornecedoresApi } from '@/api/fornecedores.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { SancoesDialog, useSancoesDialog } from '@/components/shared/SancoesDialog'
import { Button } from '@/components/ui/button'
import { formatCNPJ } from '@/lib/utils'

function formatTelefone(tel: string | null | undefined): string {
  if (!tel) return '—'
  const match = tel.trim().match(/^(\d{2})\s+(\d+)$/)
  if (!match) return tel
  const [, ddd, numero] = match
  return `(${ddd}) ${numero.slice(0, -4)}-${numero.slice(-4)}`
}
import type { IFornecedor } from '@/types'

export function FornecedoresPage() {
  const navigate = useNavigate()
  const { data: fornecedores = [], isLoading } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: () => fornecedoresApi.listar(),
  })

  const sancoesDialog = useSancoesDialog()

  const columns: ColumnDef<IFornecedor, unknown>[] = [
    {
      accessorKey: 'cnpj',
      header: 'CNPJ',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{formatCNPJ(row.original.cnpj)}</span>
      ),
    },
    {
      accessorKey: 'nome',
      header: 'Nome / Razão Social',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.nome ?? row.original.razaoSocial ?? '—'}</p>
          {row.original.razaoSocial && row.original.nome && row.original.razaoSocial !== row.original.nome && (
            <p className="text-xs text-muted-foreground">{row.original.razaoSocial}</p>
          )}
        </div>
      ),
    },
    {
      id: 'email',
      header: 'E-mail',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.email1 ?? row.original.email ?? '—'}
        </span>
      ),
    },
    {
      id: 'telefone',
      header: 'Telefone',
      cell: ({ row }) => (
        <span className="text-sm">
          {formatTelefone(row.original.telefone1 ?? row.original.telefone)}
        </span>
      ),
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
            onClick={() => navigate(`/fornecedores/${row.original.identificador}`)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={sancoesDialog.loading}
            onClick={() =>
              sancoesDialog.consultar(
                row.original.cnpj,
                row.original.nome ?? row.original.razaoSocial ?? 'Fornecedor'
              )
            }
          >
            {sancoesDialog.loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5" />
            )}
            Sanções
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle="Fornecedores registrados nas atas de registro de preços"
      />

      <DataTable
        columns={columns}
        data={fornecedores}
        isLoading={isLoading}
        searchPlaceholder="Buscar por nome ou CNPJ..."
        emptyMessage="Nenhum fornecedor encontrado."
      />

      <SancoesDialog
        open={sancoesDialog.open}
        onClose={sancoesDialog.fechar}
        nomeFornecedor={sancoesDialog.nomeFornecedor}
        sancoes={sancoesDialog.sancoes}
      />
    </div>
  )
}
