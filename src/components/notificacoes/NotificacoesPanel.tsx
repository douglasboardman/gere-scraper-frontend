import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Archive, ArrowLeft, Bell, Check, CheckCheck, Loader2 } from 'lucide-react'
import { notificacoesApi } from '@/api/notificacoes.api'
import { qk } from '@/lib/query-keys'
import { getApiErrorMessage } from '@/lib/api-error'
import type { AcaoNotificacaoResolvida, EstadoCaixaNotificacoes, NotificacaoDetalhe } from '@/types/notificacoes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ConteudoNotificacao } from './ConteudoNotificacao'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export function NotificacoesPanel() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [estado, setEstado] = useState<EstadoCaixaNotificacoes>((searchParams.get('filtro') as EstadoCaixaNotificacoes) || 'todas')
  const [somenteImportantes, setSomenteImportantes] = useState(searchParams.get('importantes') === 'true')
  const selecionada = searchParams.get('mensagem')
  const [acaoConfirmar, setAcaoConfirmar] = useState<{ chave: string; acao: AcaoNotificacaoResolvida } | null>(null)

  const listaQuery = useQuery({
    queryKey: qk.notificacoes.lista(estado, somenteImportantes ? true : undefined),
    queryFn: () => notificacoesApi.listar({ estado, importantes: somenteImportantes ? true : undefined }),
  })
  const detalheQuery = useQuery({
    queryKey: qk.notificacoes.detalhe(selecionada ?? ''),
    queryFn: () => notificacoesApi.detalhe(selecionada!),
    enabled: !!selecionada,
  })
  const estadoMutation = useMutation({
    mutationFn: ({ id, lida }: { id: string; lida: boolean }) => notificacoesApi.marcarLeitura(id, lida),
    onSuccess: async (atualizada) => {
      queryClient.setQueryData<NotificacaoDetalhe>(qk.notificacoes.detalhe(atualizada.id), (anterior) => (
        anterior
          ? { ...anterior, lida: atualizada.lida, lidaEm: atualizada.lidaEm }
          : anterior
      ))
      await queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
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
    mutationFn: (acao: AcaoNotificacaoResolvida) => {
      if (!selecionada) throw new Error('A notificação não está mais selecionada.')
      return notificacoesApi.executarAcao({
        notificacaoId: selecionada,
        acaoCodigo: acao.codigo,
        parametros: acao.parametrosComando ?? {},
        idempotencyKey: acaoConfirmar?.chave ?? crypto.randomUUID(),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
      setAcaoConfirmar(null)
      toast.success('Ação executada com sucesso.')
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Não foi possível executar a ação.')),
  })

  useEffect(() => {
    setSomenteImportantes(searchParams.get('importantes') === 'true')
  }, [searchParams])

  const escolherEstado = (novoEstado: EstadoCaixaNotificacoes) => {
    setEstado(novoEstado)
    const params = new URLSearchParams(searchParams)
    params.set('aba', 'notificacoes')
    params.set('filtro', novoEstado)
    params.delete('mensagem')
    setSearchParams(params)
  }

  const escolherImportantes = (ativo: boolean) => {
    setSomenteImportantes(ativo)
    const params = new URLSearchParams(searchParams)
    params.set('aba', 'notificacoes')
    if (ativo) params.set('importantes', 'true')
    else params.delete('importantes')
    setSearchParams(params)
  }

  const abrirMensagem = (id: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('aba', 'notificacoes')
    params.set('mensagem', id)
    setSearchParams(params)
  }

  const voltarParaMensagens = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('mensagem')
    setSearchParams(params)
  }

  if (selecionada && detalheQuery.data) {
    const detalhe: NotificacaoDetalhe = detalheQuery.data
    const acoes = Array.isArray(detalhe.acoes) ? detalhe.acoes : []
    const acoesNavegacao = acoes.filter((acao) => acao.tipo === 'NAVEGACAO' && !!acao.url && /^\/(?!\/)/.test(acao.url))
    const acoesComando = acoes.filter((acao) => acao.tipo === 'COMANDO')

    const abrirAcao = (acao: AcaoNotificacaoResolvida) => {
      if (acao.url && /^\/(?!\/)/.test(acao.url)) {
        navigate(acao.url)
      }
    }
    return (
      <Card>
        <CardHeader>
          <Button variant="ghost" className="w-fit" onClick={voltarParaMensagens}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para mensagens
          </Button>
          <CardTitle className="text-base">{detalhe.titulo ?? 'Notificação'}</CardTitle>
          <CardDescription>{formatDate(detalhe.disponibilizadaEm)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ConteudoNotificacao corpo={detalhe.corpo} />
          {acoesNavegacao.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-4">
              <p className="text-sm font-medium">Ações disponíveis</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {acoesNavegacao.map((acao, indice) => <Button key={`${acao.codigo}-${indice}`} variant="outline" onClick={() => abrirAcao(acao)}>{acao.rotulo ?? 'Abrir recurso'}</Button>)}
              </div>
            </div>
          )}
          {acoesComando.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-4">
              <p className="text-sm font-medium">Ações disponíveis</p>
              <p className="mt-1 text-xs text-muted-foreground">A execução confere novamente suas permissões e o estado atual do recurso.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {acoesComando.map((acao) => <Button key={acao.codigo} onClick={() => acao.exigeConfirmacao ? setAcaoConfirmar({ chave: crypto.randomUUID(), acao }) : acaoMutation.mutate(acao)} disabled={acaoMutation.isPending}>{acao.rotulo}</Button>)}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={detalhe.lida ? 'outline' : 'default'}
              onClick={() => estadoMutation.mutate({ id: detalhe.id, lida: !detalhe.lida })}
              disabled={estadoMutation.isPending}
            >
              {detalhe.lida ? <CheckCheck className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
              {detalhe.lida ? 'Marcar como não lida' : 'Marcar como lida'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => arquivamentoMutation.mutate({ id: detalhe.id, arquivada: !detalhe.arquivada })} disabled={arquivamentoMutation.isPending}>
              <Archive className="mr-2 h-4 w-4" /> {detalhe.arquivada ? 'Desarquivar' : 'Arquivar'}
            </Button>
          </div>
        </CardContent>
        <ConfirmDialog
          open={!!acaoConfirmar}
          onCancel={() => setAcaoConfirmar(null)}
          onConfirm={() => acaoConfirmar && acaoMutation.mutate(acaoConfirmar.acao)}
          title={acaoConfirmar?.acao.rotulo ?? 'Confirmar ação'}
          description="A ação será executada com as permissões e o estado atuais do recurso."
          confirmLabel="Confirmar ação"
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
            <Button size="sm" variant={somenteImportantes ? 'default' : 'outline'} onClick={() => escolherImportantes(!somenteImportantes)}>
              {somenteImportantes ? 'Todas as mensagens' : 'Somente importantes'}
            </Button>
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
