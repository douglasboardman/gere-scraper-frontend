import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Archive, ArrowLeft, Bell, Check, CheckCheck, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import { notificacoesApi } from '@/api/notificacoes.api'
import { qk } from '@/lib/query-keys'
import { getApiErrorMessage } from '@/lib/api-error'
import type { EstadoCaixaNotificacoes, NotificacaoDetalhe } from '@/types/notificacoes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function CorpoEstruturado({ corpo }: { corpo: unknown }) {
  const documento = corpo as { blocos?: Array<{ conteudo?: Array<{ tipo?: string; valor?: string; campo?: string; codigo?: string }> }> } | null
  if (!documento?.blocos?.length) return <p className="text-sm text-muted-foreground">Sem conteúdo disponível.</p>

  return (
    <div className="space-y-3 text-sm leading-6">
      {documento.blocos.map((bloco, blocoIndex) => (
        <p key={blocoIndex}>
          {(bloco.conteudo ?? []).map((item, itemIndex) => {
            if (item.tipo === 'texto') return <span key={itemIndex}>{item.valor}</span>
            if (item.tipo === 'variavel') return <span key={itemIndex} className="font-medium">{item.valor ?? item.campo ?? ''}</span>
            return <span key={itemIndex} className="font-medium text-primary">[{item.codigo ?? 'ação'}]</span>
          })}
        </p>
      ))}
    </div>
  )
}

