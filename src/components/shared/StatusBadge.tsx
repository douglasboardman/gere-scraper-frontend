import { Badge } from '@/components/ui/badge'
import type {
  StatusCompra,
  StatusFornecimento,
  StatusRequisicao,
  StatusJob,
} from '@/types'

type AnyStatus =
  | StatusCompra
  | StatusFornecimento
  | StatusRequisicao
  | StatusJob

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' | 'orange'

interface StatusConfig {
  label: string
  variant: BadgeVariant
}

const statusMap: Record<string, StatusConfig> = {
  // Compra / Ata / Item
  'Em Processamento': { label: 'Em Processamento', variant: 'warning' },
  'Processada': { label: 'Processada', variant: 'success' },
  'Inconsistente': { label: 'Inconsistente', variant: 'destructive' },
  'Aguardando': { label: 'Aguardando', variant: 'secondary' },

  // Fornecimento
  'Homologado': { label: 'Homologado', variant: 'success' },
  'Não Homologado': { label: 'Não Homologado', variant: 'secondary' },
  'Esgotado': { label: 'Esgotado', variant: 'orange' },
  'Cancelado': { label: 'Cancelado', variant: 'destructive' },

  // Requisição
  'Rascunho': { label: 'Rascunho', variant: 'secondary' },
  'Enviada': { label: 'Enviada', variant: 'info' },
  'Aprovada': { label: 'Aprovada', variant: 'success' },
  'Rejeitada': { label: 'Rejeitada', variant: 'destructive' },
  'Empenhada': { label: 'Empenhada', variant: 'purple' },

  // Job
  'running': { label: 'Executando', variant: 'info' },
  'completed': { label: 'Concluído', variant: 'success' },
  'failed': { label: 'Falhou', variant: 'destructive' },
  'pending': { label: 'Pendente', variant: 'secondary' },
}

interface StatusBadgeProps {
  status: AnyStatus | string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, variant: 'secondary' as BadgeVariant }

  return (
    <Badge variant={config.variant} className={status === 'running' ? 'animate-pulse' : undefined}>
      {config.label}
    </Badge>
  )
}
