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
  RefreshCw,
  Rocket,
  Settings2,
} from 'lucide-react'
import { notificacoesAdminApi } from '@/api/notificacoes-admin.api'
import type {
  AtualizarNotificacaoModeloRascunhoInput,
  NotificacaoEventoDetalhe,
  NotificacaoEventoResumo,
  NotificacaoDisparoResumo,
  NotificacaoDisparoDetalhe,
  NotificacaoModeloDetalhe,
  NotificacaoModeloResumo,
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

type AdminTab = 'eventos' | 'modelos' | 'disparos'

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

function parseJson(value: string, label: string) {
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`${label} precisa conter um JSON válido.`)
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
        <div className="mb-6 grid gap-3 md:grid-cols-4">
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
              <div><p className="text-xs uppercase text-muted-foreground">Fila de e-mail</p><p className="mt-1 text-sm font-semibold">{diagnosticoQuery.data.email.devidos} devido(s)</p><p className="mt-1 text-xs text-muted-foreground">{diagnosticoQuery.data.email.habilitado ? `${diagnosticoQuery.data.email.incertos} resultado(s) incerto(s)` : 'Desabilitada'}</p></div>
              <Mail className={diagnosticoQuery.data.email.incertos > 0 ? 'h-5 w-5 text-amber-600' : 'h-5 w-5 text-muted-foreground'} />
            </CardContent>
          </Card>
        </div>
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
              disabled={anyMutationPending}
              onSave={(input) => notificacoesAdminApi.atualizarModeloRascunho(modeloQuery.data!.id, input).then(async () => { await invalidateAdmin(); toast.success('Rascunho salvo.') })}
              onPublish={() => modelPublishMutation.mutate({ id: modeloQuery.data!.id, revisao: modeloQuery.data!.revisao })}
              onPromote={(versaoId) => modelPromoteMutation.mutate({ id: modeloQuery.data!.id, versaoId, revisao: modeloQuery.data!.revisao })}
              onActivate={() => modelActivateMutation.mutate({ id: modeloQuery.data!.id, ativo: !modeloQuery.data!.ativo, revisao: modeloQuery.data!.revisao })}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDisparoId} onOpenChange={(open) => !open && setSelectedDisparoId(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhe do disparo</DialogTitle>
            <DialogDescription>Histórico administrativo; a visualização não altera leitura dos destinatários.</DialogDescription>
          </DialogHeader>
          {disparoQuery.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {disparoQuery.data && <DisparoDetail disparo={disparoQuery.data} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DisparoDetail({ disparo }: { disparo: NotificacaoDisparoDetalhe }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><p className="text-xs uppercase text-muted-foreground">Estado</p><Badge variant={disparo.status === 'CONCLUIDO' ? 'success' : 'outline'}>{disparo.status}</Badge></div>
        <div><p className="text-xs uppercase text-muted-foreground">Evento</p><p className="font-mono text-sm">{disparo.evento.codigo} · v{disparo.evento.versao}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Modelo</p><p className="font-mono text-sm">{disparo.modelo.codigo} · v{disparo.modelo.versao}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Destinatários</p><p className="text-sm">{disparo.totalDisponibilizados}/{disparo.totalDestinatarios}</p></div>
      </div>
      <Separator />
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
            {destinatario.entregaEmail && <div className="mt-2 text-xs text-muted-foreground">E-mail: {destinatario.entregaEmail.status} · {destinatario.entregaEmail.emailDestino ?? 'endereço ainda não fixado'}{destinatario.entregaEmail.tentativasLog.length > 0 ? ` · ${destinatario.entregaEmail.tentativasLog.length} tentativa(s)` : ''}</div>}
          </div>
        ))}
        {!disparo.destinatarios.length && <p className="text-sm text-muted-foreground">Nenhum destinatário disponibilizado.</p>}
      </div>
    </div>
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
  disabled,
  onSave,
  onPublish,
  onPromote,
  onActivate,
}: {
  modelo: NotificacaoModeloDetalhe
  disabled: boolean
  onSave: (input: AtualizarNotificacaoModeloRascunhoInput) => Promise<void>
  onPublish: () => void
  onPromote: (versaoId: string) => void
  onActivate: () => void
}) {
  const draft = modelo.versoes.find((versao) => versao.status === 'RASCUNHO') ?? modelo.versoes[0]
  const [title, setTitle] = useState(draft?.tituloTemplate ?? '')
  const [body, setBody] = useState(JSON.stringify(draft?.corpoTemplate ?? DEFAULT_BODY, null, 2))
  const [recipients, setRecipients] = useState(JSON.stringify(draft?.destinatarios ?? DEFAULT_RECIPIENTS, null, 2))
  const [actions, setActions] = useState(JSON.stringify(draft?.acoes ?? DEFAULT_ACTIONS, null, 2))
  const [condition, setCondition] = useState(draft?.condicaoEnvio ?? 'SEMPRE')
  const [filter, setFilter] = useState(draft?.filtroEvento ?? '')
  const [notifyOnLogin, setNotifyOnLogin] = useState(draft?.notificarNoLogin ?? false)
  const [replicateEmail, setReplicateEmail] = useState(draft?.replicarPorEmail ?? false)
  const [validity, setValidity] = useState(String(draft?.validadeHoras ?? 720))
  const [saving, setSaving] = useState(false)

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
  }, [modelo.id, draft?.id, draft?.updatedAt])

  const save = async () => {
    if (!draft) return
    try {
      setSaving(true)
      await onSave({
        revisaoEsperada: modelo.revisao,
        tituloTemplate: title.trim(),
        corpoTemplate: parseJson(body, 'Conteúdo'),
        destinatarios: parseJson(recipients, 'Destinatários'),
        acoes: parseJson(actions, 'Ações'),
        agendamento: draft.agendamento,
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
          <label className="block space-y-1.5 text-sm font-medium">Conteúdo estruturado (JSON)<Textarea className="min-h-36 font-mono text-xs" value={body} onChange={(event) => setBody(event.target.value)} /></label>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">Destinatários (JSON)<Textarea className="min-h-32 font-mono text-xs" value={recipients} onChange={(event) => setRecipients(event.target.value)} /></label>
            <label className="space-y-1.5 text-sm font-medium">Ações (JSON)<Textarea className="min-h-32 font-mono text-xs" value={actions} onChange={(event) => setActions(event.target.value)} /></label>
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
