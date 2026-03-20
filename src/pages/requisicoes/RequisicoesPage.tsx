import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Plus, Eye, Edit, Send, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { requisicoesApi } from '@/api/requisicoes.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import { usePermission } from '@/hooks/usePermission'
import type { IRequisicao, IUsuario, IUnidade } from '@/types'

export function RequisicoesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { isAdmin, isGestor, can } = usePermission()
  const [actionDialog, setActionDialog] = useState<{
    type: 'enviar' | 'aprovar' | 'rejeitar' | 'deletar'
    id: string
    label: string
  } | null>(null)

  const { data: requisicoes = [], isLoading } = useQuery({
    queryKey: ['requisicoes'],
    queryFn: requisicoesApi.listar,
  })

  const enviarMutation = useMutation({
    mutationFn: (id: string) => requisicoesApi.enviar(id),
    onSuccess: () => {
      toast.success('Requisição enviada para aprovação.')
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      setActionDialog(null)
    },
    onError: (error: unknown) => {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado')
    },
  })

  const aprovarMutation = useMutation({
    mutationFn: (id: string) => requisicoesApi.aprovar(id),
    onSuccess: () => {
      toast.success('Requisição aprovada.')
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      setActionDialog(null)
    },
    onError: (error: unknown) => {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado')
    },
  })

  const rejeitarMutation = useMutation({
    mutationFn: (id: string) => requisicoesApi.rejeitar(id),
    onSuccess: () => {
      toast.success('Requisição rejeitada.')
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      setActionDialog(null)
    },
    onError: (error: unknown) => {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado')
    },
  })

  const deletarMutation = useMutation({
    mutationFn: (id: string) => requisicoesApi.deletar(id),
    onSuccess: () => {
      toast.success('Requisição excluída.')
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      setActionDialog(null)
    },
    onError: (error: unknown) => {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado')
    },
  })

  const handleConfirm = () => {
    if (!actionDialog) return
    const { type, id } = actionDialog
    if (type === 'enviar') enviarMutation.mutate(id)
    else if (type === 'aprovar') aprovarMutation.mutate(id)
    else if (type === 'rejeitar') rejeitarMutation.mutate(id)
    else if (type === 'deletar') deletarMutation.mutate(id)
  }

  const isOwner = (req: IRequisicao) => {
    const reqUser = req.requisitante
    const userId = typeof reqUser === 'string' ? reqUser : reqUser?._id
    return userId === user?._id
  }

  const columns: ColumnDef<IRequisicao, unknown>[] = [
    {
      accessorKey: 'identificador',
      header: 'Identificador',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.original.identificador}</span>
      ),
    },
    {
      id: 'requisitante',
      header: 'Requisitante',
      cell: ({ row }) => {
        const r = row.original.requisitante
        return (
          <span className="text-sm">
            {typeof r === 'string' ? r : (r as IUsuario)?.nome ?? '—'}
          </span>
        )
      },
    },
    {
      id: 'unidade',
      header: 'Unidade',
      cell: ({ row }) => {
        const u = row.original.idUnidade
        return (
          <span className="text-sm">
            {typeof u === 'string' ? u : (u as IUnidade)?.nomeAbrev ?? (u as IUnidade)?.nome ?? '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.tipo ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'dataCriacao',
      header: 'Data Criação',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      ),
    },
    {
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => {
        const req = row.original
        const owner = isOwner(req)
        return (
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => navigate(`/requisicoes/${req._id}`)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>

            {/* Owner actions on Rascunho */}
            {owner && req.status === 'Rascunho' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => navigate(`/requisicoes/${req._id}`)}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-600"
                  onClick={() =>
                    setActionDialog({ type: 'enviar', id: req._id, label: req.identificador })
                  }
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive"
                  onClick={() =>
                    setActionDialog({ type: 'deletar', id: req._id, label: req.identificador })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}

            {/* Gestor/Admin actions on Enviada */}
            {(isAdmin || isGestor) && req.status === 'Enviada' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-green-700"
                  onClick={() =>
                    setActionDialog({ type: 'aprovar', id: req._id, label: req.identificador })
                  }
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive"
                  onClick={() =>
                    setActionDialog({ type: 'rejeitar', id: req._id, label: req.identificador })
                  }
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        )
      },
    },
  ]

  const dialogConfig = {
    enviar: {
      title: 'Enviar Requisição',
      description: `Deseja enviar a requisição "${actionDialog?.label}" para aprovação?`,
      confirmLabel: 'Enviar',
      variant: 'default' as const,
    },
    aprovar: {
      title: 'Aprovar Requisição',
      description: `Deseja aprovar a requisição "${actionDialog?.label}"?`,
      confirmLabel: 'Aprovar',
      variant: 'default' as const,
    },
    rejeitar: {
      title: 'Rejeitar Requisição',
      description: `Deseja rejeitar a requisição "${actionDialog?.label}"?`,
      confirmLabel: 'Rejeitar',
      variant: 'destructive' as const,
    },
    deletar: {
      title: 'Excluir Requisição',
      description: `Tem certeza que deseja excluir a requisição "${actionDialog?.label}"?`,
      confirmLabel: 'Excluir',
      variant: 'destructive' as const,
    },
  }

  const currentDialog = actionDialog ? dialogConfig[actionDialog.type] : null
  const isMutating =
    enviarMutation.isPending ||
    aprovarMutation.isPending ||
    rejeitarMutation.isPending ||
    deletarMutation.isPending

  return (
    <div>
      <PageHeader
        title="Requisições"
        subtitle="Gerencie as requisições de materiais e serviços"
        actions={
          <Button onClick={() => navigate('/requisicoes/nova')}>
            <Plus className="h-4 w-4" />
            Nova Requisição
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={requisicoes}
        isLoading={isLoading}
        emptyMessage="Nenhuma requisição encontrada."
      />

      {actionDialog && currentDialog && (
        <ConfirmDialog
          open
          title={currentDialog.title}
          description={currentDialog.description}
          confirmLabel={currentDialog.confirmLabel}
          variant={currentDialog.variant}
          isLoading={isMutating}
          onConfirm={handleConfirm}
          onCancel={() => setActionDialog(null)}
        />
      )}
    </div>
  )
}
