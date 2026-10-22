import { parseIdentContratacao } from './identifier-utils'
import { normalizarTextoBusca } from './utils'

interface ContratacaoPesquisavel {
  identificador: string
  objeto?: string | null
  uasgUnGestora: string
}

const semZerosIniciais = (numero: string) => numero.replace(/^0+(?=\d)/, '')

export function correspondeBuscaContratacao(contratacao: ContratacaoPesquisavel, busca: string): boolean {
  const texto = normalizarTextoBusca(busca).trim()
  if (!texto) return true

  const partes = parseIdentContratacao(contratacao.identificador)
  const numeroAno = texto.match(/^(\d+)\s*\/\s*(\d{4})$/)
  // Número/ano é uma comparação estruturada: zeros e espaços não mudam a compra.
  if (numeroAno && partes) {
    return semZerosIniciais(numeroAno[1]) === semZerosIniciais(partes.numContratacao)
      && numeroAno[2] === partes.ano
  }

  return [
    contratacao.identificador,
    contratacao.objeto,
    contratacao.uasgUnGestora,
    partes?.numContratacao,
    partes && semZerosIniciais(partes.numContratacao),
    partes?.ano,
  ].some((valor) => normalizarTextoBusca(valor).includes(texto))
}
