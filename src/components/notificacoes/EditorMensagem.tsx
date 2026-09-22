import { useEffect, useRef, useState } from 'react'
import { Bold, Braces, CornerDownLeft, Italic, Link2, Underline } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DOCUMENTO_NOTIFICACAO_VAZIO,
  normalizarDocumentoNotificacao,
  type DocumentoNotificacao,
  type ItemConteudoNotificacao,
} from './ConteudoNotificacao'

type Marcas = Pick<ItemConteudoNotificacao, 'negrito' | 'italico' | 'sublinhado' | 'link'>

function escaparHtml(valor: string) {
  return valor.replace(/[&<>"']/g, (caractere) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caractere] ?? caractere)
}

function documentoParaHtml(documentoRaw: unknown) {
  const documento = normalizarDocumentoNotificacao(documentoRaw)
  return documento.blocos.map((bloco) => {
    const conteudo = bloco.conteudo.map((item) => {
      const texto = item.tipo === 'variavel' ? `{{${item.campo ?? ''}}}` : item.tipo === 'acao' ? `[${item.codigo ?? ''}]` : item.valor ?? ''
      let html = escaparHtml(texto).replace(/\n/g, '<br>')
      if (item.italico) html = `<em>${html}</em>`
      if (item.negrito) html = `<strong>${html}</strong>`
      if (item.sublinhado) html = `<u>${html}</u>`
      if (item.link && /^\/(?!\/)/.test(item.link)) html = `<a href="${escaparHtml(item.link)}">${html}</a>`
      return html
    }).join('')
    return `<p>${conteudo || '<br>'}</p>`
  }).join('')
}

function mesmasMarcas(a: ItemConteudoNotificacao, b: ItemConteudoNotificacao) {
  return a.tipo === 'texto' && b.tipo === 'texto'
    && !!a.negrito === !!b.negrito
    && !!a.italico === !!b.italico
    && !!a.sublinhado === !!b.sublinhado
    && (a.link ?? '') === (b.link ?? '')
}

function adicionarTexto(destino: ItemConteudoNotificacao[], texto: string, marcas: Marcas, campos: Set<string>) {
  if (!texto) return
  const regex = /\{\{\s*([a-zA-Z][a-zA-Z0-9_.-]{0,119})\s*\}\}/g
  let inicio = 0
  for (const encontrado of texto.matchAll(regex)) {
    const indice = encontrado.index ?? 0
    if (indice > inicio) destino.push({ tipo: 'texto', valor: texto.slice(inicio, indice), ...marcas })
    const codigo = encontrado[1]
    if (campos.has(codigo)) destino.push({ tipo: 'variavel', campo: codigo, ...marcas })
    else destino.push({ tipo: 'texto', valor: encontrado[0], ...marcas })
    inicio = indice + encontrado[0].length
  }
  if (inicio < texto.length) destino.push({ tipo: 'texto', valor: texto.slice(inicio), ...marcas })
}

function itensDoNo(no: Node, marcas: Marcas, campos: Set<string>, destino: ItemConteudoNotificacao[]) {
  if (no.nodeType === Node.TEXT_NODE) {
    adicionarTexto(destino, no.textContent ?? '', marcas, campos)
    return
  }
  if (!(no instanceof HTMLElement)) return
  if (no.tagName === 'BR') {
    adicionarTexto(destino, '\n', marcas, campos)
    return
  }

  const estilo = no.style
  const href = no.tagName === 'A' ? no.getAttribute('href') : null
  const proximas: Marcas = {
    ...marcas,
    ...((no.tagName === 'B' || no.tagName === 'STRONG' || estilo.fontWeight === 'bold' || Number(estilo.fontWeight) >= 600) ? { negrito: true } : {}),
    ...((no.tagName === 'I' || no.tagName === 'EM' || estilo.fontStyle === 'italic') ? { italico: true } : {}),
    ...((no.tagName === 'U' || estilo.textDecoration.includes('underline')) ? { sublinhado: true } : {}),
    ...(href && /^\/(?!\/)/.test(href) ? { link: href } : {}),
  }
  no.childNodes.forEach((filho) => itensDoNo(filho, proximas, campos, destino))
}

function editorParaDocumento(editor: HTMLElement, camposPermitidos: string[]): DocumentoNotificacao {
  const campos = new Set(camposPermitidos)
  const blocos: DocumentoNotificacao['blocos'] = []
  let pendentes: Node[] = []
  const finalizarPendentes = () => {
    if (!pendentes.length) return
    const conteudo: ItemConteudoNotificacao[] = []
    pendentes.forEach((no) => itensDoNo(no, {}, campos, conteudo))
    blocos.push({ tipo: 'paragrafo', conteudo: conteudo.length ? conteudo : [{ tipo: 'texto', valor: '' }] })
    pendentes = []
  }

  editor.childNodes.forEach((no) => {
    if (no instanceof HTMLElement && ['DIV', 'P'].includes(no.tagName)) {
      finalizarPendentes()
      const conteudo: ItemConteudoNotificacao[] = []
      no.childNodes.forEach((filho) => itensDoNo(filho, {}, campos, conteudo))
      blocos.push({ tipo: 'paragrafo', conteudo: conteudo.length ? conteudo : [{ tipo: 'texto', valor: '' }] })
    } else if (no instanceof HTMLBRElement) {
      finalizarPendentes()
      blocos.push({ tipo: 'paragrafo', conteudo: [{ tipo: 'texto', valor: '' }] })
    } else {
      pendentes.push(no)
    }
  })
  finalizarPendentes()

  for (const bloco of blocos) {
    bloco.conteudo = bloco.conteudo.reduce<ItemConteudoNotificacao[]>((resultado, item) => {
      const anterior = resultado[resultado.length - 1]
      if (anterior && mesmasMarcas(anterior, item)) anterior.valor = `${anterior.valor ?? ''}${item.valor ?? ''}`
      else resultado.push(item)
      return resultado
    }, [])
  }
  return { versao: 1, blocos: blocos.length ? blocos.slice(0, 100) : DOCUMENTO_NOTIFICACAO_VAZIO.blocos }
}

export function EditorMensagem({
  value,
  onChange,
  campos,
}: {
  value: unknown
  onChange: (value: DocumentoNotificacao) => void
  campos: Array<{ codigo: string; rotulo: string }>
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const selecaoRef = useRef<Range | null>(null)
  const valorEmitidoRef = useRef('')
  const [campo, setCampo] = useState('')
  const [editandoLink, setEditandoLink] = useState(false)
  const [link, setLink] = useState('')

  useEffect(() => {
    const normalizado = normalizarDocumentoNotificacao(value)
    const assinatura = JSON.stringify(normalizado)
    if (!editorRef.current || assinatura === valorEmitidoRef.current) return
    editorRef.current.innerHTML = documentoParaHtml(normalizado)
    valorEmitidoRef.current = assinatura
  }, [value])

  const memorizarSelecao = () => {
    const selecao = window.getSelection()
    if (!editorRef.current || !selecao?.rangeCount) return
    const faixa = selecao.getRangeAt(0)
    if (editorRef.current.contains(faixa.commonAncestorContainer)) selecaoRef.current = faixa.cloneRange()
  }

  const restaurarSelecao = () => {
    const selecao = window.getSelection()
    const faixa = selecaoRef.current
    if (!selecao || !faixa || !editorRef.current?.contains(faixa.commonAncestorContainer)) {
      editorRef.current?.focus()
      return
    }
    selecao.removeAllRanges()
    selecao.addRange(faixa)
  }

  const emitir = () => {
    if (!editorRef.current) return
    const documento = editorParaDocumento(editorRef.current, campos.map((item) => item.codigo))
    valorEmitidoRef.current = JSON.stringify(documento)
    onChange(documento)
    memorizarSelecao()
  }

  const comando = (nome: string, valor?: string) => {
    restaurarSelecao()
    document.execCommand(nome, false, valor)
    editorRef.current?.focus()
    emitir()
  }

  const inserirCampo = () => {
    if (!campo) return
    comando('insertText', `{{${campo}}}`)
  }

  const aplicarLink = () => {
    const destino = link.trim()
    if (!/^\/(?!\/|api(?:\/|$))[^\s<>"']{0,499}$/.test(destino)) {
      toast.error('Informe uma rota interna iniciada por “/”, por exemplo /requisicoes.')
      return
    }
    comando('createLink', destino)
    setEditandoLink(false)
    setLink('')
  }

  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2" onMouseDown={memorizarSelecao}>
        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Negrito" aria-label="Negrito" onClick={() => comando('bold')}><Bold className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Itálico" aria-label="Itálico" onClick={() => comando('italic')}><Italic className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Sublinhado" aria-label="Sublinhado" onClick={() => comando('underline')}><Underline className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Adicionar link interno" aria-label="Adicionar link interno" onClick={() => { memorizarSelecao(); setEditandoLink((atual) => !atual) }}><Link2 className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Nova linha" aria-label="Nova linha" onClick={() => comando('insertParagraph')}><CornerDownLeft className="h-4 w-4" /></Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <select className="h-8 min-w-48 flex-1 rounded-md border bg-background px-2 text-xs sm:max-w-72" value={campo} onChange={(event) => setCampo(event.target.value)} aria-label="Campo dinâmico">
          <option value="">Inserir campo dinâmico...</option>
          {campos.map((item) => <option key={item.codigo} value={item.codigo}>{item.rotulo} · {`{{${item.codigo}}}`}</option>)}
        </select>
        <Button type="button" size="sm" variant="outline" className="h-8" onClick={inserirCampo} disabled={!campo}><Braces className="mr-1 h-3.5 w-3.5" /> Inserir</Button>
      </div>
      {editandoLink && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 p-2">
          <Input className="h-8 min-w-56 flex-1" value={link} onChange={(event) => setLink(event.target.value)} placeholder="/rota/interna" />
          <Button type="button" size="sm" onClick={aplicarLink}>Aplicar ao texto selecionado</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { comando('unlink'); setEditandoLink(false); setLink('') }}>Remover link</Button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Corpo da mensagem"
        className="min-h-44 px-4 py-3 text-sm leading-6 outline-none [&_a]:text-primary [&_a]:underline [&_p]:min-h-6"
        onInput={emitir}
        onMouseUp={memorizarSelecao}
        onKeyUp={memorizarSelecao}
        onBlur={memorizarSelecao}
        onPaste={(event) => {
          event.preventDefault()
          comando('insertText', event.clipboardData.getData('text/plain'))
        }}
      />
      <p className="border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">Formatação disponível: negrito, itálico, sublinhado, link interno e quebras de linha.</p>
    </div>
  )
}
