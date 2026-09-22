import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type ItemConteudoNotificacao = {
  tipo: 'texto' | 'variavel' | 'acao'
  valor?: string
  campo?: string
  codigo?: string
  negrito?: boolean
  italico?: boolean
  sublinhado?: boolean
  link?: string
}

export type DocumentoNotificacao = {
  versao: 1
  blocos: Array<{
    tipo: 'paragrafo'
    conteudo: ItemConteudoNotificacao[]
  }>
}

export const DOCUMENTO_NOTIFICACAO_VAZIO: DocumentoNotificacao = {
  versao: 1,
  blocos: [{ tipo: 'paragrafo', conteudo: [{ tipo: 'texto', valor: '' }] }],
}

export function normalizarDocumentoNotificacao(raw: unknown): DocumentoNotificacao {
  if (!raw || typeof raw !== 'object') return DOCUMENTO_NOTIFICACAO_VAZIO
  const documento = Array.isArray(raw) ? { blocos: raw } : raw as { blocos?: unknown }
  const blocosRaw = Array.isArray(documento.blocos) ? documento.blocos : []
  const blocos = blocosRaw.map((bloco) => {
    const conteudoRaw = bloco && typeof bloco === 'object' && !Array.isArray(bloco) && Array.isArray((bloco as { conteudo?: unknown }).conteudo)
      ? (bloco as { conteudo: unknown[] }).conteudo
      : []
    const conteudo = conteudoRaw.flatMap<ItemConteudoNotificacao>((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const valor = item as Record<string, unknown>
      if (valor.tipo !== 'texto' && valor.tipo !== 'variavel' && valor.tipo !== 'acao') return []
      return [{
        tipo: valor.tipo,
        ...(typeof valor.valor === 'string' ? { valor: valor.valor } : {}),
        ...(typeof valor.campo === 'string' ? { campo: valor.campo } : {}),
        ...(typeof valor.codigo === 'string' ? { codigo: valor.codigo } : {}),
        ...(valor.negrito === true ? { negrito: true } : {}),
        ...(valor.italico === true ? { italico: true } : {}),
        ...(valor.sublinhado === true ? { sublinhado: true } : {}),
        ...(typeof valor.link === 'string' && /^\/(?!\/)/.test(valor.link) ? { link: valor.link } : {}),
      }]
    })
    return { tipo: 'paragrafo' as const, conteudo: conteudo.length ? conteudo : [{ tipo: 'texto' as const, valor: '' }] }
  })
  return { versao: 1, blocos: blocos.length ? blocos : DOCUMENTO_NOTIFICACAO_VAZIO.blocos }
}

function formatar(item: ItemConteudoNotificacao, conteudo: ReactNode, key: string) {
  let elemento = <span key={`${key}-texto`} className="whitespace-pre-wrap">{conteudo}</span>
  if (item.italico) elemento = <em key={`${key}-italico`}>{elemento}</em>
  if (item.negrito) elemento = <strong key={`${key}-negrito`}>{elemento}</strong>
  if (item.sublinhado) elemento = <u key={`${key}-sublinhado`}>{elemento}</u>
  if (item.link && /^\/(?!\/)/.test(item.link)) {
    return <Link key={`${key}-link`} to={item.link} className="text-primary underline underline-offset-2">{elemento}</Link>
  }
  return elemento
}

export function ConteudoNotificacao({ corpo, className = '' }: { corpo: unknown; className?: string }) {
  const documento = normalizarDocumentoNotificacao(corpo)
  const possuiConteudo = documento.blocos.some((bloco) => bloco.conteudo.some((item) => (item.valor ?? item.campo ?? item.codigo ?? '').length > 0))
  if (!possuiConteudo) return <p className="text-sm text-muted-foreground">Sem conteúdo.</p>

  return (
    <div className={`space-y-3 text-sm leading-6 ${className}`}>
      {documento.blocos.map((bloco, blocoIndex) => (
        <p key={blocoIndex}>
          {bloco.conteudo.map((item, itemIndex) => {
            const texto = item.tipo === 'variavel'
              ? item.valor ?? `{{${item.campo ?? 'campo'}}}`
              : item.tipo === 'acao'
                ? `[${item.codigo ?? 'ação'}]`
                : item.valor ?? ''
            return formatar(item, texto, `${blocoIndex}-${itemIndex}`)
          })}
        </p>
      ))}
    </div>
  )
}
