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
}

export const ENTITY: Record<string, EntityConfig> = {
  contratacao:  { icon: Gavel,          bg: 'bg-emerald-200/60' },
  ata:          { icon: FileText,       bg: 'bg-sky-200/60' },
  item:         { icon: Package,        bg: 'bg-gray-200/60' },
  fornecedor:   { icon: Truck,          bg: 'bg-amber-100/80' },
  fornecimento: { icon: ArrowLeftRight, bg: 'bg-purple-200/50' },
  contrato:     { icon: ScrollText,     bg: 'bg-amber-200/60' },
}
