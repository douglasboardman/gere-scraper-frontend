import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import {
  Activity,
  CheckCircle2,
  Eye,
  FilePlus2,
  Loader2,
  Mail,
  Megaphone,
  Power,
  Radio,
  RefreshCw,
  Rocket,
  Settings2,
} from 'lucide-react'
import { notificacoesAdminApi } from '@/api/notificacoes-admin.api'
import type {
  AtualizarNotificacaoModeloRascunhoInput,
  NotificacaoCatalogoEvento,
  NotificacaoEventoDetalhe,
  NotificacaoEventoResumo,
  NotificacaoDisparoResumo,
  NotificacaoDisparoDetalhe,
  NotificacaoModeloDetalhe,
  NotificacaoModeloResumo,
  NotificacaoSimulacao,
  NotificacoesRetencaoDiagnostico,
} from '@/api/notificacoes-admin.api'
import { getApiErrorMessage } from '@/lib/api-error'
import { qk } from '@/lib/query-keys'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

type AdminTab = 'eventos' | 'modelos' | 'disparos'
type AgendamentoEditor =
  | { tipo: 'IMEDIATO' }
  | { tipo: 'APOS_INTERVALO'; valor: number; unidade: 'MINUTOS' | 'HORAS' }
  | { tipo: 'PROXIMO_HORARIO'; hora: string; fuso: string }

type GrupoDestinatarioEditor = {
  seletor: 'PERFIS_DA_UNIDADE' | 'PERFIS_DA_UORG' | 'USUARIO_REFERENCIADO' | 'ADMINS_GLOBAIS'
  referencia: string
  perfis: string[]
  excluirAutor: boolean
}

type AcaoEditor = {
  codigo: string
  rotulo: string
  ordem: number
  exigeConfirmacao: boolean
}

const ROLES_NOTIFICACAO = [
  ['admin', 'Administrador'],
  ['gestor_orgao', 'Gestor do órgão'],
  ['gestor_unidade', 'Gestor de unidade'],
  ['gestor_contratacoes', 'Gestor de contratações'],
  ['gestor_contratos', 'Gestor de contratos'],
  ['gestor_financeiro', 'Gestor financeiro'],
  ['requisitante', 'Requisitante'],
] as const

const ACOES_POR_EVENTO: Record<string, Array<{ codigo: string; rotulo: string; exigeConfirmacao: boolean }>> = {
  'usuario.acesso_solicitado': [{ codigo: 'ABRIR_USUARIO', rotulo: 'Abrir usuário', exigeConfirmacao: false }],
  'requisicao.enviada': [
    { codigo: 'ABRIR_REQUISICAO', rotulo: 'Abrir requisição', exigeConfirmacao: false },
    { codigo: 'ANALISAR_REQUISICAO', rotulo: 'Analisar requisição', exigeConfirmacao: false },
    { codigo: 'APROVAR_REQUISICAO', rotulo: 'Aprovar requisição', exigeConfirmacao: true },
  ],
  'requisicao.aprovada': [{ codigo: 'ABRIR_REQUISICAO', rotulo: 'Abrir requisição', exigeConfirmacao: false }],
  'importacao.finalizada': [{ codigo: 'ABRIR_RESULTADO_IMPORTACAO', rotulo: 'Abrir resultado da importação', exigeConfirmacao: false }],
}

function normalizarAgendamento(raw: unknown): AgendamentoEditor {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const valor = raw as Record<string, unknown>
    if (valor.tipo === 'APOS_INTERVALO' && typeof valor.valor === 'number' && (valor.unidade === 'MINUTOS' || valor.unidade === 'HORAS')) {
      return { tipo: 'APOS_INTERVALO', valor: valor.valor, unidade: valor.unidade }
    }
    if (valor.tipo === 'PROXIMO_HORARIO' && typeof valor.hora === 'string' && typeof valor.fuso === 'string') {
      return { tipo: 'PROXIMO_HORARIO', hora: valor.hora, fuso: valor.fuso }
    }
  }
  return { tipo: 'IMEDIATO' }
}

const DEFAULT_BODY = {
  versao: 1,
  blocos: [{ tipo: 'paragrafo', conteudo: [{ tipo: 'texto', valor: 'Configure o conteúdo desta notificação.' }] }],
}

const DEFAULT_RECIPIENTS: unknown[] = []
const DEFAULT_ACTIONS: unknown[] = []

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function StatusBadge({ active, version }: { active: boolean; version?: { numero: number } | null }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={active ? 'success' : 'secondary'}>{active ? 'Ativo' : 'Inativo'}</Badge>
      {version ? <Badge variant="outline">v{version.numero}</Badge> : <Badge variant="outline">Sem versão vigente</Badge>}
    </div>
  )
}

function CorpoNotificacaoPreview({ corpo }: { corpo: unknown }) {
  const documento = corpo && typeof corpo === 'object' && !Array.isArray(corpo)
    ? corpo as { blocos?: Array<{ conteudo?: Array<{ tipo?: string; valor?: string; campo?: string; codigo?: string; negrito?: boolean; italico?: boolean }> }> }
    : null
  if (!documento?.blocos?.length) return <p className="text-sm text-muted-foreground">Sem conteúdo.</p>

  return (
    <div className="space-y-3 rounded-md border bg-background p-4 text-sm leading-6">
      {documento.blocos.map((bloco, blocoIndex) => (
        <p key={blocoIndex}>
          {(bloco.conteudo ?? []).map((item, itemIndex) => {
            const valor = item.tipo === 'variavel'
              ? item.valor ?? item.campo ?? ''
              : item.tipo === 'acao'
                ? `[${item.codigo ?? 'ação'}]`
                : item.valor ?? ''
            const conteudo = <span className={item.tipo === 'acao' ? 'text-primary' : undefined}>{valor}</span>
            if (item.negrito && item.italico) return <strong key={itemIndex}><em>{conteudo}</em></strong>
            if (item.negrito) return <strong key={itemIndex}>{conteudo}</strong>
            if (item.italico) return <em key={itemIndex}>{conteudo}</em>
            return <span key={itemIndex}>{conteudo}</span>
          })}
        </p>
      ))}
    </div>
  )
}

function parseJson(value: string, label: string) {
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`${label} precisa conter um JSON válido.`)
  }
}

function parseEditorArray<T>(value: string): T[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed as T[] : []
  } catch {
    return []
  }
}

