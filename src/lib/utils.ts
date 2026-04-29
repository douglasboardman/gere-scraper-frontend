import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  Gavel,
  FileText,
  Package,
  Truck,
  ArrowLeftRight,
  ScrollText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface EntityConfig {
  icon: LucideIcon
  bg: string
  bgAlt: string
}

export const ENTITY_BG = 'bg-[rgba(75,137,96,0.17)]'
export const ENTITY_BG_ALT = 'bg-secondary'

export const ENTITY: Record<string, EntityConfig> = {
  contratacao:  { icon: Gavel,          bg: ENTITY_BG, bgAlt: ENTITY_BG_ALT },
  ata:          { icon: FileText,       bg: ENTITY_BG, bgAlt: ENTITY_BG_ALT },
  item:         { icon: Package,        bg: ENTITY_BG, bgAlt: ENTITY_BG_ALT },
  fornecedor:   { icon: Truck,          bg: ENTITY_BG, bgAlt: ENTITY_BG_ALT },
  fornecimento: { icon: ArrowLeftRight, bg: ENTITY_BG, bgAlt: ENTITY_BG_ALT },
  contrato:     { icon: ScrollText,     bg: ENTITY_BG, bgAlt: ENTITY_BG_ALT },
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return cnpj
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function destDespesaLabel(dest?: string | null): string {
  if (dest === 'Servico') return 'Serviço'
  if (dest === 'Outras_Obrigacoes') return 'Outras Obrigações'
  return dest ?? '—'
}
