import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Plus, Eye, Edit, Send, Trash2, Printer } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { destDespesaLabel } from '@/lib/utils'
import { requisicoesApi } from '@/api/requisicoes.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/store/auth.store'
import { usePermission } from '@/hooks/usePermission'
import type { IRequisicao } from '@/types'

type ConflitoPendente = {
  identificador: string
  observacoesAtuais: string
  conflitos: Array<{
    identFornecimento: string
    descricaoItem: string
    qtdSolicitadaAtual: number
    qtdComprometida: number
    saldoDisponivel: number
    requisicoesConcorrentes: string[]
  }>
}

const ANOTACAO_INICIO = '[ANOTAÇÃO AUTOMÁTICA DO SISTEMA - INÍCIO]'
const ANOTACAO_FIM = '[ANOTAÇÃO AUTOMÁTICA DO SISTEMA - FIM]'

function gerarBlocoAnotacao(conflitos: ConflitoPendente['conflitos']): string {
  const dataHora = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  const detalhes = conflitos
    .map(
      (c) =>
        `"${c.descricaoItem}" (fornecimento: ${c.identFornecimento}) — saldo disponível: ${c.saldoDisponivel}, comprometido por outras requisições enviadas: ${c.qtdComprometida}, solicitado nesta requisição: ${c.qtdSolicitadaAtual} (requisições concorrentes: ${c.requisicoesConcorrentes.join(', ')})`,
    )
    .join('; ')
  const conteudo = `Em ${dataHora}, o sistema detectou conflito de saldo ao tentar enviar esta requisição. Os seguintes fornecimentos possuem saldo insuficiente em razão de outras requisições enviadas pendentes de aprovação: ${detalhes}. A requisição foi mantida como rascunho para que o conflito seja resolvido antes de nova tentativa de envio.`
  return `${ANOTACAO_INICIO}\n${conteudo}\n${ANOTACAO_FIM}`
}

function aplicarAnotacao(observacoesAtuais: string, bloco: string): string {
  const idxInicio = observacoesAtuais.indexOf(ANOTACAO_INICIO)
  const idxFim = observacoesAtuais.indexOf(ANOTACAO_FIM)
  if (idxInicio !== -1 && idxFim !== -1) {
    const antes = observacoesAtuais.slice(0, idxInicio).trimEnd()
    const depois = observacoesAtuais.slice(idxFim + ANOTACAO_FIM.length).trimStart()
    return [antes, bloco, depois].filter(Boolean).join('\n')
  }
  return observacoesAtuais.trim() ? `${observacoesAtuais.trim()}\n${bloco}` : bloco
}