export function NotificacoesAdminPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<AdminTab>('eventos')
  const [createOpen, setCreateOpen] = useState(false)
  const [createType, setCreateType] = useState<AdminTab>('eventos')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [selectedDisparoId, setSelectedDisparoId] = useState<string | null>(null)
  const [simulacao, setSimulacao] = useState<NotificacaoSimulacao | null>(null)
  const [eventCode, setEventCode] = useState('')
  const [eventName, setEventName] = useState('')
  const [modelCode, setModelCode] = useState('')
  const [modelName, setModelName] = useState('')
  const [modelEventId, setModelEventId] = useState('')

  const eventosQuery = useQuery({
    queryKey: qk.notificacoes.adminEventos,
    queryFn: notificacoesAdminApi.listarEventos,
  })
  const catalogoQuery = useQuery({
    queryKey: qk.notificacoes.adminCatalogo,
    queryFn: notificacoesAdminApi.listarCatalogo,
  })
  const modelosQuery = useQuery({
    queryKey: qk.notificacoes.adminModelos,
    queryFn: notificacoesAdminApi.listarModelos,
  })
  const diagnosticoQuery = useQuery({
    queryKey: qk.notificacoes.adminDiagnostico,
    queryFn: notificacoesAdminApi.diagnostico,
    refetchInterval: 30_000,
  })
  const retencaoQuery = useQuery<NotificacoesRetencaoDiagnostico>({
    queryKey: qk.notificacoes.adminRetencao,
    queryFn: notificacoesAdminApi.diagnosticoRetencao,
    refetchInterval: 60_000,
  })
  const disparosQuery = useQuery({
    queryKey: qk.notificacoes.adminDisparos,
    queryFn: () => notificacoesAdminApi.listarDisparos({ limite: 50 }),
    enabled: tab === 'disparos',
  })
  const eventoQuery = useQuery({
    queryKey: qk.notificacoes.adminEvento(selectedEventId ?? ''),
    queryFn: () => notificacoesAdminApi.obterEvento(selectedEventId!),
    enabled: !!selectedEventId,
  })
  const modeloQuery = useQuery({
    queryKey: qk.notificacoes.adminModelo(selectedModelId ?? ''),
    queryFn: () => notificacoesAdminApi.obterModelo(selectedModelId!),
    enabled: !!selectedModelId,
  })
  const disparoQuery = useQuery({
    queryKey: qk.notificacoes.adminDisparo(selectedDisparoId ?? ''),
    queryFn: () => notificacoesAdminApi.obterDisparo(selectedDisparoId!),
    enabled: !!selectedDisparoId,
  })
  const capturaHabilitada = diagnosticoQuery.data?.captura?.habilitada

  const invalidateAdmin = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.notificacoes.adminEventos }),
      queryClient.invalidateQueries({ queryKey: qk.notificacoes.adminModelos }),
      queryClient.invalidateQueries({ queryKey: qk.notificacoes.adminDisparos }),
      selectedEventId
        ? queryClient.invalidateQueries({ queryKey: qk.notificacoes.adminEvento(selectedEventId) })
        : Promise.resolve(),
      selectedModelId
        ? queryClient.invalidateQueries({ queryKey: qk.notificacoes.adminModelo(selectedModelId) })
        : Promise.resolve(),
    ])
  }

  const mutationOptions = {
    onSuccess: async () => {
      await invalidateAdmin()
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Não foi possível concluir a operação.')),
  }

  const createEventMutation = useMutation({
    mutationFn: () => notificacoesAdminApi.criarEvento({ codigo: eventCode, nome: eventName }),
    ...mutationOptions,
    onSuccess: async (data) => {
      await mutationOptions.onSuccess()
      setCreateOpen(false)
      setEventCode('')
      setEventName('')
      if (data?.id) setSelectedEventId(data.id)
      toast.success('Evento criado como rascunho.')
    },
  })

  const createModelMutation = useMutation({
    mutationFn: () => notificacoesAdminApi.criarModelo({ codigo: modelCode, nome: modelName, eventoId: modelEventId }),
    ...mutationOptions,
    onSuccess: async (data) => {
      await mutationOptions.onSuccess()
      setCreateOpen(false)
      setModelCode('')
      setModelName('')
      setModelEventId('')
      if (data?.id) setSelectedModelId(data.id)
      toast.success('Modelo criado com rascunho inicial.')
    },
  })

  const eventPublishMutation = useMutation({
    mutationFn: ({ id, revisao }: { id: string; revisao: number }) => notificacoesAdminApi.publicarEvento(id, revisao),
    ...mutationOptions,
    onSuccess: () => toast.success('Versão do evento publicada.'),
  })
  const eventPromoteMutation = useMutation({
    mutationFn: ({ id, versaoId, revisao }: { id: string; versaoId: string; revisao: number }) => notificacoesAdminApi.promoverEvento(id, versaoId, revisao),
    ...mutationOptions,
    onSuccess: () => toast.success('Versão do evento promovida.'),
  })
  const eventActivateMutation = useMutation({
    mutationFn: ({ id, ativo, revisao }: { id: string; ativo: boolean; revisao: number }) => notificacoesAdminApi.ativarEvento(id, ativo, revisao),
    ...mutationOptions,
    onSuccess: (_data, variables) => toast.success(variables.ativo ? 'Evento ativado.' : 'Evento desativado.'),
  })
  const modelPublishMutation = useMutation({
    mutationFn: ({ id, revisao }: { id: string; revisao: number }) => notificacoesAdminApi.publicarModelo(id, revisao),
    ...mutationOptions,
    onSuccess: () => toast.success('Versão do modelo publicada.'),
  })
  const modelPromoteMutation = useMutation({
    mutationFn: ({ id, versaoId, revisao }: { id: string; versaoId: string; revisao: number }) => notificacoesAdminApi.promoverModelo(id, versaoId, revisao),
    ...mutationOptions,
    onSuccess: () => toast.success('Versão do modelo promovida.'),
  })
  const modelActivateMutation = useMutation({
    mutationFn: ({ id, ativo, revisao }: { id: string; ativo: boolean; revisao: number }) => notificacoesAdminApi.ativarModelo(id, ativo, revisao),
    ...mutationOptions,
    onSuccess: (_data, variables) => toast.success(variables.ativo ? 'Modelo ativado.' : 'Modelo desativado.'),
  })

  const anyMutationPending = [
    createEventMutation,
    createModelMutation,
    eventPublishMutation,
    eventPromoteMutation,
    eventActivateMutation,
    modelPublishMutation,
    modelPromoteMutation,
    modelActivateMutation,
  ].some((mutation) => mutation.isPending)

  const eventColumns = useMemo<ColumnDef<NotificacaoEventoResumo, unknown>[]>(() => [
    {
      accessorKey: 'codigo',
      header: 'Código',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.codigo}</span>,
    },
    { accessorKey: 'nome', header: 'Nome' },
    {
      accessorKey: 'ativo',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge active={row.original.ativo} version={row.original.versaoAtiva} />,
    },
    {
      accessorKey: 'totalModelos',
      header: 'Modelos',
      cell: ({ row }) => <span className="text-sm">{row.original.totalModelos}</span>,
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedEventId(row.original.id)}>
          <Eye className="mr-2 h-4 w-4" /> Detalhes
        </Button>
      ),
    },
  ], [])

  const modelColumns = useMemo<ColumnDef<NotificacaoModeloResumo, unknown>[]>(() => [
    {
      accessorKey: 'codigo',
      header: 'Código',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.codigo}</span>,
    },
    { accessorKey: 'nome', header: 'Nome' },
    {
      id: 'evento',
      header: 'Evento',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.evento.codigo}</span>,
    },
    {
      accessorKey: 'ativo',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge active={row.original.ativo} version={row.original.versaoAtiva} />,
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedModelId(row.original.id)}>
          <Settings2 className="mr-2 h-4 w-4" /> Configurar
        </Button>
      ),
    },
  ], [])

  const disparoColumns = useMemo<ColumnDef<NotificacaoDisparoResumo, unknown>[]>(() => [
    {
      id: 'evento',
      header: 'Evento',
      cell: ({ row }) => <div><p className="font-mono text-xs">{row.original.evento.codigo}</p><p className="text-xs text-muted-foreground">{row.original.modelo.codigo}</p></div>,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => <Badge variant={row.original.status === 'CONCLUIDO' ? 'success' : row.original.status === 'FALHA_FINAL' ? 'destructive' : 'outline'}>{row.original.status}</Badge>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Criado em',
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.createdAt)}</span>,
    },
    {
      id: 'destinatarios',
      header: 'Destinatários',
      cell: ({ row }) => <span className="text-sm">{row.original.totalDisponibilizados}/{row.original.totalDestinatarios}</span>,
    },
    {
      id: 'email',
      header: 'E-mail',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{Object.entries(row.original.emails).map(([estado, total]) => `${estado}: ${total}`).join(' · ') || '—'}</span>,
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => <Button size="sm" variant="outline" onClick={() => setSelectedDisparoId(row.original.id)}><Eye className="mr-2 h-4 w-4" /> Detalhes</Button>,
    },
  ], [])

  const openCreate = (type: AdminTab) => {
    setCreateType(type)
    setCreateOpen(true)
    if (type === 'modelos' && !modelEventId) setModelEventId(eventosQuery.data?.[0]?.id ?? '')
  }

  return (
    <div>
      <PageHeader
        title="Notificações"
        subtitle="Configure eventos, modelos e ativação do serviço de mensagens"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void invalidateAdmin()} disabled={anyMutationPending}>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
            <Button onClick={() => openCreate(tab)} disabled={tab === 'disparos'}>
              <FilePlus2 className="mr-2 h-4 w-4" /> Novo {tab === 'eventos' ? 'evento' : 'modelo'}
            </Button>
          </div>
        }
      />

      {diagnosticoQuery.data && (
        <div className="mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div><p className="text-xs uppercase text-muted-foreground">Captura</p><p className="mt-1 text-sm font-semibold">{capturaHabilitada === undefined ? 'Indisponível' : capturaHabilitada ? 'Habilitada' : 'Desabilitada'}</p><p className="mt-1 text-xs text-muted-foreground">Eventos novos</p></div>
              <Radio className={capturaHabilitada === true ? 'h-5 w-5 text-emerald-600' : 'h-5 w-5 text-muted-foreground'} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div><p className="text-xs uppercase text-muted-foreground">Processador</p><p className="mt-1 text-sm font-semibold">{diagnosticoQuery.data.processador.habilitado ? 'Habilitado' : 'Desabilitado'}</p></div>
              <Activity className={diagnosticoQuery.data.processador.habilitado && !diagnosticoQuery.data.processador.alertaHeartbeat ? 'h-5 w-5 text-emerald-600' : 'h-5 w-5 text-muted-foreground'} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div><p className="text-xs uppercase text-muted-foreground">Fila devida</p><p className="mt-1 text-sm font-semibold">{diagnosticoQuery.data.fila.devidos} disparo(s)</p></div>
              <Megaphone className={diagnosticoQuery.data.fila.alertaAtraso ? 'h-5 w-5 text-amber-600' : 'h-5 w-5 text-muted-foreground'} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div><p className="text-xs uppercase text-muted-foreground">Falhas finais</p><p className="mt-1 text-sm font-semibold">{diagnosticoQuery.data.estados.FALHA_FINAL ?? 0}</p></div>
              <Power className={(diagnosticoQuery.data.estados.FALHA_FINAL ?? 0) > 0 ? 'h-5 w-5 text-destructive' : 'h-5 w-5 text-muted-foreground'} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div><p className="text-xs uppercase text-muted-foreground">Fila de e-mail</p><p className="mt-1 text-sm font-semibold">{diagnosticoQuery.data.email?.devidos ?? 0} devido(s)</p><p className="mt-1 text-xs text-muted-foreground">{diagnosticoQuery.data.email?.habilitado ? `${diagnosticoQuery.data.email.incertos} resultado(s) incerto(s)` : 'Desabilitada'}</p></div>
              <Mail className={(diagnosticoQuery.data.email?.incertos ?? 0) > 0 ? 'h-5 w-5 text-amber-600' : 'h-5 w-5 text-muted-foreground'} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div><p className="text-xs uppercase text-muted-foreground">Contexto</p><p className="mt-1 text-sm font-semibold">{diagnosticoQuery.data.contexto.disponivel ? 'Disponível' : diagnosticoQuery.data.contexto.configurado ? 'Indisponível' : 'Não configurado'}</p><p className="mt-1 text-xs text-muted-foreground">Views de leitura</p></div>
              <Settings2 className={diagnosticoQuery.data.contexto.disponivel ? 'h-5 w-5 text-emerald-600' : 'h-5 w-5 text-amber-600'} />
            </CardContent>
          </Card>
        </div>
      )}
      {retencaoQuery.data && (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><p className="text-xs uppercase text-muted-foreground">Retenção</p><p className="mt-1 text-sm font-semibold">{retencaoQuery.data.purgaHabilitada ? 'Purga habilitada' : 'Purga desabilitada'}</p><p className="mt-1 text-xs text-muted-foreground">Diagnóstico sem escrita · {Object.values(retencaoQuery.data.candidatos).reduce((total, valor) => total + valor, 0)} candidato(s) estimado(s)</p></div>
            <div className="text-right text-xs text-muted-foreground">{retencaoQuery.data.bloqueios.disparosPendentes} disparo(s) pendente(s) · {retencaoQuery.data.bloqueios.emailsPendentes} e-mail(s) pendente(s)</div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Central administrativa</CardTitle>
          <CardDescription>O ciclo é deliberadamente controlado: rascunho, publicação, promoção e ativação.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(value) => setTab(value as AdminTab)}>
            <TabsList>
              <TabsTrigger value="eventos">Eventos ({eventosQuery.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="modelos">Modelos ({modelosQuery.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="disparos">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent value="eventos" className="mt-5">
              <DataTable
                columns={eventColumns}
                data={eventosQuery.data ?? []}
                isLoading={eventosQuery.isLoading}
                searchPlaceholder="Buscar evento..."
                emptyMessage="Nenhum evento configurado. Crie a primeira configuração a partir do catálogo aprovado."
              />
            </TabsContent>
            <TabsContent value="modelos" className="mt-5">
              <DataTable
                columns={modelColumns}
                data={modelosQuery.data ?? []}
                isLoading={modelosQuery.isLoading}
                searchPlaceholder="Buscar modelo..."
                emptyMessage="Nenhum modelo configurado."
              />
            </TabsContent>
            <TabsContent value="disparos" className="mt-5">
              <DataTable
                columns={disparoColumns}
                data={disparosQuery.data?.itens ?? []}
                isLoading={disparosQuery.isLoading}
                searchPlaceholder="Buscar disparo..."
                emptyMessage="Nenhum disparo registrado."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{createType === 'eventos' ? 'Novo evento' : 'Novo modelo'}</DialogTitle>
            <DialogDescription>
              {createType === 'eventos'
                ? 'Selecione um evento do catálogo aprovado. A configuração nasce inativa e em rascunho.'
                : 'O modelo será vinculado a um evento e receberá uma versão inicial em rascunho.'}
            </DialogDescription>
          </DialogHeader>
          {createType === 'eventos' ? (
            <div className="space-y-4">
              <label className="block space-y-1.5 text-sm font-medium">
                Código do catálogo
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={eventCode} onChange={(event) => setEventCode(event.target.value)}>
                  <option value="">Selecione...</option>
                  {catalogoQuery.data?.eventos.map((evento) => <option key={evento.codigo} value={evento.codigo}>{evento.codigo}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                Nome administrativo
                <Input value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Ex.: Requisição enviada" />
              </label>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button onClick={() => createEventMutation.mutate()} disabled={!eventCode || eventName.trim().length < 3 || createEventMutation.isPending}>
                  {createEventMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Criar rascunho
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block space-y-1.5 text-sm font-medium">
                Evento vinculado
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={modelEventId} onChange={(event) => setModelEventId(event.target.value)}>
                  <option value="">Selecione...</option>
                  {eventosQuery.data?.map((evento) => <option key={evento.id} value={evento.id}>{evento.nome} ({evento.codigo})</option>)}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                Código técnico
                <Input value={modelCode} onChange={(event) => setModelCode(event.target.value)} placeholder="Ex.: requisicao_enviada_gestores" />
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                Nome administrativo
                <Input value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder="Ex.: Aviso aos gestores" />
              </label>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button onClick={() => createModelMutation.mutate()} disabled={!modelEventId || !/^[a-z0-9][a-z0-9_.-]{2,119}$/.test(modelCode) || modelName.trim().length < 3 || createModelMutation.isPending}>
                  {createModelMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Criar rascunho
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEventId} onOpenChange={(open) => !open && setSelectedEventId(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuração do evento</DialogTitle>
            <DialogDescription>Publique e promova uma versão antes de ativar o evento.</DialogDescription>
          </DialogHeader>
          {eventoQuery.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {eventoQuery.data && (
            <EventDetail
              evento={eventoQuery.data}
              disabled={anyMutationPending}
              onPublish={() => eventPublishMutation.mutate({ id: eventoQuery.data!.id, revisao: eventoQuery.data!.revisao })}
              onPromote={(versaoId) => eventPromoteMutation.mutate({ id: eventoQuery.data!.id, versaoId, revisao: eventoQuery.data!.revisao })}
              onActivate={() => eventActivateMutation.mutate({ id: eventoQuery.data!.id, ativo: !eventoQuery.data!.ativo, revisao: eventoQuery.data!.revisao })}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedModelId} onOpenChange={(open) => !open && setSelectedModelId(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuração do modelo</DialogTitle>
            <DialogDescription>Edite o rascunho, publique, promova e só então ative a distribuição.</DialogDescription>
          </DialogHeader>
          {modeloQuery.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {modeloQuery.data && (
            <ModelDetail
              modelo={modeloQuery.data}
              catalogo={catalogoQuery.data?.eventos.find((evento) => evento.codigo === modeloQuery.data?.evento.codigo)}
              disabled={anyMutationPending}
              onSave={(input) => notificacoesAdminApi.atualizarModeloRascunho(modeloQuery.data!.id, input).then(async () => { await invalidateAdmin(); toast.success('Rascunho salvo.') })}
              onPublish={() => modelPublishMutation.mutate({ id: modeloQuery.data!.id, revisao: modeloQuery.data!.revisao })}
              onPromote={(versaoId) => modelPromoteMutation.mutate({ id: modeloQuery.data!.id, versaoId, revisao: modeloQuery.data!.revisao })}
              onActivate={() => modelActivateMutation.mutate({ id: modeloQuery.data!.id, ativo: !modeloQuery.data!.ativo, revisao: modeloQuery.data!.revisao })}
              onSimulate={async () => {
                try {
                  const versao = modeloQuery.data!.versoes.find((item) => item.status === 'RASCUNHO') ?? modeloQuery.data!.versoes.find((item) => item.id === modeloQuery.data!.versaoAtiva?.id)
                  setSimulacao(await notificacoesAdminApi.simular({ modeloId: modeloQuery.data!.id, versaoId: versao?.id }))
                } catch (error) {
                  toast.error(getApiErrorMessage(error, 'Não foi possível simular o modelo.'))
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!simulacao} onOpenChange={(open) => !open && setSimulacao(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Simulação sintética</DialogTitle>
            <DialogDescription>Nenhum dado real foi consultado, nenhum disparo foi criado e nenhum e-mail foi enviado.</DialogDescription>
          </DialogHeader>
          {simulacao && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase text-muted-foreground">Título</p><p className="mt-1 text-sm font-medium">{simulacao.conteudo.titulo}</p></div><div><p className="text-xs uppercase text-muted-foreground">Destinatários estimados</p><p className="mt-1 text-sm">{simulacao.destinatarios.length}</p></div></div><CorpoNotificacaoPreview corpo={simulacao.conteudo.corpo} /><div className="space-y-1 text-xs text-muted-foreground">{simulacao.alertas.map((alerta) => <p key={alerta}>{alerta}</p>)}</div></div>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDisparoId} onOpenChange={(open) => !open && setSelectedDisparoId(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhe do disparo</DialogTitle>
            <DialogDescription>Histórico administrativo; a visualização não altera leitura dos destinatários.</DialogDescription>
          </DialogHeader>
          {disparoQuery.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {disparoQuery.data && <DisparoDetail disparo={disparoQuery.data} onReprocessed={async (emailId, input) => {
            await notificacoesAdminApi.reprocessarEmail(emailId, input)
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: qk.notificacoes.adminDisparo(disparoQuery.data!.id) }),
              queryClient.invalidateQueries({ queryKey: qk.notificacoes.adminDisparos }),
              queryClient.invalidateQueries({ queryKey: qk.notificacoes.adminDiagnostico }),
            ])
          }} onDispatchReprocessed={async (input) => {
            await notificacoesAdminApi.reprocessarDisparo(disparoQuery.data!.id, input)
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: qk.notificacoes.adminDisparo(disparoQuery.data!.id) }),
              queryClient.invalidateQueries({ queryKey: qk.notificacoes.adminDisparos }),
              queryClient.invalidateQueries({ queryKey: qk.notificacoes.adminDiagnostico }),
            ])
          }} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DisparoDetail({ disparo, onReprocessed, onDispatchReprocessed }: { disparo: NotificacaoDisparoDetalhe; onReprocessed: (emailId: string, input: { motivo: string; idempotencyKey: string; confirmarResultadoIncerto: boolean }) => Promise<void>; onDispatchReprocessed: (input: { motivo: string; idempotencyKey: string }) => Promise<void> }) {
  const [emailSelecionado, setEmailSelecionado] = useState<NotificacaoDisparoDetalhe['destinatarios'][number]['entregaEmail'] & { destinatarioId: string } | null>(null)
  const [motivo, setMotivo] = useState('')
  const [reprocessarDisparo, setReprocessarDisparo] = useState(false)
  const [motivoDisparo, setMotivoDisparo] = useState('')
  const [enviando, setEnviando] = useState(false)

  const confirmarReprocessamento = async () => {
    if (!emailSelecionado || motivo.trim().length < 10) {
      toast.error('Informe um motivo com pelo menos 10 caracteres.')
      return
    }
    try {
      setEnviando(true)
      await onReprocessed(emailSelecionado.id, {
        motivo: motivo.trim(),
        idempotencyKey: crypto.randomUUID(),
        confirmarResultadoIncerto: emailSelecionado.status === 'RESULTADO_INCERTO',
      })
      setEmailSelecionado(null)
      setMotivo('')
      toast.success('Réplica recolocada na fila.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível reprocessar a réplica.'))
    } finally {
      setEnviando(false)
    }
  }

  const confirmarReprocessamentoDisparo = async () => {
    if (motivoDisparo.trim().length < 10) {
      toast.error('Informe um motivo com pelo menos 10 caracteres.')
      return
    }
    try {
      setEnviando(true)
      await onDispatchReprocessed({ motivo: motivoDisparo.trim(), idempotencyKey: crypto.randomUUID() })
      setReprocessarDisparo(false)
      setMotivoDisparo('')
      toast.success('Disparo recolocado na fila.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível reprocessar o disparo.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><p className="text-xs uppercase text-muted-foreground">Estado</p><Badge variant={disparo.status === 'CONCLUIDO' ? 'success' : 'outline'}>{disparo.status}</Badge></div>
        <div><p className="text-xs uppercase text-muted-foreground">Evento</p><p className="font-mono text-sm">{disparo.evento.codigo} · v{disparo.evento.versao}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Modelo</p><p className="font-mono text-sm">{disparo.modelo.codigo} · v{disparo.modelo.versao}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Destinatários</p><p className="text-sm">{disparo.totalDisponibilizados}/{disparo.totalDestinatarios}</p></div>
      </div>
      <Separator />
      {disparo.status === 'FALHA_FINAL' && disparo.destinatarios.length === 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3"><div><p className="text-sm font-medium">Nenhuma entrega interna foi criada</p><p className="text-xs text-muted-foreground">O disparo pode ser reprocessado após correção da configuração.</p></div><Button size="sm" variant="outline" onClick={() => setReprocessarDisparo(true)}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reprocessar disparo</Button></div>}
      <div><p className="text-xs uppercase text-muted-foreground">Título resolvido</p><p className="mt-1 text-sm font-medium">{disparo.tituloResolvido ?? '—'}</p></div>
      <div>
        <p className="text-xs uppercase text-muted-foreground">Corpo estruturado</p>
        <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(disparo.corpoResolvido, null, 2)}</pre>
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase text-muted-foreground">Entregas individuais</p>
        {disparo.destinatarios.map((destinatario) => (
          <div key={destinatario.id} className="rounded-md border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><span>{destinatario.usuario?.nome ?? 'Usuário removido'} <span className="text-xs text-muted-foreground">({destinatario.usuario?.email ?? '—'})</span></span><span className="text-xs text-muted-foreground">{destinatario.lidaEm ? 'Lida' : 'Não lida'}</span></div>
            {destinatario.entregaEmail && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>E-mail: {destinatario.entregaEmail.status} · {destinatario.entregaEmail.emailDestino ?? 'endereço ainda não fixado'}{destinatario.entregaEmail.tentativasLog.length > 0 ? ` · ${destinatario.entregaEmail.tentativasLog.length} tentativa(s)` : ''}</span>{(['FALHA_FINAL', 'RESULTADO_INCERTO'] as string[]).includes(destinatario.entregaEmail.status) && <Button size="sm" variant="outline" onClick={() => setEmailSelecionado({ ...destinatario.entregaEmail!, destinatarioId: destinatario.id })}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reprocessar</Button>}</div>}
          </div>
        ))}
        {!disparo.destinatarios.length && <p className="text-sm text-muted-foreground">Nenhum destinatário disponibilizado.</p>}
      </div>
      </div>
      <ConfirmDialog
        open={!!emailSelecionado}
        onCancel={() => { if (!enviando) { setEmailSelecionado(null); setMotivo('') } }}
        onConfirm={() => void confirmarReprocessamento()}
        title={emailSelecionado?.status === 'RESULTADO_INCERTO' ? 'Confirmar risco de duplicidade' : 'Reprocessar réplica de e-mail'}
        description={emailSelecionado?.status === 'RESULTADO_INCERTO' ? 'O provedor não confirmou o resultado anterior. Uma nova tentativa pode gerar duplicidade.' : 'A réplica será revalidada e recolocada na fila de e-mail.'}
        confirmLabel="Reprocessar"
        variant="default"
        isLoading={enviando}
      >
        <label className="block space-y-1.5 text-sm font-medium">Motivo<Textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="Descreva por que a réplica deve ser reprocessada." /></label>
      </ConfirmDialog>
      <ConfirmDialog
        open={reprocessarDisparo}
        onCancel={() => { if (!enviando) { setReprocessarDisparo(false); setMotivoDisparo('') } }}
        onConfirm={() => void confirmarReprocessamentoDisparo()}
        title="Reprocessar disparo"
        description="O disparo será reavaliado com a mesma ocorrência e versão. Nenhuma entrega interna existente será repetida."
        confirmLabel="Reprocessar disparo"
        variant="default"
        isLoading={enviando}
      >
        <label className="block space-y-1.5 text-sm font-medium">Motivo<Textarea value={motivoDisparo} onChange={(event) => setMotivoDisparo(event.target.value)} placeholder="Descreva a correção realizada antes do reprocessamento." /></label>
      </ConfirmDialog>
    </>
  )
}

function EventDetail({
  evento,
  disabled,
  onPublish,
  onPromote,
  onActivate,
}: {
  evento: NotificacaoEventoDetalhe
  disabled: boolean
  onPublish: () => void
  onPromote: (versaoId: string) => void
  onActivate: () => void
}) {
  const rascunho = evento.versoes.find((versao) => versao.status === 'RASCUNHO')
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><p className="text-xs uppercase text-muted-foreground">Código</p><p className="font-mono text-sm">{evento.codigo}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Estado</p><StatusBadge active={evento.ativo} version={evento.versaoAtiva} /></div>
        <div><p className="text-xs uppercase text-muted-foreground">View de contexto</p><p className="font-mono text-xs">{evento.versoes[0]?.viewCodigo ?? '—'}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Revisão editorial</p><p className="text-sm">{evento.revisao}</p></div>
      </div>
      <Separator />
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Versões</h3>
        {evento.versoes.map((versao) => (
          <div key={versao.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Versão {versao.numero} <Badge variant="outline" className="ml-1">{versao.status}</Badge></p>
              <p className="text-xs text-muted-foreground">{versao.viewCodigo} · publicada em {formatDate(versao.publicadoEm)}</p>
            </div>
            <div className="flex gap-2">
              {versao.status === 'PUBLICADA' && evento.versaoAtiva?.id !== versao.id && <Button size="sm" variant="outline" onClick={() => onPromote(versao.id)} disabled={disabled}><Rocket className="mr-2 h-4 w-4" /> Promover</Button>}
              {versao.status === 'RASCUNHO' && <Button size="sm" onClick={onPublish} disabled={disabled}><CheckCircle2 className="mr-2 h-4 w-4" /> Publicar</Button>}
            </div>
          </div>
        ))}
        {!evento.versoes.length && <p className="text-sm text-muted-foreground">Nenhuma versão disponível.</p>}
      </div>
      <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
        <div><p className="text-sm font-medium">Distribuição do evento</p><p className="text-xs text-muted-foreground">Desativar cancela disparos ainda não entregues.</p></div>
        <Button variant={evento.ativo ? 'outline' : 'default'} onClick={onActivate} disabled={disabled || (!evento.ativo && !evento.versaoAtiva) }><Power className="mr-2 h-4 w-4" /> {evento.ativo ? 'Desativar' : 'Ativar'}</Button>
      </div>
      {!rascunho && <p className="text-xs text-muted-foreground">Não há rascunho pendente para publicar.</p>}
    </div>
  )
}

function ModelDetail({
  modelo,
  catalogo,
  disabled,
  onSave,
  onPublish,
  onPromote,
  onActivate,
  onSimulate,
}: {
  modelo: NotificacaoModeloDetalhe
  catalogo?: NotificacaoCatalogoEvento
  disabled: boolean
  onSave: (input: AtualizarNotificacaoModeloRascunhoInput) => Promise<void>
  onPublish: () => void
  onPromote: (versaoId: string) => void
  onActivate: () => void
  onSimulate: () => Promise<void>
}) {
  const draft = modelo.versoes.find((versao) => versao.status === 'RASCUNHO') ?? modelo.versoes[0]
  const agendamentoInicial = normalizarAgendamento(draft?.agendamento)
  const [title, setTitle] = useState(draft?.tituloTemplate ?? '')
  const [body, setBody] = useState(JSON.stringify(draft?.corpoTemplate ?? DEFAULT_BODY, null, 2))
  const [recipients, setRecipients] = useState(JSON.stringify(draft?.destinatarios ?? DEFAULT_RECIPIENTS, null, 2))
  const [actions, setActions] = useState(JSON.stringify(draft?.acoes ?? DEFAULT_ACTIONS, null, 2))
  const [condition, setCondition] = useState(draft?.condicaoEnvio ?? 'SEMPRE')
  const [filter, setFilter] = useState(draft?.filtroEvento ?? '')
  const [notifyOnLogin, setNotifyOnLogin] = useState(draft?.notificarNoLogin ?? false)
  const [replicateEmail, setReplicateEmail] = useState(draft?.replicarPorEmail ?? false)
  const [validity, setValidity] = useState(String(draft?.validadeHoras ?? 720))
  const [scheduleType, setScheduleType] = useState<AgendamentoEditor['tipo']>(agendamentoInicial.tipo)
  const [scheduleValue, setScheduleValue] = useState(String(agendamentoInicial.tipo === 'APOS_INTERVALO' ? agendamentoInicial.valor : 1))
  const [scheduleUnit, setScheduleUnit] = useState<'MINUTOS' | 'HORAS'>(agendamentoInicial.tipo === 'APOS_INTERVALO' ? agendamentoInicial.unidade : 'MINUTOS')
  const [scheduleTime, setScheduleTime] = useState(agendamentoInicial.tipo === 'PROXIMO_HORARIO' ? agendamentoInicial.hora : '09:00')
  const [scheduleTimezone, setScheduleTimezone] = useState(agendamentoInicial.tipo === 'PROXIMO_HORARIO' ? agendamentoInicial.fuso : 'America/Sao_Paulo')
  const [saving, setSaving] = useState(false)
  const [campoVariavel, setCampoVariavel] = useState('')
  const [estiloVariavel, setEstiloVariavel] = useState<'normal' | 'negrito' | 'italico' | 'negrito-italico'>('normal')
  const [novoSeletor, setNovoSeletor] = useState<GrupoDestinatarioEditor['seletor']>('PERFIS_DA_UNIDADE')
  const [novaReferencia, setNovaReferencia] = useState(catalogo?.referencias[0] ?? '')
  const [novoPerfil, setNovoPerfil] = useState('gestor_unidade')
  const [novaAcao, setNovaAcao] = useState('')

  const referenciasCompativeis = (catalogo?.referencias ?? []).filter((referencia) => {
    if (novoSeletor === 'USUARIO_REFERENCIADO') return referencia.startsWith('usuario')
    if (novoSeletor === 'PERFIS_DA_UNIDADE' || novoSeletor === 'PERFIS_DA_UORG') return referencia.startsWith('unidade')
    return true
  })

  const inserirVariavelNoTitulo = () => {
    if (!campoVariavel) return
    setTitle((valor) => `${valor}${valor && !valor.endsWith(' ') ? ' ' : ''}{{${campoVariavel}}}`)
  }

  const inserirVariavelNoCorpo = () => {
    if (!campoVariavel) return
    try {
      const documento = parseJson(body, 'Conteúdo') as { versao?: number; blocos?: Array<{ tipo: 'paragrafo'; conteudo: unknown[] }> }
      const blocos = Array.isArray(documento.blocos) && documento.blocos.length > 0
        ? documento.blocos
        : [{ tipo: 'paragrafo' as const, conteudo: [] }]
      blocos[0].conteudo = [...(blocos[0].conteudo ?? []), {
        tipo: 'variavel',
        campo: campoVariavel,
        ...(estiloVariavel === 'negrito' || estiloVariavel === 'negrito-italico' ? { negrito: true } : {}),
        ...(estiloVariavel === 'italico' || estiloVariavel === 'negrito-italico' ? { italico: true } : {}),
      }]
      setBody(JSON.stringify({ ...documento, versao: 1, blocos }, null, 2))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível inserir a variável.')
    }
  }

  const adicionarDestinatario = () => {
    if (!novaReferencia) {
      toast.error('Selecione uma referência do evento.')
      return
    }
    const grupos = parseEditorArray<GrupoDestinatarioEditor>(recipients)
    grupos.push({
      seletor: novoSeletor,
      referencia: novaReferencia,
      perfis: novoSeletor === 'USUARIO_REFERENCIADO' || novoSeletor === 'ADMINS_GLOBAIS' ? [] : [novoPerfil],
      excluirAutor: false,
    })
    setRecipients(JSON.stringify(grupos, null, 2))
  }

  const removerDestinatario = (indice: number) => {
    const grupos = parseEditorArray<GrupoDestinatarioEditor>(recipients)
    grupos.splice(indice, 1)
    setRecipients(JSON.stringify(grupos, null, 2))
  }

  const adicionarAcao = () => {
    const definicao = (ACOES_POR_EVENTO[modelo.evento.codigo] ?? []).find((acao) => acao.codigo === novaAcao)
    if (!definicao) return
    const acoes = parseEditorArray<AcaoEditor>(actions)
    if (acoes.some((acao) => acao.codigo === definicao.codigo) || acoes.length >= 3) return
    acoes.push({ ...definicao, ordem: acoes.length })
    setActions(JSON.stringify(acoes, null, 2))
    setNovaAcao('')
  }

  const removerAcao = (indice: number) => {
    const acoes = parseEditorArray<AcaoEditor>(actions).filter((_acao, itemIndice) => itemIndice !== indice)
      .map((acao, ordem) => ({ ...acao, ordem }))
    setActions(JSON.stringify(acoes, null, 2))
  }

  useEffect(() => {
    setTitle(draft?.tituloTemplate ?? '')
    setBody(JSON.stringify(draft?.corpoTemplate ?? DEFAULT_BODY, null, 2))
    setRecipients(JSON.stringify(draft?.destinatarios ?? DEFAULT_RECIPIENTS, null, 2))
    setActions(JSON.stringify(draft?.acoes ?? DEFAULT_ACTIONS, null, 2))
    setCondition(draft?.condicaoEnvio ?? 'SEMPRE')
    setFilter(draft?.filtroEvento ?? '')
    setNotifyOnLogin(draft?.notificarNoLogin ?? false)
    setReplicateEmail(draft?.replicarPorEmail ?? false)
    setValidity(String(draft?.validadeHoras ?? 720))
    const agendamento = normalizarAgendamento(draft?.agendamento)
    setScheduleType(agendamento.tipo)
    setScheduleValue(agendamento.tipo === 'APOS_INTERVALO' ? String(agendamento.valor) : '1')
    setScheduleUnit(agendamento.tipo === 'APOS_INTERVALO' ? agendamento.unidade : 'MINUTOS')
    setScheduleTime(agendamento.tipo === 'PROXIMO_HORARIO' ? agendamento.hora : '09:00')
    setScheduleTimezone(agendamento.tipo === 'PROXIMO_HORARIO' ? agendamento.fuso : 'America/Sao_Paulo')
    setNovaReferencia(catalogo?.referencias[0] ?? '')
    setNovaAcao('')
  }, [modelo.id, draft?.id, draft?.updatedAt, catalogo?.codigo])

  useEffect(() => {
    if (!referenciasCompativeis.includes(novaReferencia)) setNovaReferencia(referenciasCompativeis[0] ?? '')
  }, [novoSeletor, catalogo?.codigo])

  const save = async () => {
    if (!draft) return
    try {
      setSaving(true)
      const agendamento: AgendamentoEditor = scheduleType === 'IMEDIATO'
        ? { tipo: 'IMEDIATO' }
        : scheduleType === 'APOS_INTERVALO'
          ? { tipo: 'APOS_INTERVALO', valor: Number(scheduleValue), unidade: scheduleUnit }
          : { tipo: 'PROXIMO_HORARIO', hora: scheduleTime, fuso: scheduleTimezone.trim() }
      await onSave({
        revisaoEsperada: modelo.revisao,
        tituloTemplate: title.trim(),
        corpoTemplate: parseJson(body, 'Conteúdo'),
        destinatarios: parseJson(recipients, 'Destinatários'),
        acoes: parseJson(actions, 'Ações'),
        agendamento,
        condicaoEnvio: condition,
        filtroEvento: filter || null,
        notificarNoLogin: notifyOnLogin,
        replicarPorEmail: replicateEmail,
        validadeHoras: Number(validity),
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o rascunho.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><p className="text-xs uppercase text-muted-foreground">Código</p><p className="font-mono text-sm">{modelo.codigo}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Evento</p><p className="text-sm">{modelo.evento.nome} <span className="font-mono text-xs text-muted-foreground">({modelo.evento.codigo})</span></p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Estado</p><StatusBadge active={modelo.ativo} version={modelo.versaoAtiva} /></div>
        <div><p className="text-xs uppercase text-muted-foreground">Revisão editorial</p><p className="text-sm">{modelo.revisao}</p></div>
      </div>
      <Separator />
      {draft ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">Título<input className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="space-y-1.5 text-sm font-medium">Validade (horas)<Input type="number" min={1} max={8760} value={validity} onChange={(event) => setValidity(event.target.value)} /></label>
          </div>
          <div className="space-y-3 rounded-md border p-3">
            <label className="block space-y-1.5 text-sm font-medium">Agendamento<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={scheduleType} onChange={(event) => setScheduleType(event.target.value as AgendamentoEditor['tipo'])}><option value="IMEDIATO">Imediato</option><option value="APOS_INTERVALO">Após intervalo</option><option value="PROXIMO_HORARIO">Próximo horário diário</option></select></label>
            {scheduleType === 'APOS_INTERVALO' && <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">Intervalo<Input type="number" min={1} max={43200} value={scheduleValue} onChange={(event) => setScheduleValue(event.target.value)} /></label><label className="space-y-1.5 text-sm font-medium">Unidade<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={scheduleUnit} onChange={(event) => setScheduleUnit(event.target.value as 'MINUTOS' | 'HORAS')}><option value="MINUTOS">Minutos</option><option value="HORAS">Horas</option></select></label></div>}
            {scheduleType === 'PROXIMO_HORARIO' && <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">Horário<Input type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} /></label><label className="space-y-1.5 text-sm font-medium">Fuso IANA<Input value={scheduleTimezone} onChange={(event) => setScheduleTimezone(event.target.value)} placeholder="America/Sao_Paulo" /></label></div>}
          </div>
          <div className="space-y-3 rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Variáveis do evento</p>
              <p className="text-xs text-muted-foreground">Insira campos aprovados no título ou no primeiro parágrafo do corpo.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select className="h-10 min-w-56 flex-1 rounded-md border bg-background px-3 text-sm" value={campoVariavel} onChange={(event) => setCampoVariavel(event.target.value)}>
                <option value="">Selecione um campo...</option>
                {(catalogo?.camposContexto ?? []).map((campo) => <option key={campo} value={campo}>{campo}</option>)}
              </select>
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={estiloVariavel} onChange={(event) => setEstiloVariavel(event.target.value as typeof estiloVariavel)} aria-label="Formatação da variável">
                <option value="normal">Normal</option>
                <option value="negrito">Negrito</option>
                <option value="italico">Itálico</option>
                <option value="negrito-italico">Negrito e itálico</option>
              </select>
              <Button type="button" variant="outline" onClick={inserirVariavelNoTitulo} disabled={!campoVariavel}>Inserir no título</Button>
              <Button type="button" variant="outline" onClick={inserirVariavelNoCorpo} disabled={!campoVariavel}>Inserir no corpo</Button>
            </div>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">Conteúdo estruturado (JSON)<Textarea className="min-h-36 font-mono text-xs" value={body} onChange={(event) => setBody(event.target.value)} /></label>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-md border p-3">
              <div><p className="text-sm font-medium">Destinatários guiados</p><p className="text-xs text-muted-foreground">Grupos são unidos e usuários repetidos recebem uma única entrega.</p></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={novoSeletor} onChange={(event) => setNovoSeletor(event.target.value as GrupoDestinatarioEditor['seletor'])}>
                  <option value="PERFIS_DA_UNIDADE">Perfis da unidade</option>
                  <option value="PERFIS_DA_UORG">Perfis da UORG</option>
                  <option value="USUARIO_REFERENCIADO">Usuário referenciado</option>
                  <option value="ADMINS_GLOBAIS">Admins globais</option>
                </select>
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={novaReferencia} onChange={(event) => setNovaReferencia(event.target.value)}>
                  <option value="">Referência...</option>
                  {referenciasCompativeis.map((referencia) => <option key={referencia} value={referencia}>{referencia}</option>)}
                </select>
              </div>
              {(novoSeletor === 'PERFIS_DA_UNIDADE' || novoSeletor === 'PERFIS_DA_UORG') && <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={novoPerfil} onChange={(event) => setNovoPerfil(event.target.value)}>{ROLES_NOTIFICACAO.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</select>}
              <Button type="button" variant="outline" onClick={adicionarDestinatario} disabled={!novaReferencia}>Adicionar grupo</Button>
              <div className="space-y-1.5">{parseEditorArray<GrupoDestinatarioEditor>(recipients).map((grupo, indice) => <div key={`${grupo.referencia}-${indice}`} className="flex items-center justify-between gap-2 rounded bg-muted/50 px-2 py-1.5 text-xs"><span>{grupo.seletor} · {grupo.referencia}{grupo.perfis?.length ? ` · ${grupo.perfis.join(', ')}` : ''}</span><Button type="button" size="sm" variant="ghost" onClick={() => removerDestinatario(indice)}>Remover</Button></div>)}</div>
              <label className="block space-y-1.5 text-xs font-medium">Avançado (JSON)<Textarea className="min-h-24 font-mono text-xs" value={recipients} onChange={(event) => setRecipients(event.target.value)} /></label>
            </div>
            <div className="space-y-3 rounded-md border p-3">
              <div><p className="text-sm font-medium">Ações do catálogo</p><p className="text-xs text-muted-foreground">Comandos mutáveis exigem confirmação na aplicação.</p></div>
              <div className="flex gap-2"><select className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" value={novaAcao} onChange={(event) => setNovaAcao(event.target.value)}><option value="">Selecione uma ação...</option>{(ACOES_POR_EVENTO[modelo.evento.codigo] ?? []).map((acao) => <option key={acao.codigo} value={acao.codigo}>{acao.rotulo}</option>)}</select><Button type="button" variant="outline" onClick={adicionarAcao} disabled={!novaAcao}>Adicionar</Button></div>
              <div className="space-y-1.5">{parseEditorArray<AcaoEditor>(actions).map((acao, indice) => <div key={`${acao.codigo}-${indice}`} className="flex items-center justify-between gap-2 rounded bg-muted/50 px-2 py-1.5 text-xs"><span>{acao.rotulo}{acao.exigeConfirmacao ? ' · confirmação' : ''}</span><Button type="button" size="sm" variant="ghost" onClick={() => removerAcao(indice)}>Remover</Button></div>)}</div>
              <label className="block space-y-1.5 text-xs font-medium">Avançado (JSON)<Textarea className="min-h-24 font-mono text-xs" value={actions} onChange={(event) => setActions(event.target.value)} /></label>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">Condição<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={condition} onChange={(event) => setCondition(event.target.value)}><option value="SEMPRE">Sempre</option><option value="CADASTRO_AINDA_PENDENTE">Cadastro ainda pendente</option><option value="REQUISICAO_AINDA_ENVIADA_NO_MESMO_CICLO">Requisição ainda enviada</option><option value="FILTRO_RESULTADO_IMPORTACAO">Filtro de importação</option></select></label>
            <label className="space-y-1.5 text-sm font-medium">Filtro do evento<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">Nenhum</option><option value="SUCESSO">Sucesso</option><option value="SEM_PARTICIPACAO">Sem participação</option><option value="FALHA">Falha</option></select></label>
          </div>
          <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 text-sm"><span><span className="block font-medium">Avisar no login</span><span className="text-xs text-muted-foreground">Exibe o modal na próxima autenticação.</span></span><Switch checked={notifyOnLogin} onCheckedChange={setNotifyOnLogin} /></label>
            <label className="flex items-center justify-between gap-3 text-sm"><span><span className="block font-medium">Replicar por e-mail</span><span className="text-xs text-muted-foreground">Fila opcional, independente do login.</span></span><Switch checked={replicateEmail} onCheckedChange={setReplicateEmail} /></label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={disabled || saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Salvar rascunho</Button>
            <Button variant="outline" onClick={() => void onSimulate()} disabled={disabled}><Eye className="mr-2 h-4 w-4" /> Simular</Button>
            {draft.status === 'RASCUNHO' && <Button variant="outline" onClick={onPublish} disabled={disabled}><CheckCircle2 className="mr-2 h-4 w-4" /> Publicar versão</Button>}
            {modelo.versoes.filter((versao) => versao.status === 'PUBLICADA' && modelo.versaoAtiva?.id !== versao.id).map((versao) => <Button key={versao.id} variant="outline" onClick={() => onPromote(versao.id)} disabled={disabled}><Rocket className="mr-2 h-4 w-4" /> Promover v{versao.numero}</Button>)}
          </div>
        </div>
      ) : <p className="text-sm text-muted-foreground">Nenhuma versão disponível para edição.</p>}
      <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
        <div><p className="text-sm font-medium">Distribuição do modelo</p><p className="text-xs text-muted-foreground">Somente um modelo promovido com evento ativo pode ser ativado.</p></div>
        <Button variant={modelo.ativo ? 'outline' : 'default'} onClick={onActivate} disabled={disabled || (!modelo.ativo && !modelo.versaoAtiva)}><Power className="mr-2 h-4 w-4" /> {modelo.ativo ? 'Desativar' : 'Ativar'}</Button>
      </div>
    </div>
  )
}
