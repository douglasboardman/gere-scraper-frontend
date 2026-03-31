import { Badge } from '@/components/ui/badge'
import type {
  StatusContratacao,
  StatusAta,
  StatusItem,
  StatusFornecimento,
  StatusRequisicao,
  StatusJob,
} from '@/types'

type AnyStatus =
  | StatusContratacao
  | StatusAta
  | StatusItem
  | StatusFornecimento
  | StatusRequisicao
  | StatusJob

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' | 'orange'

interface StatusConfig {
  label: string
  variant: BadgeVariant
}

const statusMap: Record<string, StatusConfig> = {
  // Contratação / Ata / Item / Fornecimento — ciclo de vida compartilhado
  'Em_Processamento': { label: 'Em Processamento', variant: 'warning' },
  'Processada':       { label: 'Processada',        variant: 'secondary' },
  'Processado':       { label: 'Processado',         variant: 'secondary' },
  'Inconsistente':    { label: 'Inconsistente',      variant: 'destructive' },
  'Disponivel':       { label: 'Disponível',         variant: 'success' },
  'Encerrada':        { label: 'Encerrada',          variant: 'outline' },
  'Encerrado':        { label: 'Encerrado',          variant: 'outline' },

  // Requisição
  'Rascunho':  { label: 'Rascunho',  variant: 'secondary' },
  'Enviada':   { label: 'Enviada',   variant: 'info' },
  'Aprovada':  { label: 'Aprovada',  variant: 'success' },
  'Rejeitada': { label: 'Rejeitada', variant: 'destructive' },
  'Empenhada': { label: 'Empenhada', variant: 'purple' },

  // Job
  'running':   { label: 'Executando', variant: 'info' },
  'completed': { label: 'Concluído',  variant: 'success' },
  'failed':    { label: 'Falhou',     variant: 'destructive' },
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
