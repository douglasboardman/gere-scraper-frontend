import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, Check, ClipboardPlus, Send, XCircle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { cedenciasItensApi } from '@/api/cedencias-itens.api'
import { contratacoesApi } from '@/api/contratacoes.api'
import { itensApi } from '@/api/itens.api'
import { getApiErrorMessage } from '@/lib/api-error'
import { qk } from '@/lib/query-keys'
import { formatQtd } from '@/lib/utils'
import type { ICedenciaItem, IItem, OfertaCedenciaItem, StatusCedenciaItem } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

const statusLabel: Record<StatusCedenciaItem, string> = {
  Rascunho: 'Rascunho', Enviada: 'Enviada', Aprovada: 'Aprovada',
  Aprovada_Parcialmente: 'Aprovada parcialmente', Rejeitada: 'Rejeitada', Cancelada: 'Cancelada',
}

function StatusCedencia({ status }: { status: StatusCedenciaItem }) {
  const variant = status === 'Aprovada' ? 'default' : status === 'Rejeitada' || status === 'Cancelada' ? 'destructive' : 'secondary'
  return <Badge variant={variant}>{statusLabel[status]}</Badge>
}

function descricaoOferta(oferta: OfertaCedenciaItem) {
  return `${oferta.unidadeDoadora?.nomeAbrev ?? oferta.uasgUnParticipante} — item ${oferta.item.sequencialItemPregao ?? oferta.item.identificador} — saldo ${formatQtd(oferta.saldoDisponivel)}`
}

function descricaoItem(item: IItem) {
  return `Item ${item.sequencialItemPregao ?? item.numItem ?? item.identificador} — ${item.descBreve ?? item.descricaoBreve ?? 'Sem descrição'}`
}

function numeroAta(item: IItem) {
  return item.identAta && typeof item.identAta === 'object' ? item.identAta.numAta : 'Não identificada'
}