export function NotificacoesPanel() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [estado, setEstado] = useState<EstadoCaixaNotificacoes>((searchParams.get('filtro') as EstadoCaixaNotificacoes) || 'todas')
  const [selecionada, setSelecionada] = useState<string | null>(searchParams.get('mensagem'))
  const [acaoConfirmar, setAcaoConfirmar] = useState<{ chave: string; rotulo: string } | null>(null)
  const leituraAutomaticaId = useRef<string | null>(null)

  const listaQuery = useQuery({
    queryKey: qk.notificacoes.lista(estado),
    queryFn: () => notificacoesApi.listar({ estado }),
  })
  const detalheQuery = useQuery({
    queryKey: qk.notificacoes.detalhe(selecionada ?? ''),
    queryFn: () => notificacoesApi.detalhe(selecionada!),
    enabled: !!selecionada,
  })
  const estadoMutation = useMutation({
    mutationFn: ({ id, lida }: { id: string; lida: boolean }) => notificacoesApi.marcarLeitura(id, lida),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
    },
  })
  const arquivamentoMutation = useMutation({
    mutationFn: ({ id, arquivada }: { id: string; arquivada: boolean }) => notificacoesApi.arquivar(id, arquivada),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
    },
  })
  const lerTodasMutation = useMutation({
    mutationFn: () => notificacoesApi.lerTodas(new Date().toISOString()),
    onSuccess: async (resultado) => {
      await queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
      toast.success(`${resultado.alteradas} mensagem(ns) marcada(s) como lida(s).`)
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Não foi possível marcar as mensagens.')),
  })
  const acaoMutation = useMutation({
    mutationFn: () => {
      if (!selecionada || detalheQuery.data?.acaoContexto?.revisaoEsperada === null || detalheQuery.data?.acaoContexto?.revisaoEsperada === undefined) throw new Error('A revisão atual da requisição não está disponível.')
      return notificacoesApi.executarAcao({
        notificacaoId: selecionada,
        acaoCodigo: 'APROVAR_REQUISICAO',
        revisaoEsperada: detalheQuery.data.acaoContexto.revisaoEsperada,
        idempotencyKey: acaoConfirmar?.chave ?? crypto.randomUUID(),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
      setAcaoConfirmar(null)
      toast.success('Requisição aprovada com sucesso.')
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Não foi possível executar a ação.')),
  })

  useEffect(() => {
    const mensagem = searchParams.get('mensagem')
    if (mensagem && mensagem !== selecionada) setSelecionada(mensagem)
  }, [searchParams, selecionada])

  useEffect(() => {
    if (!selecionada) {
      leituraAutomaticaId.current = null
      return
    }
    const detalhe = detalheQuery.data
    if (!detalhe || detalhe.id !== selecionada || detalhe.lida || leituraAutomaticaId.current === detalhe.id) return

    // O detalhe já foi obtido e renderizado; a leitura é um comando separado
    // para manter o GET sem efeito colateral.
    leituraAutomaticaId.current = detalhe.id
    void notificacoesApi.marcarLeitura(detalhe.id, true)
      .then(() => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }))
      .catch(() => { leituraAutomaticaId.current = null })
  }, [detalheQuery.data, selecionada, queryClient])

  const escolherEstado = (novoEstado: EstadoCaixaNotificacoes) => {
    setEstado(novoEstado)
    const params = new URLSearchParams(searchParams)
    params.set('aba', 'notificacoes')
    params.set('filtro', novoEstado)
    params.delete('mensagem')
    setSearchParams(params)
  }

  const abrirMensagem = (id: string) => {
    setSelecionada(id)
    const params = new URLSearchParams(searchParams)
    params.set('aba', 'notificacoes')
    params.set('mensagem', id)
    setSearchParams(params)
  }

  if (selecionada && detalheQuery.data) {
    const detalhe: NotificacaoDetalhe = detalheQuery.data
    const acoes = Array.isArray(detalhe.acoes) ? detalhe.acoes as Array<{ codigo?: string; rotulo?: string }> : []
    const acaoAprovar = acoes.find((acao) => acao.codigo === 'APROVAR_REQUISICAO')
    return (
      <Card>
        <CardHeader>
          <Button variant="ghost" className="w-fit px-0" onClick={() => { setSelecionada(null); const params = new URLSearchParams(searchParams); params.delete('mensagem'); setSearchParams(params) }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para mensagens
          </Button>
          <CardTitle className="text-base">{detalhe.titulo ?? 'Notificação'}</CardTitle>
          <CardDescription>{formatDate(detalhe.disponibilizadaEm)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <CorpoEstruturado corpo={detalhe.corpo} />
          {acaoAprovar && detalhe.acaoContexto?.requisicaoId && (
            <div className="rounded-md border bg-muted/30 p-4">
              <p className="text-sm font-medium">Ações disponíveis</p>
              <p className="mt-1 text-xs text-muted-foreground">A aprovação confere novamente autorização, estado e saldo antes de confirmar.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => setAcaoConfirmar({ chave: crypto.randomUUID(), rotulo: acaoAprovar.rotulo ?? 'Aprovar requisição' })} disabled={acaoMutation.isPending || detalhe.acaoContexto.revisaoEsperada === null}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> {acaoAprovar.rotulo ?? 'Aprovar requisição'}
                </Button>
                <Button variant="outline" onClick={() => navigate(`/requisicoes/detalhe?id=${encodeURIComponent(detalhe.acaoContexto!.requisicaoId)}`)}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Abrir requisição
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!detalhe.lida && (
              <Button size="sm" onClick={() => estadoMutation.mutate({ id: detalhe.id, lida: true })} disabled={estadoMutation.isPending}>
                <Check className="mr-2 h-4 w-4" /> Marcar como lida
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => arquivamentoMutation.mutate({ id: detalhe.id, arquivada: !detalhe.arquivada })} disabled={arquivamentoMutation.isPending}>
              <Archive className="mr-2 h-4 w-4" /> {detalhe.arquivada ? 'Desarquivar' : 'Arquivar'}
            </Button>
          </div>
        </CardContent>
        <ConfirmDialog
          open={!!acaoConfirmar}
          onCancel={() => setAcaoConfirmar(null)}
          onConfirm={() => acaoMutation.mutate()}
          title={acaoConfirmar?.rotulo ?? 'Confirmar ação'}
          description="A aprovação será executada com as permissões e o saldo atuais. Essa operação altera o status da requisição e consome os fornecimentos correspondentes."
          confirmLabel="Confirmar aprovação"
          variant="default"
          isLoading={acaoMutation.isPending}
        />
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Notificações</CardTitle>
            <CardDescription>Mensagens operacionais destinadas a você</CardDescription>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <select
              value={estado}
              onChange={(event) => escolherEstado(event.target.value as EstadoCaixaNotificacoes)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
              aria-label="Filtrar notificações"
            >
              <option value="todas">Todas</option>
              <option value="nao_lidas">Não lidas</option>
              <option value="lidas">Lidas</option>
              <option value="arquivadas">Arquivadas</option>
            </select>
            <Button size="sm" variant="outline" onClick={() => lerTodasMutation.mutate()} disabled={lerTodasMutation.isPending}>
              <CheckCheck className="mr-2 h-4 w-4" /> Marcar todas como lidas
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {listaQuery.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {listaQuery.isError && <p className="text-sm text-destructive">Não foi possível carregar suas notificações.</p>}
        {!listaQuery.isLoading && !listaQuery.isError && !listaQuery.data?.itens.length && (
          <p className="text-sm text-muted-foreground">Nenhuma notificação nesta visualização.</p>
        )}
        <div className="divide-y">
          {listaQuery.data?.itens.map((item) => (
            <button key={item.id} type="button" onClick={() => abrirMensagem(item.id)} className="flex w-full items-start justify-between gap-4 py-3 text-left hover:bg-muted/40">
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className={`truncate text-sm ${item.lida ? 'font-normal' : 'font-semibold'}`}>{item.titulo ?? 'Notificação'}</span>
                  {item.importante && <Badge variant="warning">Importante</Badge>}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{formatDate(item.disponibilizadaEm)}</span>
              </span>
              {!item.lida && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Não lida" />}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
