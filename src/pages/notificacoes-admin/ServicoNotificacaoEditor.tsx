import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Eye, Loader2, Plus, Power, Rocket, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type {
  AtualizarNotificacaoModeloRascunhoInput,
  NotificacaoCatalogoEvento,
  NotificacaoEventoDetalhe,
  NotificacaoModeloDetalhe,
} from '@/api/notificacoes-admin.api'
import { EditorMensagem } from '@/components/notificacoes/EditorMensagem'
import { DOCUMENTO_NOTIFICACAO_VAZIO, normalizarDocumentoNotificacao, type DocumentoNotificacao } from '@/components/notificacoes/ConteudoNotificacao'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { getApiErrorMessage } from '@/lib/api-error'

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
  parametros: Record<string, string>
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

const ROTULOS_SELETOR: Record<GrupoDestinatarioEditor['seletor'], string> = {
  PERFIS_DA_UNIDADE: 'Pessoas com perfil na unidade',
  PERFIS_DA_UORG: 'Pessoas com perfil na UORG',
  USUARIO_REFERENCIADO: 'Uma pessoa relacionada ao evento',
  ADMINS_GLOBAIS: 'Administradores do GERE',
}

const ROTULOS_REFERENCIA: Record<string, string> = {
  unidadeEvento: 'Unidade do evento',
  usuarioSolicitante: 'Pessoa solicitante',
  usuarioRequerenteContratacao: 'Requerente configurado para a contratação',
  usuarioResponsavel: 'Pessoa responsável',
  usuarioIniciador: 'Pessoa que iniciou a operação',
}

const ROTULOS_CONDICAO: Record<string, string> = {
  SEMPRE: 'Sempre que o evento ocorrer',
  CADASTRO_AINDA_PENDENTE: 'Somente se o cadastro ainda estiver pendente',
  REQUISICAO_AINDA_ENVIADA_NO_MESMO_CICLO: 'Somente se a requisição ainda aguardar análise',
  FILTRO_RESULTADO_IMPORTACAO: 'Somente para o resultado de importação selecionado',
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

function normalizarDestinatarios(raw: unknown): GrupoDestinatarioEditor[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const valor = item as Record<string, unknown>
    if (!['PERFIS_DA_UNIDADE', 'PERFIS_DA_UORG', 'USUARIO_REFERENCIADO', 'ADMINS_GLOBAIS'].includes(String(valor.seletor))) return []
    return [{
      seletor: valor.seletor as GrupoDestinatarioEditor['seletor'],
      referencia: typeof valor.referencia === 'string' ? valor.referencia : '',
      perfis: Array.isArray(valor.perfis) ? valor.perfis.filter((perfil): perfil is string => typeof perfil === 'string') : [],
      excluirAutor: valor.excluirAutor === true,
    }]
  })
}

function normalizarAcoes(raw: unknown, catalogo?: NotificacaoCatalogoEvento): AcaoEditor[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item, indice) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const valor = item as Record<string, unknown>
    const definicao = (catalogo?.acoes ?? []).find((acao) => acao.codigo === valor.codigo)
    if (!definicao) return []
    const parametrosRaw = valor.parametros && typeof valor.parametros === 'object' && !Array.isArray(valor.parametros)
      ? valor.parametros as Record<string, unknown>
      : {}
    return [{
      codigo: definicao.codigo,
      rotulo: typeof valor.rotulo === 'string' ? valor.rotulo : definicao.rotulo,
      ordem: typeof valor.ordem === 'number' ? valor.ordem : indice,
      exigeConfirmacao: definicao.exigeConfirmacao,
      parametros: Object.fromEntries((definicao.parametros ?? []).map((parametro): [string, string] => [
        parametro.nome,
        typeof parametrosRaw[parametro.nome] === 'string' ? String(parametrosRaw[parametro.nome]) : parametro.campoPadrao,
      ])),
    }]
  })
}

function normalizarCondicaoEnvio(raw: string | null | undefined, catalogo?: NotificacaoCatalogoEvento) {
  const condicoesPermitidas = catalogo?.condicoes ?? []
  if (!condicoesPermitidas.length) return raw ?? 'SEMPRE'
  return raw && condicoesPermitidas.includes(raw) ? raw : condicoesPermitidas[0]
}