export function CedenciasItensPage() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const cedenciaIdNotificacao = searchParams.get('id')
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<ICedenciaItem | null>(null)
  const [contratacaoId, setContratacaoId] = useState('')
  const [itemId, setItemId] = useState('')
  const [ofertaId, setOfertaId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [devolutiva, setDevolutiva] = useState('')
  const [saldoDoado, setSaldoDoado] = useState('')

  const minhas = useQuery({ queryKey: qk.cedenciasItens.caixa('solicitadas'), queryFn: () => cedenciasItensApi.listar({ caixa: 'solicitadas' }) })
  const recebidas = useQuery({ queryKey: qk.cedenciasItens.caixa('recebidas'), queryFn: () => cedenciasItensApi.listar({ caixa: 'recebidas' }) })
  const cedenciaNotificacao = useQuery({
    queryKey: qk.cedenciasItens.detail(cedenciaIdNotificacao ?? ''),
    queryFn: () => cedenciasItensApi.obter(cedenciaIdNotificacao!),
    enabled: !!cedenciaIdNotificacao,
    retry: false,
  })
  const contratacoes = useQuery({ queryKey: qk.contratacoes.all, queryFn: contratacoesApi.listar })
  const itens = useQuery({
    queryKey: qk.itens.byContratacao(contratacaoId),
    queryFn: () => itensApi.listar({ identContratacao: contratacaoId }),
    enabled: !!contratacaoId,
  })
  const ofertas = useQuery({
    queryKey: qk.cedenciasItens.ofertas(contratacaoId, itemId),
    queryFn: () => cedenciasItensApi.ofertas(contratacaoId, itemId),
    enabled: !!contratacaoId && !!itemId,
    retry: false,
  })
  const ofertaSelecionada = useMemo(() => ofertas.data?.find((oferta) => oferta.identificador === ofertaId), [ofertas.data, ofertaId])

  useEffect(() => {
    if (cedenciaNotificacao.data) setSelected(cedenciaNotificacao.data)
  }, [cedenciaNotificacao.data])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk.cedenciasItens.all })
    queryClient.invalidateQueries({ queryKey: qk.fornecimentos.all })
  }
  const criar = useMutation({
    mutationFn: cedenciasItensApi.criar,
    onSuccess: (cedencia) => { invalidate(); toast.success('Pedido salvo como rascunho.'); setSelected(cedencia); setCreateOpen(false) },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Não foi possível criar o pedido.')),
  })
  const enviar = useMutation({
    mutationFn: ({ id, revisao }: ICedenciaItem) => cedenciasItensApi.enviar(id, revisao),
    onSuccess: (cedencia) => { invalidate(); setSelected(cedencia); toast.success('Pedido enviado à unidade doadora.') },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Não foi possível enviar o pedido.')),
  })
  const cancelar = useMutation({
    mutationFn: ({ id, revisao }: ICedenciaItem) => cedenciasItensApi.cancelar(id, revisao),
    onSuccess: (cedencia) => { invalidate(); setSelected(cedencia); toast.success('Pedido cancelado.') },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Não foi possível cancelar o pedido.')),
  })
  const decidir = useMutation({
    mutationFn: ({ cedencia, decisao }: { cedencia: ICedenciaItem; decisao: 'aprovar' | 'rejeitar' }) => decisao === 'aprovar'
      ? cedenciasItensApi.decidir(cedencia.id, { decisao, saldoDoado: Number(saldoDoado), devolutiva, revisao: cedencia.revisao })
      : cedenciasItensApi.decidir(cedencia.id, { decisao, devolutiva, revisao: cedencia.revisao }),
    onSuccess: (cedencia) => { invalidate(); setSelected(cedencia); setDevolutiva(''); setSaldoDoado(''); toast.success('Decisão registrada e saldos atualizados.') },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Não foi possível registrar a decisão.')),
  })

  const abrirNovo = () => {
    setContratacaoId(''); setItemId(''); setOfertaId(''); setQuantidade(''); setJustificativa(''); setCreateOpen(true)
  }
  const salvarRascunho = () => {
    if (!ofertaSelecionada || !Number(quantidade) || justificativa.trim().length < 10) {
      toast.error('Selecione um fornecimento, informe quantidade positiva e uma justificativa com ao menos 10 caracteres.')
      return
    }
    criar.mutate({ identFornecimentoDoador: ofertaSelecionada.identificador, saldoSolicitado: Number(quantidade), justificativa })
  }
  const itensContratacao = (contratacoes.data ?? []).filter((contratacao) => !contratacao.isOutrasObrigacoes && contratacao.amparoLegal === 'LEI_14133_2021')

  const renderLinha = (cedencia: ICedenciaItem, recebida: boolean) => (
    <button key={cedencia.id} onClick={() => setSelected(cedencia)} className="w-full text-left rounded-lg border p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-3"><div>
        <p className="font-medium">{cedencia.fornecimentoDoador.item.descBreve ?? 'Item sem descrição'}</p>
        <p className="text-sm text-muted-foreground mt-1">{recebida ? `Solicitante: ${cedencia.unidadeSolicitante.nomeAbrev}` : `Doadora: ${cedencia.unidadeDoadora.nomeAbrev}`} · Solicitado: {formatQtd(cedencia.saldoSolicitado)}</p>
      </div><StatusCedencia status={cedencia.status} /></div>
    </button>
  )

  return <div className="space-y-5">
    <PageHeader title="Cedências de Itens" subtitle="Transferências de quantitativo entre unidades participantes de uma mesma ata" actions={<Button size="sm" onClick={abrirNovo}><ClipboardPlus className="h-4 w-4 mr-1" />Novo pedido</Button>} />
    <Card className="border-amber-200 bg-amber-50/50"><CardContent className="pt-5 text-sm text-amber-900">Pedidos enviados não reservam saldo. A transferência somente ocorre quando a unidade doadora aprova o pedido; contratos e outras obrigações não participam deste fluxo.</CardContent></Card>
    <Tabs defaultValue="minhas"><TabsList><TabsTrigger value="minhas">Meus pedidos ({minhas.data?.length ?? 0})</TabsTrigger><TabsTrigger value="recebidas">Pedidos recebidos ({recebidas.data?.length ?? 0})</TabsTrigger></TabsList>
      <TabsContent value="minhas" className="space-y-2">{minhas.isLoading ? <p className="text-muted-foreground">Carregando...</p> : minhas.isError ? <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-destructive">{getApiErrorMessage(minhas.error, 'Não foi possível carregar seus pedidos de cedência.')}</p> : minhas.data?.length ? minhas.data.map((item) => renderLinha(item, false)) : <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Nenhum pedido de cedência realizado.</p>}</TabsContent>
      <TabsContent value="recebidas" className="space-y-2">{recebidas.isLoading ? <p className="text-muted-foreground">Carregando...</p> : recebidas.isError ? <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-destructive">{getApiErrorMessage(recebidas.error, 'Não foi possível carregar os pedidos recebidos.')}</p> : recebidas.data?.length ? recebidas.data.map((item) => renderLinha(item, true)) : <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Nenhum pedido endereçado à sua unidade.</p>}</TabsContent>
    </Tabs>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Novo pedido de cedência</DialogTitle><DialogDescription>Selecione um fornecimento disponível de outra unidade participante. O pedido será salvo em rascunho.</DialogDescription></DialogHeader>
      <div className="grid gap-4 py-2"><div className="grid gap-2"><Label>Contratação</Label><Select value={contratacaoId} onValueChange={(value) => { setContratacaoId(value); setItemId(''); setOfertaId('') }}><SelectTrigger><SelectValue placeholder="Selecione a contratação..." /></SelectTrigger><SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">{itensContratacao.map((item) => <SelectItem key={item.identificador} value={item.identificador} title={`${item.numContratacao}/${item.anoContratacao} — ${item.objeto ?? 'Sem objeto'}`}><span className="block truncate">{item.numContratacao}/{item.anoContratacao} — {item.objeto ?? 'Sem objeto'}</span></SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-2"><Label>Item da contratação</Label><Select value={itemId} onValueChange={(value) => { setItemId(value); setOfertaId('') }} disabled={!contratacaoId || itens.isLoading || itens.isError}><SelectTrigger><SelectValue placeholder={itens.isLoading ? 'Carregando itens...' : itens.isError ? 'Não foi possível carregar os itens' : 'Selecione o item para filtrar as ofertas...'} /></SelectTrigger><SelectContent>{itens.data?.filter((item) => item.identAta).sort((a, b) => (a.sequencialItemPregao ?? a.numItem ?? '').localeCompare(b.sequencialItemPregao ?? b.numItem ?? '', 'pt-BR', { numeric: true })).map((item) => <SelectItem key={item.identificador} value={item.identificador}>{descricaoItem(item)}</SelectItem>)}</SelectContent></Select>{itens.isError && <p className="text-sm text-destructive">{getApiErrorMessage(itens.error, 'Não foi possível carregar os itens da contratação.')}</p>}</div>
        <div className="grid gap-2"><Label>Fornecimento doador</Label><Select value={ofertaId} onValueChange={setOfertaId} disabled={!itemId || ofertas.isLoading || ofertas.isError}><SelectTrigger><SelectValue placeholder={!itemId ? 'Selecione primeiro o item...' : ofertas.isLoading ? 'Buscando ofertas...' : ofertas.isError ? 'Não foi possível carregar as ofertas' : 'Selecione o fornecimento...'} /></SelectTrigger><SelectContent>{ofertas.data?.map((item) => <SelectItem key={item.identificador} value={item.identificador}>{descricaoOferta(item)}</SelectItem>)}</SelectContent></Select>{ofertas.isError && <p className="text-sm text-destructive">{getApiErrorMessage(ofertas.error, 'Não foi possível carregar os fornecimentos disponíveis de outras unidades.')}</p>}{!ofertas.isLoading && !ofertas.isError && itemId && ofertas.data?.length === 0 && <p className="text-sm text-muted-foreground">Não há fornecimentos elegíveis de outras unidades para este item.</p>}{ofertaSelecionada && <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1"><p>Fornecedor: {ofertaSelecionada.fornecedor.nome} · Ata: {numeroAta(ofertaSelecionada.item)} · Saldo doador: {formatQtd(ofertaSelecionada.saldoDisponivel)}</p>{ofertaSelecionada.fornecimentoSolicitante ? <p>Fornecimento da sua unidade — autorizado: {formatQtd(ofertaSelecionada.fornecimentoSolicitante.qtdAutorizada)} · utilizado: {formatQtd(ofertaSelecionada.fornecimentoSolicitante.qtdUtilizada)} · saldo atual: {formatQtd(ofertaSelecionada.fornecimentoSolicitante.saldoDisponivel)}</p> : <p>Sua unidade ainda não possui fornecimento deste item e fornecedor.</p>}</div>}</div>
        <div className="grid gap-2"><Label htmlFor="quantidade">Quantidade solicitada</Label><Input id="quantidade" type="number" min={0} step={1} value={quantidade} onChange={(event) => { if (event.target.value === '' || Number(event.target.value) >= 0) setQuantidade(event.target.value) }} /></div>
        <div className="grid gap-2"><Label htmlFor="justificativa">Justificativa</Label><Textarea id="justificativa" value={justificativa} onChange={(event) => setJustificativa(event.target.value)} placeholder="Explique a necessidade da unidade solicitante." /></div>
      </div><DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button onClick={salvarRascunho} disabled={criar.isPending}>Salvar rascunho</Button></DialogFooter>
    </DialogContent></Dialog>

    <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>{selected && <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Pedido de cedência</DialogTitle><DialogDescription>{selected.id}</DialogDescription></DialogHeader>
      <div className="space-y-4 text-sm"><div className="flex justify-between items-center"><StatusCedencia status={selected.status} /><span>Solicitado: <strong>{formatQtd(selected.saldoSolicitado)}</strong></span></div>
        <div className="grid md:grid-cols-2 gap-3 rounded-lg bg-muted/50 p-4"><div><p className="text-muted-foreground">Unidade solicitante</p><p className="font-medium">{selected.unidadeSolicitante.nome} ({selected.unidadeSolicitante.uasg})</p></div><div><p className="text-muted-foreground">Unidade doadora</p><p className="font-medium">{selected.unidadeDoadora.nome} ({selected.unidadeDoadora.uasg})</p></div><div><p className="text-muted-foreground">Item</p><p className="font-medium">{selected.fornecimentoDoador.item.descBreve}</p></div><div><p className="text-muted-foreground">Saldo doado</p><p className="font-medium">{formatQtd(selected.saldoDoado)}</p></div></div>
        <div><p className="text-muted-foreground">Justificativa</p><p>{selected.justificativa}</p></div>{selected.devolutiva && <div><p className="text-muted-foreground">Devolutiva</p><p>{selected.devolutiva}</p></div>}
        {selected.status === 'Enviada' && selected.identUnidadeDoadora && recebidas.data?.some((item) => item.id === selected.id) && <div className="rounded-lg border p-4 space-y-3"><p className="font-medium">Atender pedido</p><div className="grid gap-2"><Label>Quantidade a ceder</Label><Input type="number" min={0} max={selected.saldoSolicitado} step={1} value={saldoDoado} onChange={(event) => { if (event.target.value === '' || Number(event.target.value) >= 0) setSaldoDoado(event.target.value) }} placeholder={String(selected.saldoSolicitado)} /></div><div className="grid gap-2"><Label>Devolutiva <span className="text-muted-foreground">(opcional)</span></Label><Textarea value={devolutiva} onChange={(event) => setDevolutiva(event.target.value)} placeholder="Informe as condições ou motivação da decisão, se desejar." /></div><div className="flex gap-2"><Button onClick={() => decidir.mutate({ cedencia: selected, decisao: 'aprovar' })} disabled={decidir.isPending || Number(saldoDoado) <= 0 || Number(saldoDoado) > selected.saldoSolicitado}><Check className="h-4 w-4 mr-1" />Aprovar</Button><Button variant="destructive" onClick={() => decidir.mutate({ cedencia: selected, decisao: 'rejeitar' })} disabled={decidir.isPending}><XCircle className="h-4 w-4 mr-1" />Rejeitar</Button></div></div>}
        <div><p className="font-medium mb-2">Histórico</p><ol className="space-y-2">{selected.log.map((log) => <li key={log.id} className="border-l-2 pl-3"><span className="font-medium">{log.acao}</span> por {log.ator.nome} · {new Date(log.createdAt).toLocaleString('pt-BR')}</li>)}</ol></div>
      </div><DialogFooter>{selected.status === 'Rascunho' && <Button onClick={() => enviar.mutate(selected)} disabled={enviar.isPending}><Send className="h-4 w-4 mr-1" />Enviar pedido</Button>}{(selected.status === 'Rascunho' || selected.status === 'Enviada') && minhas.data?.some((item) => item.id === selected.id) && <Button variant="outline" onClick={() => cancelar.mutate(selected)} disabled={cancelar.isPending}>Cancelar pedido</Button>}</DialogFooter>
    </DialogContent>}</Dialog>
  </div>
}
