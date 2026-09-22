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
  CriarNotificacaoModeloInput,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ConteudoNotificacao, DOCUMENTO_NOTIFICACAO_VAZIO } from '@/components/notificacoes/ConteudoNotificacao'
import { ServicoNotificacaoEditor } from './ServicoNotificacaoEditor'
import { EventoNotificacaoEditor } from './EventoNotificacaoEditor'

type AdminTab = 'eventos' | 'modelos' | 'disparos'

const DEFAULT_BODY = DOCUMENTO_NOTIFICACAO_VAZIO

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
  return (
    <div className="rounded-md border bg-background p-4"><ConteudoNotificacao corpo={corpo} /></div>
  )
}

export function NotificacoesAdminPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<AdminTab>('modelos')
  const [createOpen, setCreateOpen] = useState(false)
  const [createType, setCreateType] = useState<AdminTab>('eventos')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [selectedDisparoId, setSelectedDisparoId] = useState<string | null>(null)
  const [simulacao, setSimulacao] = useState<NotificacaoSimulacao | null>(null)
  const [eventCode, setEventCode] = useState('')
  const [eventName, setEventName] = useState('')
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
  const eventoModeloQuery = useQuery({
    queryKey: qk.notificacoes.adminEvento(modeloQuery.data?.evento.id ?? ''),
    queryFn: () => notificacoesAdminApi.obterEvento(modeloQuery.data!.evento.id),
    enabled: !!selectedModelId && !!modeloQuery.data?.evento.id,
  })
  const disparoQuery = useQuery({
    queryKey: qk.notificacoes.adminDisparo(selectedDisparoId ?? ''),
    queryFn: () => notificacoesAdminApi.obterDisparo(selectedDisparoId!),
    enabled: !!selectedDisparoId,
  })
  const capturaHabilitada = diagnosticoQuery.data?.captura?.habilitada
  const sseHabilitado = diagnosticoQuery.data?.sse?.habilitado

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
      modeloQuery.data?.evento.id
        ? queryClient.invalidateQueries({ queryKey: qk.notificacoes.adminEvento(modeloQuery.data.evento.id) })
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
    mutationFn: (input: CriarNotificacaoModeloInput) => notificacoesAdminApi.criarModelo(input),
    onSuccess: async (data) => {
      await mutationOptions.onSuccess()
      setCreateOpen(false)
      setModelName('')
      setModelEventId('')
      if (data?.id) setSelectedModelId(data.id)
      toast.success('Modelo criado com rascunho inicial.')
    },
  })

  const eventPublishMutation = useMutation({
    mutationFn: ({ id, revisao }: { id: string; revisao: number }) => notificacoesAdminApi.publicarEvento(id, revisao),
    ...mutationOptions,
    onSuccess: async () => {
      await mutationOptions.onSuccess()
      toast.success('Versão do evento publicada. Agora torne-a vigente.')
    },
  })
  const eventPromoteMutation = useMutation({
    mutationFn: ({ id, versaoId, revisao }: { id: string; versaoId: string; revisao: number }) => notificacoesAdminApi.promoverEvento(id, versaoId, revisao),
    ...mutationOptions,
    onSuccess: async () => {
      await mutationOptions.onSuccess()
      toast.success('Versão do evento agora está vigente.')
    },
  })
  const eventActivateMutation = useMutation({
    mutationFn: ({ id, ativo, revisao }: { id: string; ativo: boolean; revisao: number }) => notificacoesAdminApi.ativarEvento(id, ativo, revisao),
    ...mutationOptions,
    onSuccess: async (_data, variables) => {
      await mutationOptions.onSuccess()
      toast.success(variables.ativo ? 'Evento ativado.' : 'Evento desativado.')
    },
  })
  const eventDraftMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof notificacoesAdminApi.atualizarEventoRascunho>[1] }) => notificacoesAdminApi.atualizarEventoRascunho(id, input),
    ...mutationOptions,
  })
  const modelPublishMutation = useMutation({
    mutationFn: ({ id, revisao }: { id: string; revisao: number }) => notificacoesAdminApi.publicarModelo(id, revisao),
    ...mutationOptions,
    onSuccess: async () => {
      await mutationOptions.onSuccess()
      toast.success('Versão publicada. Agora torne-a vigente para liberar a ativação.')
    },
  })
  const modelPromoteMutation = useMutation({
    mutationFn: ({ id, versaoId, revisao }: { id: string; versaoId: string; revisao: number }) => notificacoesAdminApi.promoverModelo(id, versaoId, revisao),
    ...mutationOptions,
    onSuccess: async () => {
      await mutationOptions.onSuccess()
      toast.success('Versão vigente. O serviço já pode ser ativado.')
    },
  })
  const modelActivateMutation = useMutation({
    mutationFn: ({ id, ativo, revisao }: { id: string; ativo: boolean; revisao: number }) => notificacoesAdminApi.ativarModelo(id, ativo, revisao),
    ...mutationOptions,
    onSuccess: async (_data, variables) => {
      await mutationOptions.onSuccess()
      toast.success(variables.ativo ? 'Serviço ativado.' : 'Serviço desativado.')
    },
  })

  const anyMutationPending = [
    createEventMutation,
    createModelMutation,
    eventPublishMutation,
    eventPromoteMutation,
    eventActivateMutation,
    eventDraftMutation,
    modelPublishMutation,
    modelPromoteMutation,
    modelActivateMutation,
  ].some((mutation) => mutation.isPending)

  const eventColumns = useMemo<ColumnDef<NotificacaoEventoResumo, unknown>[]>(() => [
    {
      accessorKey: 'nome',
      header: 'Evento gatilho',
      cell: ({ row }) => <div><p className="font-medium">{row.original.nome}</p><p className="font-mono text-xs text-muted-foreground">{row.original.codigo}</p></div>,
    },
    {
      accessorKey: 'ativo',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge active={row.original.ativo} version={row.original.versaoAtiva} />,
    },
    {
      accessorKey: 'totalModelos',
      header: 'Serviços',
      cell: ({ row }) => <span className="text-sm">{row.original.totalModelos}</span>,
    },
    {
      id: 'campos',
      header: 'Campos disponíveis',
      cell: ({ row }) => <span className="text-sm">{catalogoQuery.data?.eventos.find((evento) => evento.codigo === row.original.codigo)?.campos?.length ?? 0}</span>,
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
  ], [catalogoQuery.data])

  const modelColumns = useMemo<ColumnDef<NotificacaoModeloResumo, unknown>[]>(() => [
    {
      accessorKey: 'nome',
      header: 'Serviço',
      cell: ({ row }) => <div><p className="font-medium">{row.original.nome}</p><p className="max-w-80 truncate text-xs text-muted-foreground">{row.original.versaoAtiva?.tituloTemplate ?? 'Ainda sem mensagem publicada'}</p></div>,
    },
    {
      id: 'evento',
      header: 'Gatilho',
      cell: ({ row }) => <div><p className="text-sm">{row.original.evento.nome}</p><p className="font-mono text-xs text-muted-foreground">{row.original.evento.codigo}</p></div>,
    },
    {
      accessorKey: 'totalEntregas',
      header: 'Entregas',
      cell: ({ row }) => <div><p className="text-sm font-medium">{row.original.totalEntregas}</p><p className="text-xs text-muted-foreground">{row.original.totalDisparos} disparo(s)</p></div>,
    },
    {
      accessorKey: 'ultimoDisparoEm',
      header: 'Última atividade',
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.ultimoDisparoEm)}</span>,
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
          <Settings2 className="mr-2 h-4 w-4" /> Editar
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
    if (type === 'modelos' && !modelEventId) setModelEventId(eventosQuery.data?.find((evento) => evento.versaoAtiva)?.id ?? '')
  }

  const eventoNovoServico = eventosQuery.data?.find((evento) => evento.id === modelEventId)
  const catalogoNovoServico = catalogoQuery.data?.eventos.find((evento) => evento.codigo === eventoNovoServico?.codigo)
  const modeloNovoServico = useMemo<NotificacaoModeloDetalhe | null>(() => {
    if (!eventoNovoServico || !catalogoNovoServico) return null
    const instante = new Date(0).toISOString()
    return {
      id: `novo:${eventoNovoServico.id}`,
      codigo: 'gerado-automaticamente',
      nome: 'Novo serviço',
      evento: { id: eventoNovoServico.id, codigo: eventoNovoServico.codigo, nome: eventoNovoServico.nome, ativo: eventoNovoServico.ativo },
      ativo: false,
      revisao: 0,
      versaoAtiva: null,
      totalVersoes: 1,
      totalDisparos: 0,
      totalEntregas: 0,
      ultimoDisparoEm: null,
      createdAt: instante,
      updatedAt: instante,
      versoes: [{
        id: `rascunho:${eventoNovoServico.id}`,
        numero: 1,
        status: 'RASCUNHO',
        eventoVersaoId: eventoNovoServico.versaoAtiva?.id ?? '',
        tituloTemplate: '',
        corpoTemplate: DEFAULT_BODY,
        destinatarios: [],
        agendamento: { tipo: 'IMEDIATO' },
        condicaoEnvio: catalogoNovoServico.condicoes?.[0] ?? 'SEMPRE',
        filtroEvento: null,
        acoes: [],
        notificarNoLogin: false,
        replicarPorEmail: false,
        validadeHoras: 720,
        hashDefinicao: '',
        publicadoEm: null,
        createdAt: instante,
        updatedAt: instante,
      }],
    }
  }, [eventoNovoServico, catalogoNovoServico])

  return (
    <div>
      <PageHeader
        title="Serviços de notificação"
        subtitle="Crie mensagens automáticas a partir dos eventos do GERE e acompanhe suas entregas"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void invalidateAdmin()} disabled={anyMutationPending}>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
            <Button onClick={() => openCreate(tab)} disabled={tab === 'disparos'}>
              <FilePlus2 className="mr-2 h-4 w-4" /> {tab === 'eventos' ? 'Mapear evento' : 'Novo serviço'}
            </Button>
          </div>
        }
      />

      {(diagnosticoQuery.data || retencaoQuery.data) && <details className="mb-6 rounded-lg border bg-muted/10">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Saúde técnica e filas <span className="ml-2 text-xs font-normal text-muted-foreground">Informações para diagnóstico operacional</span></summary>
        <div className="px-4 pb-4">
      {diagnosticoQuery.data && (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div><p className="text-xs uppercase text-muted-foreground">Captura</p><p className="mt-1 text-sm font-semibold">{capturaHabilitada === undefined ? 'Indisponível' : capturaHabilitada ? 'Habilitada' : 'Desabilitada'}</p><p className="mt-1 text-xs text-muted-foreground">Eventos novos</p></div>
              <Radio className={capturaHabilitada === true ? 'h-5 w-5 text-emerald-600' : 'h-5 w-5 text-muted-foreground'} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div><p className="text-xs uppercase text-muted-foreground">SSE</p><p className="mt-1 text-sm font-semibold">{sseHabilitado === undefined ? 'Indisponível' : sseHabilitado ? 'Habilitado' : 'Desabilitado'}</p><p className="mt-1 text-xs text-muted-foreground">Atualização imediata</p></div>
              <Activity className={sseHabilitado === true ? 'h-5 w-5 text-emerald-600' : 'h-5 w-5 text-muted-foreground'} />
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
        <Card className="mt-3">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><p className="text-xs uppercase text-muted-foreground">Retenção</p><p className="mt-1 text-sm font-semibold">{retencaoQuery.data.purgaHabilitada ? 'Purga habilitada' : 'Purga desabilitada'}</p><p className="mt-1 text-xs text-muted-foreground">Diagnóstico sem escrita · {Object.values(retencaoQuery.data.candidatos).reduce((total, valor) => total + valor, 0)} candidato(s) estimado(s)</p></div>
            <div className="text-right text-xs text-muted-foreground">{retencaoQuery.data.bloqueios.disparosPendentes} disparo(s) pendente(s) · {retencaoQuery.data.bloqueios.emailsPendentes} e-mail(s) pendente(s)</div>
          </CardContent>
        </Card>
      )}
        </div>
      </details>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Configuração e acompanhamento</CardTitle>
          <CardDescription>Serviços são salvos como rascunho. Publicar e ativar são etapas separadas para evitar envios acidentais.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(value) => setTab(value as AdminTab)}>
            <TabsList>
              <TabsTrigger value="modelos">Serviços ({modelosQuery.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="eventos">Eventos gatilho ({eventosQuery.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="disparos">Entregas</TabsTrigger>
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
        <DialogContent className={createType === 'modelos' ? 'max-h-[92vh] max-w-5xl overflow-y-auto' : 'max-w-lg'}>
          <DialogHeader>
            <DialogTitle>{createType === 'eventos' ? 'Mapear evento gatilho' : 'Novo serviço de notificação'}</DialogTitle>
            <DialogDescription>
              {createType === 'eventos'
                ? 'Selecione um evento do catálogo aprovado. A configuração nasce inativa e em rascunho.'
                : 'Defina a mensagem, o momento de envio e os destinatários. O serviço será salvo inativo, como rascunho.'}
            </DialogDescription>
          </DialogHeader>
          {createType === 'eventos' ? (
            <div className="space-y-4">
              <label className="block space-y-1.5 text-sm font-medium">
                Código do catálogo
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={eventCode} onChange={(event) => { const codigo = event.target.value; setEventCode(codigo); setEventName(catalogoQuery.data?.eventos.find((item) => item.codigo === codigo)?.nome ?? '') }}>
                  <option value="">Selecione...</option>
                  {catalogoQuery.data?.eventos.filter((evento) => !eventosQuery.data?.some((mapeado) => mapeado.codigo === evento.codigo)).map((evento) => <option key={evento.codigo} value={evento.codigo}>{evento.nome}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                Nome exibido
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
            <div className="space-y-6">
              <label className="block space-y-1.5 text-sm font-medium">
                Título do serviço
                <Input value={modelName} maxLength={180} onChange={(event) => setModelName(event.target.value)} placeholder="Ex.: Avisar gestores sobre nova requisição" />
                <span className="block text-xs font-normal text-muted-foreground">Este nome identifica o serviço apenas na área administrativa.</span>
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                Evento gatilho
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={modelEventId} onChange={(event) => setModelEventId(event.target.value)}>
                  <option value="">Selecione...</option>
                  {eventosQuery.data?.filter((evento) => evento.versaoAtiva).map((evento) => <option key={evento.id} value={evento.id}>{evento.nome}</option>)}
                </select>
                {!eventosQuery.data?.some((evento) => evento.versaoAtiva) && <span className="block text-xs font-normal text-amber-700">Publique e torne vigente ao menos um evento gatilho antes de criar o serviço.</span>}
              </label>
              {modeloNovoServico && catalogoNovoServico && modelName.trim().length >= 3
                ? <ServicoNotificacaoEditor
                    creation
                    modelo={modeloNovoServico}
                    catalogo={catalogoNovoServico}
                    disabled={createModelMutation.isPending}
                    onSave={async ({ revisaoEsperada: _revisao, ...input }) => {
                      await createModelMutation.mutateAsync({ ...input, nome: modelName.trim(), eventoId: modelEventId })
                    }}
                  />
                : <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Informe o título do serviço e escolha o evento gatilho para continuar.</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEventId} onOpenChange={(open) => !open && setSelectedEventId(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuração do evento</DialogTitle>
            <DialogDescription>Publique e promova uma versão antes de ativar o evento.</DialogDescription>
          </DialogHeader>
          {eventoQuery.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {eventoQuery.data && (
            <EventDetail
              evento={eventoQuery.data}
              catalogo={catalogoQuery.data?.eventos.find((item) => item.codigo === eventoQuery.data?.codigo)}
              disabled={anyMutationPending}
              onPublish={() => eventPublishMutation.mutate({ id: eventoQuery.data!.id, revisao: eventoQuery.data!.revisao })}
              onPromote={(versaoId) => eventPromoteMutation.mutate({ id: eventoQuery.data!.id, versaoId, revisao: eventoQuery.data!.revisao })}
              onActivate={() => eventActivateMutation.mutate({ id: eventoQuery.data!.id, ativo: !eventoQuery.data!.ativo, revisao: eventoQuery.data!.revisao })}
              onSave={(input) => eventDraftMutation.mutateAsync({ id: eventoQuery.data!.id, input })}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedModelId} onOpenChange={(open) => !open && setSelectedModelId(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar serviço de notificação</DialogTitle>
            <DialogDescription>Altere a mensagem e os destinatários com controles guiados. Nenhuma mudança inicia envios automaticamente.</DialogDescription>
          </DialogHeader>
          {modeloQuery.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {modeloQuery.data && (
            <ServicoNotificacaoEditor
              modelo={modeloQuery.data}
              evento={eventoModeloQuery.data}
              catalogo={catalogoQuery.data?.eventos.find((evento) => evento.codigo === modeloQuery.data?.evento.codigo)}
              disabled={anyMutationPending || eventoModeloQuery.isLoading}
              onSave={(input) => notificacoesAdminApi.atualizarModeloRascunho(modeloQuery.data!.id, input).then(async () => { await invalidateAdmin(); toast.success('Rascunho salvo.') })}
              onPublish={() => modelPublishMutation.mutate({ id: modeloQuery.data!.id, revisao: modeloQuery.data!.revisao })}
              onPromote={(versaoId) => modelPromoteMutation.mutate({ id: modeloQuery.data!.id, versaoId, revisao: modeloQuery.data!.revisao })}
              onActivate={() => modelActivateMutation.mutate({ id: modeloQuery.data!.id, ativo: !modeloQuery.data!.ativo, revisao: modeloQuery.data!.revisao })}
              onPublishEvent={() => eventPublishMutation.mutate({ id: eventoModeloQuery.data!.id, revisao: eventoModeloQuery.data!.revisao })}
              onPromoteEvent={(versaoId) => eventPromoteMutation.mutate({ id: eventoModeloQuery.data!.id, versaoId, revisao: eventoModeloQuery.data!.revisao })}
              onActivateEvent={() => eventActivateMutation.mutate({ id: eventoModeloQuery.data!.id, ativo: !eventoModeloQuery.data!.ativo, revisao: eventoModeloQuery.data!.revisao })}
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
        <p className="text-xs uppercase text-muted-foreground">Mensagem entregue</p>
        <div className="mt-1"><CorpoNotificacaoPreview corpo={disparo.corpoResolvido} /></div>
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
  catalogo,
  disabled,
  onPublish,
  onPromote,
  onActivate,
  onSave,
}: {
  evento: NotificacaoEventoDetalhe
  catalogo?: NotificacaoCatalogoEvento
  disabled: boolean
  onPublish: () => void
  onPromote: (versaoId: string) => void
  onActivate: () => void
  onSave: (input: { revisaoEsperada: number; nome: string; campos: NotificacaoEventoDetalhe['versoes'][number]['campos']; acoes: NotificacaoEventoDetalhe['versoes'][number]['acoes'] }) => Promise<void>
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
      <EventoNotificacaoEditor evento={evento} catalogo={catalogo} disabled={disabled} onSave={onSave} />
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
