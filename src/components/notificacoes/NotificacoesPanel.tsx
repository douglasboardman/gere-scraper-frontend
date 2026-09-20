import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowLeft, Bell, Check, Loader2 } from 'lucide-react'
import { notificacoesApi } from '@/api/notificacoes.api'
import { qk } from '@/lib/query-keys'
import type { EstadoCaixaNotificacoes, NotificacaoDetalhe } from '@/types/notificacoes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  const [estado, setEstado] = useState<EstadoCaixaNotificacoes>('todas')
  const [selecionada, setSelecionada] = useState<string | null>(null)

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

  if (selecionada && detalheQuery.data) {
    const detalhe: NotificacaoDetalhe = detalheQuery.data
    return (
      <Card>
        <CardHeader>
          <Button variant="ghost" className="w-fit px-0" onClick={() => setSelecionada(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para mensagens
          </Button>
          <CardTitle className="text-base">{detalhe.titulo ?? 'Notificação'}</CardTitle>
          <CardDescription>{formatDate(detalhe.disponibilizadaEm)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <CorpoEstruturado corpo={detalhe.corpo} />
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
          <select
            value={estado}
            onChange={(event) => setEstado(event.target.value as EstadoCaixaNotificacoes)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
            aria-label="Filtrar notificações"
          >
            <option value="todas">Todas</option>
            <option value="nao_lidas">Não lidas</option>
            <option value="lidas">Lidas</option>
            <option value="arquivadas">Arquivadas</option>
          </select>
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
            <button key={item.id} type="button" onClick={() => setSelecionada(item.id)} className="flex w-full items-start justify-between gap-4 py-3 text-left hover:bg-muted/40">
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
