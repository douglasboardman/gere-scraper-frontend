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
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { SaldoReservadoModal } from './SaldoReservadoModal'
import type {
  AtualizarConfigContratacaoData,
  IConfigContratacao,
  IFornecimento,
  IFornecSaldoReservado,
  IItem,
} from '@/types'

interface Props {
  identContratacao: string
  fornecimentosUnidade: IFornecimento[]
}

export function ConfiguracaoContratacaoTab({ identContratacao, fornecimentosUnidade }: Props) {
  const queryClient = useQueryClient()
  const { isGestorUnidade, isAdmin } = usePermission()
  const usuario = useAuthStore((s) => s.user)

  const { data: config, isLoading } = useQuery({
    queryKey: qk.configContratacao.byContratacao(identContratacao),
    queryFn: () => configContratacaoApi.obter(identContratacao),
  })

  // Sem condição — necessário para resolver UUID → nome para qualquer role autenticado
  const { data: usuariosUnidade = [] } = useQuery({
    queryKey: qk.usuarios.byUnidade,
    queryFn: () => usuariosApi.listar(),
  })

  const mutation = useMutation({
    mutationFn: (data: AtualizarConfigContratacaoData) =>
      configContratacaoApi.atualizar(identContratacao, data),
    onSuccess: () => {
      toast.success('Configurações atualizadas com sucesso.')
      queryClient.invalidateQueries({
        queryKey: qk.configContratacao.byContratacao(identContratacao),
      })
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao atualizar configurações.')
    },
  })

  if (isLoading) return <Skeleton className="h-48 w-full md:max-w-[50%]" />

  if (!config) {
    return (
      <div className="w-full md:max-w-[50%]">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Configurações ainda não disponíveis para esta contratação.
              Aguarde a conclusão da importação.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isRequerente = config.usuarioRequerente === usuario?.id
  const podeEditar = isGestorUnidade || isAdmin || isRequerente
  const podeEditarRequerente = isGestorUnidade || isAdmin

  const handleSave = (data: AtualizarConfigContratacaoData) => {
    mutation.mutate(data)
  }

  return (
    <div className="w-full md:max-w-[50%] space-y-4">
      <CardRequerente
        config={config}
        usuariosUnidade={usuariosUnidade}
        podeEditarRequerente={podeEditarRequerente}
        onSave={handleSave}
        isPending={mutation.isPending}
      />
      <CardValorMinimo
        config={config}
        podeEditar={podeEditar}
        onSave={handleSave}
        isPending={mutation.isPending}
      />
      <CardPermitirNaoVigentes
        config={config}
        podeEditar={podeEditar}
        onSave={handleSave}
        isPending={mutation.isPending}
      />
      <CardSaldoReservado
        config={config}
        fornecimentosUnidade={fornecimentosUnidade}
        podeEditar={podeEditar}
        onSave={handleSave}
        isPending={mutation.isPending}
      />
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
    </div>
  )
}

// ─── CardRequerente ─────────────────────────────────────────────

interface CardRequerenteProps {
  config: IConfigContratacao
  usuariosUnidade: Array<{ id: string; nome: string }>
  podeEditarRequerente: boolean
  onSave: (data: AtualizarConfigContratacaoData) => void
  isPending: boolean
}

function CardRequerente({
  config,
  usuariosUnidade,
  podeEditarRequerente,
  onSave,
  isPending,
}: CardRequerenteProps) {
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)

  const nomeRequerente = config.usuarioRequerente
    ? (usuariosUnidade.find((u) => u.id === config.usuarioRequerente)?.nome ??
      config.usuarioRequerente)
    : '— Não definido —'

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Usuário Requerente
            </span>
            {edit ? (
              <select
                className="block w-full border border-input rounded-md bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={draft ?? ''}
                onChange={(e) => setDraft(e.target.value || null)}
              >
                <option value="">— Nenhum —</option>
                {usuariosUnidade.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-medium">{nomeRequerente}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {edit ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEdit(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    onSave({ usuarioRequerente: draft })
                    setEdit(false)
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : podeEditarRequerente ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft(config.usuarioRequerente)
                  setEdit(true)
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── CardValorMinimo ────────────────────────────────────────────

interface CardValorMinimoProps {
  config: IConfigContratacao
  podeEditar: boolean
  onSave: (data: AtualizarConfigContratacaoData) => void
  isPending: boolean
}

function CardValorMinimo({ config, podeEditar, onSave, isPending }: CardValorMinimoProps) {
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<number | null>(null)

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Valor Mínimo para Requisições de Empenho
            </span>
            {edit ? (
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Sem valor mínimo"
                className="max-w-xs"
                value={draft ?? ''}
                onChange={(e) =>
                  setDraft(e.target.value ? Number(e.target.value) : null)
                }
              />
            ) : (
              <p className="text-sm font-medium">
                {config.valorMinimoRequisicao != null
                  ? formatCurrency(config.valorMinimoRequisicao)
                  : '— Sem limite mínimo —'}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {edit ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEdit(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    onSave({ valorMinimoRequisicao: draft })
                    setEdit(false)
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : podeEditar ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft(config.valorMinimoRequisicao)
                  setEdit(true)
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── CardPermitirNaoVigentes ────────────────────────────────────

interface CardPermitirNaoVigentesProps {
  config: IConfigContratacao
  podeEditar: boolean
  onSave: (data: AtualizarConfigContratacaoData) => void
  isPending: boolean
}

function CardPermitirNaoVigentes({
  config,
  podeEditar,
  onSave,
  isPending,
}: CardPermitirNaoVigentesProps) {
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(false)

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Requisições em Fornecimentos Não Vigentes
            </span>
            <p className="text-xs text-muted-foreground">
              Permite criar requisições de empenho para fornecimentos com vigência encerrada.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {edit ? (
              <>
                <Switch checked={draft} onCheckedChange={setDraft} />
                <Button variant="outline" size="sm" onClick={() => setEdit(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    onSave({ permitirReqFornecNaoVigentes: draft })
                    setEdit(false)
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm font-medium">
                  {config.permitirReqFornecNaoVigentes ? 'Sim' : 'Não'}
                </span>
                {podeEditar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDraft(config.permitirReqFornecNaoVigentes)
                      setEdit(true)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── CardSaldoReservado ─────────────────────────────────────────

interface CardSaldoReservadoProps {
  config: IConfigContratacao
  fornecimentosUnidade: IFornecimento[]
  podeEditar: boolean
  onSave: (data: AtualizarConfigContratacaoData) => void
  isPending: boolean
}

function CardSaldoReservado({
  config,
  fornecimentosUnidade,
  podeEditar,
  onSave,
  isPending: _isPending,
}: CardSaldoReservadoProps) {
  const [editMode, setEditMode] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const reservas = config.fornecSaldoReservado ?? []

  const fornMap = new Map(fornecimentosUnidade.map((f) => [f.identificador, f]))

  const resolveItem = (identFornecimento: string) => {
    const forn = fornMap.get(identFornecimento)
    const item = typeof forn?.identItem === 'object' ? (forn.identItem as IItem) : null
    return {
      seq: item?.sequencialItemPregao ?? item?.numItem ?? '—',
      desc: item?.descBreve ?? item?.descricaoBreve ?? '—',
    }
  }

  const handleModalConcluir = (novasReservas: IFornecSaldoReservado[]) => {
    onSave({ fornecSaldoReservado: novasReservas })
    setModalOpen(false)
    setEditMode(false)
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Saldos Reservados por Item
          </span>
          <div className="flex gap-2 shrink-0">
            {editMode ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  Gerenciar
                </Button>
              </>
            ) : podeEditar ? (
              <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>

        {reservas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum saldo reservado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground w-16">
                  Nº Item
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                  Descrição
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right">
                  Saldo Reservado
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservas.map((r) => {
                const { seq, desc } = resolveItem(r.identFornecimento)
                return (
                  <TableRow key={r.identFornecimento}>
                    <TableCell className="font-mono text-sm">{seq}</TableCell>
                    <TableCell className="text-sm">{desc}</TableCell>
                    <TableCell className="text-sm text-right font-mono tabular-nums">
                      {r.saldoReservado.toLocaleString('pt-BR', { minimumFractionDigits: 5 })}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        <SaldoReservadoModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          fornecimentosUnidade={fornecimentosUnidade}
          reservasAtuais={reservas}
          onConcluir={handleModalConcluir}
        />
      </CardContent>
    </Card>
  )
}
