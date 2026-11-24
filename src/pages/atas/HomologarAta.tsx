import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { preparacaoAtasApi, type AtaPreparada, type HomologacaoAta, type Rodada } from '@/api/preparacao-atas.api'
import { useSSEStream } from '@/hooks/useSSEStream'
import { getApiErrorMessage } from '@/lib/api-error'

function Progresso({ compra, tarefa }: { compra: string; tarefa: HomologacaoAta }) {
  const queryClient = useQueryClient()
  const receber = (payload: unknown) => payload as HomologacaoAta
  const evento = useSSEStream<HomologacaoAta>({
    jobId: tarefa.tentativa,
    urlPath: id => '/preparacao-atas/' + compra + '/homologacoes/' + id + '/stream',
    initialState: tarefa, onProgress: receber, onDone: receber, onServerError: receber,
  })
  useEffect(() => {
    if (evento.estado === 'concluida' || evento.estado === 'falha') {
      void queryClient.invalidateQueries({queryKey:['preparacao-atas',compra]})
    }
  }, [evento.estado, compra, queryClient])
  const atual = evento.estado === 'falha' || evento.progresso >= tarefa.progresso ? evento : tarefa
  return <div role="status">
    <progress className="w-full" max={100} value={atual.progresso} aria-label="Progresso da homologação"/>
    <p>{atual.progresso}% · {atual.mensagem}</p>
  </div>
}

export function HomologarAta({compra,rodada,ata}:{compra:string;rodada:string;ata:AtaPreparada}) {
  const cache = useQueryClient()
  const [numero,setNumero]=useState(ata.homologacao?.numero ?? '')
  const [inicio,setInicio]=useState(ata.homologacao?.inicio ?? '')
  const [fim,setFim]=useState(ata.homologacao?.fim ?? '')
  const [enviando,setEnviando]=useState(false)
  const [erro,setErro]=useState('')
  const tarefa=ata.homologacao
  async function homologar(e: FormEvent) {
    e.preventDefault()
    if(enviando)return
    setErro('')
    if(fim<=inicio){setErro('O fim da vigência deve ser posterior ao início.');return}
    setEnviando(true)
    try {
      const nova=await preparacaoAtasApi.homologar(compra,rodada,ata.cnpj,{numero,inicio,fim})
      cache.setQueryData<{ conferido: boolean; rodadas: Rodada[] }>(['preparacao-atas',compra], anterior => anterior && ({
        ...anterior,
        rodadas: anterior.rodadas.map(r => r.id !== rodada ? r : {...r, atas:r.atas.map(a => a.chave === ata.chave ? {...a,homologacao:nova} : a)})
      }))
      await cache.invalidateQueries({queryKey:['preparacao-atas',compra]})
    } catch(e){setErro(getApiErrorMessage(e,'Falha ao iniciar a homologação.'))}
    finally{setEnviando(false)}
  }
  if(tarefa?.estado==='concluida')return <p role="status">Importação homologada · Ata {tarefa.numero} · Vigência de {tarefa.inicio.split('-').reverse().join('/')} a {tarefa.fim.split('-').reverse().join('/')}</p>
  if(tarefa && tarefa.estado!=='falha')return <Progresso key={tarefa.tentativa} compra={compra} tarefa={tarefa}/>
  return <form onSubmit={homologar} className="space-y-3">
    <fieldset disabled={enviando} className="grid gap-3 sm:grid-cols-3">
      <legend className="mb-2 font-medium">Dados publicados no Compras.gov</legend>
      <label>Número oficial da ata<Input required value={numero} onChange={e=>setNumero(e.target.value)} placeholder="123/2026" pattern="[0-9]{1,5}(/[0-9]{4})?" /></label>
      <label>Início da vigência<Input required type="date" value={inicio} onChange={e=>setInicio(e.target.value)} /></label>
      <label>Fim da vigência<Input required type="date" min={inicio} value={fim} onChange={e=>setFim(e.target.value)} /></label>
    </fieldset>
    {(erro || tarefa?.estado==='falha') && <p role="alert">{erro || tarefa?.mensagem}</p>}
    <Button disabled={enviando} type="submit">{enviando?'Iniciando…':'Homologar Importação'}</Button>
  </form>
}
