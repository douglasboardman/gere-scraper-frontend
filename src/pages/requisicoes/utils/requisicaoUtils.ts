import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { z } from 'zod'
import { extractCnpj } from '@/lib/identifier-utils'
import type { IFornecimento, IItem, IItemRequisicao } from '@/types'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export const step1Schema = z.object({
  destDespesa: z.enum(['Material', 'Servico', 'Outras_Obrigacoes'], {
    required_error: 'Selecione a destinação de despesa',
  }),
  justificativa: z.string().min(30, 'Justificativa deve ter pelo menos 30 caracteres'),
  observacoes: z.string().optional(),
})

export type Step1Data = z.infer<typeof step1Schema>

export type SelectedItemEntry = {
  fornecimento: IFornecimento
  item: IItem
  quantidade: number
  modo: 'qtd' | 'valor'
  valDigitado: number
}

// ---------------------------------------------------------------------------
// Shared utility functions
// ---------------------------------------------------------------------------

export function formatCNPJ(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length !== 14) return digits
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function cnpjFromFornecedorId(identFornecedor: string): string {
  return formatCNPJ(extractCnpj(identFornecedor))
}

export function fmtDate(dateStr?: string): string {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return dateStr
  }
}

export function valUnitario(f: IFornecimento): number {
  const raw = f.valUnitHomologado ?? f.valorUnitario ?? 0
  return Math.round(raw * 100) / 100
}

export function saldoDisp(f: IFornecimento): number {
  return f.saldoDisponivel ?? f.saldo ?? 0
}

export function descBreve(item: IItem): string {
  return item.descBreve ?? item.descricaoBreve ?? item.identificador ?? ''
}

export function descDetalhada(item: IItem): string {
  return item.descDetalhada ?? item.descricaoDetalhada ?? 'Não informada.'
}

export function unMedida(item: IItem): string {
  return item.unMedida ?? item.unidadeMedida ?? ''
}

export function floatToMaskDigits(value: number): string {
  return Math.round(value * 100).toString()
}

export function formatCurrencyMask(digits: string): string {
  if (!digits) return '0,00'
  const n = parseInt(digits, 10) || 0
  if (digits.length < 3) {
    const padded = digits.padStart(3, '0')
    return padded[0] + ',' + padded.slice(1)
  }
  if (n < 10) return '0,0' + String(n)
  if (n < 100) return '0,' + String(n).padStart(2, '0')
  const clean = String(n)
  const l = clean.length
  const intPart = clean.slice(0, l - 2)
  const decPart = clean.slice(l - 2)
  let formatted = ''
  for (let i = 0; i < intPart.length; i++) {
    if (i > 0 && (intPart.length - i) % 3 === 0) formatted += '.'
    formatted += intPart[i]
  }
  return formatted + ',' + decPart
}

export function getItemName(item: IItemRequisicao): string {
  const f = item.identFornecimento as IFornecimento
  if (typeof f === 'string') return f
  const i = f?.identItem as IItem
  if (typeof i === 'string') return i
  return i?.descricaoBreve ?? i?.descBreve ?? i?.numItem ?? f?.identificador ?? '—'
}

export function getFornecedorName(item: IItemRequisicao): string {
  const f = item.identFornecimento as IFornecimento
  if (typeof f === 'string') return '—'
  return f?.nomeFornecedor ?? '—'
}

export function extrairIdContratacao(identFornecimento: string): string | null {
  const iteIdx = identFornecimento.indexOf('ITE-')
  if (iteIdx === -1) return null
  const afterIte = identFornecimento.slice(iteIdx + 4)
  const lastDot = afterIte.lastIndexOf('.')
  if (lastDot === -1) return null
  return `CON-${afterIte.slice(0, lastDot)}`
}
