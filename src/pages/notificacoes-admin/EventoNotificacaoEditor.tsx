import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { NotificacaoCatalogoEvento, NotificacaoEventoDetalhe, NotificacaoEventoVersao } from '@/api/notificacoes-admin.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { getApiErrorMessage } from '@/lib/api-error'

type Campo = NotificacaoEventoVersao['campos'][number]
type Acao = NotificacaoEventoVersao['acoes'][number]

function configuracao(evento: NotificacaoEventoDetalhe): NotificacaoEventoVersao | undefined {
  return evento.versoes.find((versao) => versao.status === 'RASCUNHO')
    ?? evento.versoes.find((versao) => versao.id === evento.versaoAtiva?.id)
    ?? evento.versoes[0]
}

export function EventoNotificacaoEditor({
  evento,
  catalogo,
  disabled,
  onSave,
}: {
  evento: NotificacaoEventoDetalhe
  catalogo?: NotificacaoCatalogoEvento
  disabled: boolean
  onSave: (input: { revisaoEsperada: number; nome: string; campos: Campo[]; acoes: Acao[] }) => Promise<void>
}) {
  const versao = configuracao(evento)
  const camposPadrao = useMemo<Campo[]>(() => (catalogo?.campos ?? []).map((campo) => ({
    campo: campo.codigo,
    nomeApresentado: campo.rotulo,
    alias: campo.codigo,
    disponivel: true,
  })), [catalogo])
  const acoesPadrao = useMemo<Acao[]>(() => (catalogo?.acoes ?? []).map((acao) => ({
    codigo: acao.codigo,
    rotulo: acao.rotulo,
    parametros: Object.fromEntries(acao.parametros.map((parametro) => [parametro.nome, parametro.campoPadrao])),
  })), [catalogo])
  const camposConfigurados = versao?.campos.length ? versao.campos : camposPadrao
  const acoesConfiguradas = versao?.acoes.length ? versao.acoes : acoesPadrao
  const criandoNovaVersao = !evento.versoes.some((item) => item.status === 'RASCUNHO')
  const [nome, setNome] = useState(evento.nome)
  const [campos, setCampos] = useState<Campo[]>(camposConfigurados)
  const [acoes, setAcoes] = useState<Acao[]>(acoesConfiguradas)
  const [novaAcao, setNovaAcao] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    setNome(evento.nome)
    setCampos(camposConfigurados)
    setAcoes(acoesConfiguradas)
  }, [evento.id, evento.nome, versao?.id, versao?.updatedAt, camposConfigurados, acoesConfiguradas])

  const camposPorCodigo = useMemo(() => new Map((catalogo?.campos ?? []).map((campo) => [campo.codigo, campo])), [catalogo])
  const aliasesDisponiveis = (permitidos: string[]) => campos.filter((campo) => campo.disponivel && permitidos.includes(campo.campo))

  const adicionarAcao = () => {
    const acao = (catalogo?.acoes ?? []).find((item) => item.codigo === novaAcao)
    if (!acao || acoes.some((item) => item.codigo === acao.codigo)) return
    const parametros = Object.fromEntries(acao.parametros.map((parametro) => [parametro.nome, campos.find((campo) => campo.campo === parametro.campoPadrao)?.alias ?? '']))
    setAcoes((atuais) => [...atuais, { codigo: acao.codigo, rotulo: acao.rotulo, parametros }])
    setNovaAcao('')
  }

  const salvar = async () => {
    if (!nome.trim()) return toast.error('Informe o nome do evento gatilho.')
    const aliases = campos.map((campo) => campo.alias)
    if (new Set(aliases).size !== aliases.length) return toast.error('Cada campo precisa de um alias único.')
    try {
      setSalvando(true)
      await onSave({ revisaoEsperada: evento.revisao, nome: nome.trim(), campos, acoes })
      toast.success('Rascunho do evento salvo.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o rascunho do evento.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium">Nome apresentado do evento<Input value={nome} maxLength={180} onChange={(event) => setNome(event.target.value)} /></label>
        <div className="rounded-md border bg-muted/20 p-3"><p className="text-xs uppercase text-muted-foreground">Tipo técnico</p><p className="mt-1 font-mono text-sm">{evento.codigo}</p><p className="mt-1 text-xs text-muted-foreground">O tipo, a view e a captura são definidos pelo GERE.</p></div>
      </div>

      <section className="space-y-3">
        <div><h3 className="font-semibold">Campos disponíveis para mensagens</h3><p className="text-sm text-muted-foreground">Defina como cada dado aprovado será apresentado e chamado nos campos dinâmicos.</p></div>
        <div className="space-y-2">
          {campos.map((campo, indice) => {
            const origem = camposPorCodigo.get(campo.campo)
            return <div key={campo.campo} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(12rem,1fr)_minmax(10rem,1fr)_minmax(9rem,1fr)_auto] md:items-center">
              <div><p className="text-sm font-medium">{origem?.rotulo ?? campo.campo}</p><p className="font-mono text-xs text-muted-foreground">{campo.campo}</p><div className="mt-1 flex gap-1"><Badge variant="outline">{origem?.tipo.replace('_', ' ') ?? 'CAMPO'}</Badge><Badge variant="secondary">{origem?.origem === 'CONTEXTO' ? 'Contexto' : 'Evento'}</Badge></div></div>
              <label className="text-xs font-medium text-muted-foreground">Nome apresentado<Input className="mt-1 text-sm text-foreground" value={campo.nomeApresentado} maxLength={180} onChange={(event) => setCampos((atuais) => atuais.map((item, itemIndice) => itemIndice === indice ? { ...item, nomeApresentado: event.target.value } : item))} /></label>
              <label className="text-xs font-medium text-muted-foreground">Alias<Input className="mt-1 font-mono text-sm text-foreground" value={campo.alias} maxLength={80} onChange={(event) => setCampos((atuais) => atuais.map((item, itemIndice) => itemIndice === indice ? { ...item, alias: event.target.value } : item))} /><span className="mt-1 block font-mono text-[11px] text-primary">{`{{${campo.alias || 'alias'}}}`}</span></label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={campo.disponivel} onCheckedChange={(disponivel) => setCampos((atuais) => atuais.map((item, itemIndice) => itemIndice === indice ? { ...item, disponivel } : item))} /> Disponível</label>
            </div>
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div><h3 className="font-semibold">Links e comandos disponíveis</h3><p className="text-sm text-muted-foreground">Escolha destinos internos aprovados e relacione cada parâmetro a um alias do evento.</p></div>
        <div className="flex gap-2"><select className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" value={novaAcao} onChange={(event) => setNovaAcao(event.target.value)}><option value="">Adicionar ação...</option>{(catalogo?.acoes ?? []).filter((acao) => !acoes.some((item) => item.codigo === acao.codigo)).map((acao) => <option key={acao.codigo} value={acao.codigo}>{acao.rotulo}</option>)}</select><Button type="button" variant="outline" onClick={adicionarAcao} disabled={!novaAcao}><Plus className="mr-2 h-4 w-4" />Adicionar</Button></div>
        {acoes.map((acao, indice) => {
          const definicao = (catalogo?.acoes ?? []).find((item) => item.codigo === acao.codigo)
          if (!definicao) return null
          return <div key={acao.codigo} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><Input value={acao.rotulo} maxLength={120} onChange={(event) => setAcoes((atuais) => atuais.map((item, itemIndice) => itemIndice === indice ? { ...item, rotulo: event.target.value } : item))} /><p className="mt-2 font-mono text-xs text-muted-foreground">{definicao.metodo} {definicao.rota}</p></div><Button type="button" variant="ghost" size="sm" onClick={() => setAcoes((atuais) => atuais.filter((_item, itemIndice) => itemIndice !== indice))}><Trash2 className="h-4 w-4" /><span className="sr-only">Remover ação</span></Button></div>{definicao.parametros.map((parametro) => <label key={parametro.nome} className="mt-3 block text-sm font-medium">{parametro.rotulo}<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={acao.parametros[parametro.nome] ?? ''} onChange={(event) => setAcoes((atuais) => atuais.map((item, itemIndice) => itemIndice === indice ? { ...item, parametros: { ...item.parametros, [parametro.nome]: event.target.value } } : item))}><option value="">Selecione um campo...</option>{aliasesDisponiveis(parametro.camposPermitidos).map((campo) => <option key={campo.alias} value={campo.alias}>{campo.nomeApresentado} · {`{{${campo.alias}}}`}</option>)}</select></label>)}</div>
        })}
        {!acoes.length && <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Nenhuma ação ficará disponível para os serviços deste evento.</p>}
      </section>

      <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t bg-background/95 py-4 backdrop-blur">
        {criandoNovaVersao && <p className="text-sm text-muted-foreground">Ao salvar, será criada uma nova versão em rascunho. A versão publicada não será alterada.</p>}
        <Button className="ml-auto" onClick={() => void salvar()} disabled={disabled || salvando}>{salvando ? 'Salvando...' : 'Salvar rascunho'}</Button>
      </div>
    </div>
  )
}