function dataFormatada(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export function ServicoNotificacaoEditor({
  modelo,
  evento,
  catalogo,
  disabled,
  onSave,
  onPublish,
  onPromote,
  onActivate,
  onPublishEvent,
  onPromoteEvent,
  onActivateEvent,
  onSimulate,
  creation = false,
}: {
  modelo: NotificacaoModeloDetalhe
  evento?: NotificacaoEventoDetalhe
  catalogo?: NotificacaoCatalogoEvento
  disabled: boolean
  onSave: (input: AtualizarNotificacaoModeloRascunhoInput) => Promise<void>
  onPublish?: () => void
  onPromote?: (versaoId: string) => void
  onActivate?: () => void
  onPublishEvent?: () => void
  onPromoteEvent?: (versaoId: string) => void
  onActivateEvent?: () => void
  onSimulate?: () => Promise<void>
  creation?: boolean
}) {
  const draft = modelo.versoes.find((versao) => versao.status === 'RASCUNHO') ?? modelo.versoes[0]
  const agendamentoInicial = normalizarAgendamento(draft?.agendamento)
  const condicoesCatalogoKey = (catalogo?.condicoes ?? []).join('|')
  const condicaoLegada = Boolean(
    draft?.condicaoEnvio
    && catalogo?.condicoes?.length
    && !catalogo.condicoes.includes(draft.condicaoEnvio),
  )
  const [title, setTitle] = useState(draft?.tituloTemplate ?? '')
  const [serviceName, setServiceName] = useState(modelo.nome)
  const [body, setBody] = useState<DocumentoNotificacao>(normalizarDocumentoNotificacao(draft?.corpoTemplate ?? DOCUMENTO_NOTIFICACAO_VAZIO))
  const [recipients, setRecipients] = useState<GrupoDestinatarioEditor[]>(normalizarDestinatarios(draft?.destinatarios))
  const [actions, setActions] = useState<AcaoEditor[]>(normalizarAcoes(draft?.acoes, catalogo))
  const [condition, setCondition] = useState(normalizarCondicaoEnvio(draft?.condicaoEnvio, catalogo))
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
  const [campoTitulo, setCampoTitulo] = useState('')
  const [novoSeletor, setNovoSeletor] = useState<GrupoDestinatarioEditor['seletor']>('PERFIS_DA_UNIDADE')
  const [novaReferencia, setNovaReferencia] = useState(catalogo?.referencias?.[0] ?? '')
  const [novoPerfil, setNovoPerfil] = useState('gestor_unidade')
  const [novaAcao, setNovaAcao] = useState('')
  const versaoPublicadaEvento = evento?.versoes.find((versao) => versao.status === 'PUBLICADA' && evento.versaoAtiva?.id !== versao.id)
  const rascunhoEvento = evento?.versoes.find((versao) => versao.status === 'RASCUNHO')
  const eventoPronto = Boolean(evento?.ativo && evento.versaoAtiva)

  const referenciasCompativeis = useMemo(() => (catalogo?.referencias ?? []).filter((referencia) => {
    if (novoSeletor === 'USUARIO_REFERENCIADO') return referencia.startsWith('usuario')
    if (novoSeletor === 'PERFIS_DA_UNIDADE' || novoSeletor === 'PERFIS_DA_UORG') return referencia.startsWith('unidade')
    return true
  }), [catalogo, novoSeletor])

  useEffect(() => {
    setTitle(draft?.tituloTemplate ?? '')
    setServiceName(modelo.nome)
    setBody(normalizarDocumentoNotificacao(draft?.corpoTemplate ?? DOCUMENTO_NOTIFICACAO_VAZIO))
    setRecipients(normalizarDestinatarios(draft?.destinatarios))
    setActions(normalizarAcoes(draft?.acoes, catalogo))
    setCondition(normalizarCondicaoEnvio(draft?.condicaoEnvio, catalogo))
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
  }, [modelo.id, modelo.nome, draft?.id, draft?.updatedAt, catalogo?.codigo, condicoesCatalogoKey])

  useEffect(() => {
    if (!referenciasCompativeis.includes(novaReferencia)) setNovaReferencia(referenciasCompativeis[0] ?? catalogo?.referencias?.[0] ?? '')
  }, [referenciasCompativeis, novaReferencia, catalogo])

  const adicionarDestinatario = () => {
    const referencia = novaReferencia || catalogo?.referencias?.[0]
    if (!referencia) return toast.error('Este evento não oferece uma referência compatível.')
    if (recipients.length >= 5) return toast.error('O limite é de cinco grupos de destinatários.')
    setRecipients((atuais) => [...atuais, {
      seletor: novoSeletor,
      referencia,
      perfis: novoSeletor === 'USUARIO_REFERENCIADO' || novoSeletor === 'ADMINS_GLOBAIS' ? [] : [novoPerfil],
      excluirAutor: false,
    }])
  }

  const adicionarAcao = () => {
    const definicao = (catalogo?.acoes ?? []).find((acao) => acao.codigo === novaAcao)
    if (!definicao || actions.some((acao) => acao.codigo === definicao.codigo) || actions.length >= 3) return
    setActions((atuais) => [...atuais, {
      codigo: definicao.codigo,
      rotulo: definicao.rotulo,
      ordem: atuais.length,
      exigeConfirmacao: definicao.exigeConfirmacao,
      parametros: Object.fromEntries((definicao.parametros ?? []).map((parametro) => [parametro.nome, parametro.campoPadrao])),
    }])
    setNovaAcao('')
  }

  const save = async () => {
    if (!draft || !title.trim()) return toast.error('Informe o título da mensagem.')
    if (!catalogo) return toast.error('Aguarde o catálogo do evento terminar de carregar.')
    if (!creation && serviceName.trim().length < 3) return toast.error('Informe o título do serviço.')
    const horas = Number(validity)
    const intervalo = Number(scheduleValue)
    if (!Number.isInteger(horas) || horas < 1 || horas > 8760) return toast.error('A validade deve ficar entre 1 e 8.760 horas.')
    if (scheduleType === 'APOS_INTERVALO' && (!Number.isInteger(intervalo) || intervalo < 1 || intervalo > 43200)) return toast.error('Informe um intervalo válido.')
    const agendamento: AgendamentoEditor = scheduleType === 'IMEDIATO'
      ? { tipo: 'IMEDIATO' }
      : scheduleType === 'APOS_INTERVALO'
        ? { tipo: 'APOS_INTERVALO', valor: intervalo, unidade: scheduleUnit }
        : { tipo: 'PROXIMO_HORARIO', hora: scheduleTime, fuso: scheduleTimezone.trim() }
    try {
      setSaving(true)
      await onSave({
        revisaoEsperada: modelo.revisao,
        ...(!creation ? { nome: serviceName.trim() } : {}),
        tituloTemplate: title.trim(),
        corpoTemplate: body,
        destinatarios: recipients,
        acoes: actions,
        agendamento,
        condicaoEnvio: normalizarCondicaoEnvio(condition, catalogo),
        filtroEvento: filter || null,
        notificarNoLogin: notifyOnLogin,
        replicarPorEmail: replicateEmail,
        validadeHoras: horas,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o rascunho.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {!creation && (
        <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
          <label className="space-y-1.5 text-xs font-medium uppercase text-muted-foreground">Título do serviço<Input className="mt-1 normal-case" value={serviceName} maxLength={180} onChange={(event) => setServiceName(event.target.value)} /></label>
          <div><p className="text-xs uppercase text-muted-foreground">Evento gatilho</p><p className="text-sm font-medium">{modelo.evento.nome}</p><p className="font-mono text-xs text-muted-foreground">{modelo.evento.codigo}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Estado</p><div className="mt-1 flex flex-wrap gap-1"><Badge variant={modelo.ativo ? 'success' : 'secondary'}>{modelo.ativo ? 'Ativo' : 'Inativo'}</Badge>{modelo.versaoAtiva ? <Badge variant="outline">Versão {modelo.versaoAtiva.numero} vigente</Badge> : <Badge variant="outline">Sem versão vigente</Badge>}</div></div>
        </div>
      )}

      <section className="space-y-4">
        <div><h3 className="font-semibold">Mensagem</h3><p className="text-sm text-muted-foreground">Escreva como a mensagem será apresentada. Os campos dinâmicos serão substituídos quando o evento ocorrer.</p></div>
        <label className="block space-y-1.5 text-sm font-medium">
          Título da mensagem
          <div className="flex gap-2"><Input value={title} maxLength={180} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Nova requisição aguardando análise" /><select className="h-10 max-w-72 rounded-md border bg-background px-2 text-xs" value={campoTitulo} onChange={(event) => setCampoTitulo(event.target.value)}><option value="">Campo dinâmico...</option>{(catalogo?.campos ?? []).map((campo) => <option key={campo.codigo} value={campo.codigo}>{campo.rotulo}</option>)}</select><Button type="button" variant="outline" onClick={() => campoTitulo && setTitle((atual) => `${atual}${atual && !atual.endsWith(' ') ? ' ' : ''}{{${campoTitulo}}}`)} disabled={!campoTitulo}>Inserir</Button></div>
        </label>
        <label className="block space-y-1.5 text-sm font-medium">Corpo da mensagem<EditorMensagem value={body} onChange={setBody} campos={(catalogo?.campos ?? []).map(({ codigo, rotulo }) => ({ codigo, rotulo }))} /></label>
      </section>

      <Separator />
      <section className="space-y-4">
        <div><h3 className="font-semibold">Quando enviar</h3><p className="text-sm text-muted-foreground">Cada ocorrência gera no máximo um envio deste serviço.</p></div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1.5 text-sm font-medium">Momento<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={scheduleType} onChange={(event) => setScheduleType(event.target.value as AgendamentoEditor['tipo'])}><option value="IMEDIATO">Assim que o evento ocorrer</option><option value="APOS_INTERVALO">Após um intervalo</option><option value="PROXIMO_HORARIO">No próximo horário definido</option></select></label>
          {scheduleType === 'APOS_INTERVALO' && <><label className="space-y-1.5 text-sm font-medium">Intervalo<Input type="number" min={1} max={43200} value={scheduleValue} onChange={(event) => setScheduleValue(event.target.value)} /></label><label className="space-y-1.5 text-sm font-medium">Unidade<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={scheduleUnit} onChange={(event) => setScheduleUnit(event.target.value as 'MINUTOS' | 'HORAS')}><option value="MINUTOS">Minutos</option><option value="HORAS">Horas</option></select></label></>}
          {scheduleType === 'PROXIMO_HORARIO' && <><label className="space-y-1.5 text-sm font-medium">Horário<Input type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} /></label><label className="space-y-1.5 text-sm font-medium">Fuso horário<Input value={scheduleTimezone} onChange={(event) => setScheduleTimezone(event.target.value)} /></label></>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">Condição<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={condition} onChange={(event) => setCondition(event.target.value)}>{(catalogo?.condicoes ?? ['SEMPRE']).map((item) => <option key={item} value={item}>{ROTULOS_CONDICAO[item] ?? item}</option>)}</select>{condicaoLegada && <span className="block text-xs font-normal text-amber-700">A condição da versão anterior será atualizada para a opção compatível com este evento ao salvar.</span>}</label>
          {condition === 'FILTRO_RESULTADO_IMPORTACAO' && <label className="space-y-1.5 text-sm font-medium">Resultado da importação<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">Qualquer resultado</option><option value="SUCESSO">Sucesso</option><option value="SEM_PARTICIPACAO">Sem participação</option><option value="FALHA">Falha</option></select></label>}
          <label className="space-y-1.5 text-sm font-medium">Disponível por (horas)<Input type="number" min={1} max={8760} value={validity} onChange={(event) => setValidity(event.target.value)} /><span className="block text-xs font-normal text-muted-foreground">Controla a expiração da entrega e de ações.</span></label>
        </div>
      </section>

      <Separator />
      <section className="space-y-4">
        <div><h3 className="font-semibold">Quem recebe</h3><p className="text-sm text-muted-foreground">Você pode combinar até cinco grupos. Uma pessoa incluída mais de uma vez recebe apenas uma mensagem.</p></div>
        <div className="grid gap-3 rounded-lg border bg-muted/10 p-4 md:grid-cols-3">
          <label className="space-y-1.5 text-sm font-medium">Tipo de destinatário<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={novoSeletor} onChange={(event) => setNovoSeletor(event.target.value as GrupoDestinatarioEditor['seletor'])}>{Object.entries(ROTULOS_SELETOR).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</select></label>
          <label className="space-y-1.5 text-sm font-medium">Referência do evento<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={novaReferencia} onChange={(event) => setNovaReferencia(event.target.value)}>{referenciasCompativeis.map((referencia) => <option key={referencia} value={referencia}>{ROTULOS_REFERENCIA[referencia] ?? referencia}</option>)}</select></label>
          {(novoSeletor === 'PERFIS_DA_UNIDADE' || novoSeletor === 'PERFIS_DA_UORG') && <label className="space-y-1.5 text-sm font-medium">Perfil<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={novoPerfil} onChange={(event) => setNovoPerfil(event.target.value)}>{ROLES_NOTIFICACAO.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</select></label>}
          <Button type="button" variant="outline" className="md:col-span-3 md:w-fit" onClick={adicionarDestinatario}><Plus className="mr-2 h-4 w-4" /> Adicionar destinatários</Button>
        </div>
        <div className="space-y-2">
          {recipients.map((grupo, indice) => <div key={`${grupo.seletor}-${grupo.referencia}-${indice}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div><p className="text-sm font-medium">{ROTULOS_SELETOR[grupo.seletor]}</p><p className="text-xs text-muted-foreground">{ROTULOS_REFERENCIA[grupo.referencia] ?? grupo.referencia}{grupo.perfis.length ? ` · ${grupo.perfis.map((perfil) => ROLES_NOTIFICACAO.find(([valor]) => valor === perfil)?.[1] ?? perfil).join(', ')}` : ''}</p></div><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs"><Switch checked={grupo.excluirAutor} onCheckedChange={(checked) => setRecipients((atuais) => atuais.map((item, itemIndice) => itemIndice === indice ? { ...item, excluirAutor: checked } : item))} /> Excluir autor do evento</label><Button type="button" size="sm" variant="ghost" onClick={() => setRecipients((atuais) => atuais.filter((_item, itemIndice) => itemIndice !== indice))}><Trash2 className="h-4 w-4" /><span className="sr-only">Remover grupo</span></Button></div></div>)}
          {!recipients.length && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Nenhum destinatário definido. O rascunho pode ser salvo, mas não produzirá entregas.</p>}
        </div>
      </section>

      <Separator />
      <section className="space-y-4">
        <div><h3 className="font-semibold">Links e botões da mensagem</h3><p className="text-sm text-muted-foreground">Escolha somente ações catalogadas pelo GERE. Rotas e comandos não podem ser digitados livremente.</p></div>
        <div className="flex flex-wrap gap-2"><select className="h-10 min-w-64 flex-1 rounded-md border bg-background px-3 text-sm" value={novaAcao} onChange={(event) => setNovaAcao(event.target.value)}><option value="">Selecione uma ação...</option>{(catalogo?.acoes ?? []).filter((acao) => !actions.some((atual) => atual.codigo === acao.codigo)).map((acao) => <option key={acao.codigo} value={acao.codigo}>{acao.rotulo}</option>)}</select><Button type="button" variant="outline" onClick={adicionarAcao} disabled={!novaAcao}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button></div>
        <div className="space-y-3">{actions.map((acao, indice) => {
          const definicao = (catalogo?.acoes ?? []).find((item) => item.codigo === acao.codigo)
          return <div key={acao.codigo} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><div><Input className="max-w-sm font-medium" value={acao.rotulo} maxLength={120} onChange={(event) => setActions((atuais) => atuais.map((item, itemIndice) => itemIndice === indice ? { ...item, rotulo: event.target.value } : item))} /><p className="mt-2 text-xs text-muted-foreground">{definicao?.descricao}</p><p className="mt-1 font-mono text-xs text-primary">{definicao?.metodo} {definicao?.rota}</p></div><Button type="button" size="sm" variant="ghost" onClick={() => setActions((atuais) => atuais.filter((_item, itemIndice) => itemIndice !== indice).map((item, ordem) => ({ ...item, ordem })))}><Trash2 className="h-4 w-4" /><span className="sr-only">Remover ação</span></Button></div>{(definicao?.parametros ?? []).map((parametro) => <label key={parametro.nome} className="mt-3 block space-y-1.5 text-sm font-medium">Campo usado em “{parametro.rotulo}”<select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={acao.parametros[parametro.nome] ?? parametro.campoPadrao} onChange={(event) => setActions((atuais) => atuais.map((item, itemIndice) => itemIndice === indice ? { ...item, parametros: { ...item.parametros, [parametro.nome]: event.target.value } } : item))}>{(parametro.camposPermitidos ?? []).map((codigo) => <option key={codigo} value={codigo}>{(catalogo?.campos ?? []).find((campo) => campo.codigo === codigo)?.rotulo ?? codigo} · {`{{${codigo}}}`}</option>)}</select></label>)}{definicao?.exigeConfirmacao && <Badge variant="warning" className="mt-3">Exige confirmação do usuário</Badge>}</div>
        })}</div>
      </section>

      <Separator />
      <section className="space-y-3">
        <h3 className="font-semibold">Canais e destaque</h3>
        <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 text-sm"><span><span className="block font-medium">Avisar no login</span><span className="text-xs text-muted-foreground">Destaca a mensagem na próxima autenticação.</span></span><Switch checked={notifyOnLogin} onCheckedChange={setNotifyOnLogin} /></label>
          <label className="flex items-center justify-between gap-3 text-sm"><span><span className="block font-medium">Replicar por e-mail</span><span className="text-xs text-muted-foreground">Cria uma cópia na fila de e-mail.</span></span><Switch checked={replicateEmail} onCheckedChange={setReplicateEmail} /></label>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap gap-2 border-t bg-background/95 px-1 py-4 backdrop-blur">
        <Button onClick={() => void save()} disabled={disabled || saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {creation ? 'Salvar serviço como rascunho' : 'Salvar rascunho'}</Button>
        {!creation && onSimulate && <Button variant="outline" onClick={() => void onSimulate()} disabled={disabled}><Eye className="mr-2 h-4 w-4" /> Visualizar exemplo</Button>}
      </div>

      {!creation && (
        <section className="space-y-4 rounded-lg border bg-muted/10 p-4">
          <div><h3 className="font-semibold">Publicação e ativação</h3><p className="text-sm text-muted-foreground">Salvar não inicia envios. Primeiro publique o rascunho, depois torne a versão vigente e ative o serviço.</p></div>
          <div className="space-y-2">{modelo.versoes.map((versao) => <div key={versao.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-background p-3"><div><p className="text-sm font-medium">Versão {versao.numero} <Badge variant="outline" className="ml-1">{versao.status === 'RASCUNHO' ? 'Rascunho' : 'Publicada'}</Badge>{modelo.versaoAtiva?.id === versao.id && <Badge variant="success" className="ml-1">Vigente</Badge>}</p><p className="text-xs text-muted-foreground">Atualizada em {dataFormatada(versao.updatedAt)}</p></div><div className="flex gap-2">{versao.status === 'RASCUNHO' && onPublish && <Button size="sm" variant="outline" onClick={onPublish} disabled={disabled}><CheckCircle2 className="mr-2 h-4 w-4" /> Publicar</Button>}{versao.status === 'PUBLICADA' && modelo.versaoAtiva?.id !== versao.id && onPromote && <Button size="sm" variant="outline" onClick={() => onPromote(versao.id)} disabled={disabled}><Rocket className="mr-2 h-4 w-4" /> Tornar vigente</Button>}</div></div>)}</div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-background p-3">
            <div>
              <p className="text-sm font-medium">Evento gatilho</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5"><span className="text-xs text-muted-foreground">{modelo.evento.nome}</span>{evento?.versaoAtiva && <Badge variant="outline">Versão {evento.versaoAtiva.numero} vigente</Badge>}<Badge variant={evento?.ativo ? 'success' : 'secondary'}>{evento?.ativo ? 'Ativo' : 'Inativo'}</Badge></div>
              <p className="mt-1 text-xs text-muted-foreground">O evento precisa ter uma versão vigente e estar ativo antes do serviço.</p>
            </div>
            {!evento?.versaoAtiva && versaoPublicadaEvento && onPromoteEvent && <Button size="sm" variant="outline" onClick={() => onPromoteEvent(versaoPublicadaEvento.id)} disabled={disabled}><Rocket className="mr-2 h-4 w-4" /> Tornar evento vigente</Button>}
            {!evento?.versaoAtiva && !versaoPublicadaEvento && rascunhoEvento && onPublishEvent && <Button size="sm" variant="outline" onClick={onPublishEvent} disabled={disabled}><CheckCircle2 className="mr-2 h-4 w-4" /> Publicar evento</Button>}
            {evento?.versaoAtiva && !evento.ativo && onActivateEvent && <Button size="sm" variant="outline" onClick={onActivateEvent} disabled={disabled}><Power className="mr-2 h-4 w-4" /> Ativar evento gatilho</Button>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-background p-3"><div><p className="text-sm font-medium">Envio automático</p><p className="text-xs text-muted-foreground">{modelo.ativo ? 'Novas ocorrências podem gerar mensagens.' : !modelo.versaoAtiva ? 'Torne uma versão publicada do serviço vigente.' : !eventoPronto ? 'Conclua a preparação do evento gatilho acima.' : 'O serviço está pronto para ser ativado.'}</p></div>{onActivate && <Button variant={modelo.ativo ? 'outline' : 'default'} onClick={onActivate} disabled={disabled || (!modelo.ativo && (!modelo.versaoAtiva || !eventoPronto))}><Power className="mr-2 h-4 w-4" /> {modelo.ativo ? 'Desativar serviço' : 'Ativar serviço'}</Button>}</div>
        </section>
      )}
    </div>
  )
}