export function MinhasRequisicoesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { isAdmin } = usePermission()
  const [actionDialog, setActionDialog] = useState<{
    type: 'enviar' | 'deletar'
    id: string
    label: string
    observacoes?: string
  } | null>(null)
  const [conflitoPendente, setConflitoPendente] = useState<ConflitoPendente | null>(null)

  const { data: todasRequisicoes = [], isLoading } = useQuery({
    queryKey: ['requisicoes'],
    queryFn: () => requisicoesApi.listar(),
  })

  const requisicoes = useMemo(
    () => todasRequisicoes.filter((r) => r.requisitanteId === user?.id),
    [todasRequisicoes, user?.id]
  )

  const enviarMutation = useMutation({
    mutationFn: (id: string) => requisicoesApi.enviar(id),
    onSuccess: () => {
      toast.success('Requisição enviada para aprovação.')
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      setActionDialog(null)
    },
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { status?: number; data?: { error?: string; conflitos?: ConflitoPendente['conflitos'] } } }
      if (axiosErr.response?.status === 409 && axiosErr.response.data?.conflitos?.length) {
        setConflitoPendente({
          identificador: actionDialog!.id,
          observacoesAtuais: actionDialog?.observacoes ?? '',
          conflitos: axiosErr.response.data.conflitos,
        })
        setActionDialog(null)
      } else {
        toast.error(axiosErr.response?.data?.error ?? 'Erro inesperado')
      }
    },
  })

  const confirmarCienciaMutation = useMutation({
    mutationFn: ({ identificador, novasObservacoes }: { identificador: string; novasObservacoes: string }) =>
      requisicoesApi.atualizar(identificador, { observacoes: novasObservacoes }),
    onSuccess: () => {
      toast.info('Requisição mantida como rascunho. O conflito foi registrado nas observações.')
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      setConflitoPendente(null)
    },
    onError: () => {
      toast.error('Erro ao salvar a anotação de conflito.')
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
    else if (type === 'deletar') deletarMutation.mutate(id)
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
      accessorKey: 'destDespesa',
      header: 'Tipo',
      cell: ({ row }) => (
        <span className="text-sm">{destDespesaLabel(row.original.destDespesa)}</span>
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
        const isDraftOrRejected = req.status === 'Rascunho' || req.status === 'Rejeitada'
        const hasItems = (req._count?.itens ?? 0) > 0
        return (
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              title="Visualizar"
              onClick={() => navigate(`/requisicoes/${req.identificador}`)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>

            {isDraftOrRejected && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  title="Editar"
                  onClick={() => navigate(`/requisicoes/${req.identificador}`)}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                {hasItems && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-blue-600"
                    title="Enviar para aprovação"
                    onClick={() =>
                      setActionDialog({ type: 'enviar', id: req.identificador, label: req.identificador, observacoes: req.observacoes ?? '' })
                    }
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive"
                  title="Excluir"
                  onClick={() =>
                    setActionDialog({ type: 'deletar', id: req.identificador, label: req.identificador })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}

            {(req.status === 'Aprovada' || req.status === 'Empenhada') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Imprimir PDF"
                onClick={() => navigate(`/requisicoes/${req.identificador}/imprimir`)}
              >
                <Printer className="h-3.5 w-3.5" />
              </Button>
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
    deletar: {
      title: 'Excluir Requisição',
      description: `Tem certeza que deseja excluir a requisição "${actionDialog?.label}"? Todos os seus itens também serão excluídos. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'destructive' as const,
    },
  }

  const currentDialog = actionDialog ? dialogConfig[actionDialog.type] : null
  const isMutating =
    enviarMutation.isPending ||
    deletarMutation.isPending

  return (
    <div>
      <PageHeader
        title="Minhas Requisições"
        subtitle="Requisições criadas por você"
        actions={
          !isAdmin && (
            <Button onClick={() => navigate('/requisicoes/nova')}>
              <Plus className="h-4 w-4" />
              Nova Requisição
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={requisicoes}
        isLoading={isLoading}
        emptyMessage="Você não possui requisições."
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

      {conflitoPendente && (
        <Dialog open onOpenChange={() => setConflitoPendente(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Conflito de Saldo Detectado</DialogTitle>
              <DialogDescription>
                Os itens abaixo possuem saldo bloqueado por requisições da sua unidade já enviadas e pendentes de aprovação.
                A requisição será salva como rascunho para que você possa resolver o conflito antes de tentar o envio novamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm max-h-60 overflow-y-auto">
              {conflitoPendente.conflitos.map((c) => (
                <div key={c.identFornecimento} className="rounded-md border p-3 space-y-1">
                  <p className="font-medium">{c.descricaoItem}</p>
                  <p className="text-muted-foreground text-xs">Fornecimento: {c.identFornecimento}</p>
                  <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                    <div><span className="text-muted-foreground">Saldo disponível</span><br />{c.saldoDisponivel}</div>
                    <div><span className="text-muted-foreground">Comprometido</span><br />{c.qtdComprometida}</div>
                    <div><span className="text-muted-foreground">Solicitado aqui</span><br />{c.qtdSolicitadaAtual}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Requisições concorrentes: {c.requisicoesConcorrentes.join(', ')}
                  </p>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConflitoPendente(null)}
                disabled={confirmarCienciaMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  const bloco = gerarBlocoAnotacao(conflitoPendente.conflitos)
                  const novasObservacoes = aplicarAnotacao(conflitoPendente.observacoesAtuais, bloco)
                  confirmarCienciaMutation.mutate({ identificador: conflitoPendente.identificador, novasObservacoes })
                }}
                disabled={confirmarCienciaMutation.isPending}
              >
                Entendi, salvar como rascunho
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
