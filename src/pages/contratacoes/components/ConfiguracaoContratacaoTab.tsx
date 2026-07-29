import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, X, Check } from 'lucide-react'
import { configContratacaoApi } from '@/api/configContratacao.api'
import { usuariosApi } from '@/api/usuarios.api'
import { qk } from '@/lib/query-keys'
import { usePermission } from '@/hooks/usePermission'
import { useAuthStore } from '@/store/auth.store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import type { AtualizarConfigContratacaoData } from '@/types'

interface Props {
  identContratacao: string
}

export function ConfiguracaoContratacaoTab({ identContratacao }: Props) {
  const queryClient = useQueryClient()
  const { isGestorUnidade, isAdmin } = usePermission()
  const usuario = useAuthStore((s) => s.user)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState<AtualizarConfigContratacaoData>({})

  const { data: config, isLoading } = useQuery({
    queryKey: qk.configContratacao.byContratacao(identContratacao),
    queryFn: () => configContratacaoApi.obter(identContratacao),
  })

  const { data: usuariosUnidade = [] } = useQuery({
    queryKey: qk.usuarios.byUnidade,
    queryFn: () => usuariosApi.listar(),
    enabled: isGestorUnidade || isAdmin,
  })

  const mutation = useMutation({
    mutationFn: (data: AtualizarConfigContratacaoData) =>
      configContratacaoApi.atualizar(identContratacao, data),
    onSuccess: () => {
      toast.success('Configurações atualizadas com sucesso.')
      queryClient.invalidateQueries({
        queryKey: qk.configContratacao.byContratacao(identContratacao),
      })
      setEditMode(false)
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao atualizar configurações.')
    },
  })

  if (isLoading) return <Skeleton className="h-48 w-full" />

  if (!config) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Configurações ainda não disponíveis para esta contratação.
            Aguarde a conclusão da importação.
          </p>
        </CardContent>
      </Card>
    )
  }

  const isRequerente = config.usuarioRequerente === usuario?.id
  const podeEditar = isGestorUnidade || isAdmin || isRequerente
  const podeEditarRequerente = isGestorUnidade || isAdmin

  const handleEdit = () => {
    setDraft({
      permitirReqFornecNaoVigentes: config.permitirReqFornecNaoVigentes,
      valorMinimoRequisicao: config.valorMinimoRequisicao,
      usuarioRequerente: config.usuarioRequerente,
    })
    setEditMode(true)
  }

  const nomeRequerente = config.usuarioRequerente
    ? (usuariosUnidade.find((u) => u.id === config.usuarioRequerente)?.nome ?? config.usuarioRequerente)
    : '— Não definido —'

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* Ações */}
        <div className="flex justify-end gap-2">
          {editMode ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => mutation.mutate(draft)}
                disabled={mutation.isPending}
              >
                <Check className="h-4 w-4" />
                {mutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          ) : podeEditar ? (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          ) : null}
        </div>

        {/* Campo: Usuário Requerente */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Usuário Requerente
          </span>
          {editMode && podeEditarRequerente ? (
            <select
              className="w-full border border-input rounded-md bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={draft.usuarioRequerente ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, usuarioRequerente: e.target.value || null }))
              }
            >
              <option value="">— Nenhum —</option>
              {usuariosUnidade.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-1 text-sm font-medium">{nomeRequerente}</div>
          )}
        </div>

        {/* Campo: Valor Mínimo para Requisições */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Valor Mínimo para Requisições de Empenho
          </Label>
          {editMode ? (
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Sem valor mínimo"
              className="max-w-xs"
              value={draft.valorMinimoRequisicao ?? ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  valorMinimoRequisicao: e.target.value ? Number(e.target.value) : null,
                }))
              }
            />
          ) : (
            <div className="mt-1 text-sm font-medium">
              {config.valorMinimoRequisicao != null
                ? formatCurrency(config.valorMinimoRequisicao)
                : '— Sem limite mínimo —'}
            </div>
          )}
        </div>

        {/* Campo: Permitir requisições em fornecimentos não vigentes */}
        <div className="flex items-center justify-between gap-4 border-t pt-4">
          <div>
            <p className="text-sm font-medium">
              Permitir requisições em fornecimentos não vigentes
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permite criar requisições de empenho para fornecimentos com vigência encerrada
              (ex.: ajustes e regularizações legadas).
            </p>
          </div>
          {editMode ? (
            <Switch
              checked={draft.permitirReqFornecNaoVigentes ?? false}
              onCheckedChange={(v) =>
                setDraft((d) => ({ ...d, permitirReqFornecNaoVigentes: v }))
              }
            />
          ) : (
            <span className="text-sm font-medium shrink-0">
              {config.permitirReqFornecNaoVigentes ? 'Sim' : 'Não'}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Atualizado em{' '}
          {new Date(config.updatedAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </CardContent>
    </Card>
  )
}
