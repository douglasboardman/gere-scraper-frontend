import { Badge } from '@/components/ui/badge'
import type {
  StatusElemContratacaoAlt,
  StatusElemContratacao,
  StatusRequisicao,
  StatusJob,
} from '@/types'

type AnyStatus =
  | StatusElemContratacaoAlt
  | StatusElemContratacao
  | StatusRequisicao
  | StatusJob

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' | 'orange'

interface StatusConfig {
  label: string
  variant: BadgeVariant
  dot: string
}

const statusMap: Record<string, StatusConfig> = {
  // Contratação / Ata / Item / Fornecimento — ciclo de vida compartilhado
  'Em_Processamento': { label: 'Em Processamento', variant: 'warning',     dot: 'bg-amber-500' },
  'Processada':       { label: 'Processada',        variant: 'secondary',   dot: 'bg-slate-400' },
  'Processado':       { label: 'Processado',         variant: 'secondary',   dot: 'bg-slate-400' },
  'Inconsistente':    { label: 'Inconsistente',      variant: 'destructive', dot: 'bg-red-500' },
  'Disponivel':       { label: 'Disponível',         variant: 'success',     dot: 'bg-emerald-500' },
  'Encerrada':        { label: 'Encerrada',          variant: 'outline',     dot: 'bg-slate-300' },
  'Encerrado':        { label: 'Encerrado',          variant: 'outline',     dot: 'bg-slate-300' },

  // Requisição
  'Rascunho':  { label: 'Rascunho',  variant: 'secondary',   dot: 'bg-slate-400' },
  'Enviada':   { label: 'Enviada',   variant: 'info',         dot: 'bg-blue-400' },
  'Aprovada':  { label: 'Aprovada',  variant: 'success',      dot: 'bg-emerald-500' },
  'Rejeitada': { label: 'Rejeitada', variant: 'destructive',  dot: 'bg-red-500' },
  'Empenhada': { label: 'Empenhada', variant: 'purple',       dot: 'bg-purple-500' },

  // Job
  'running':   { label: 'Executando', variant: 'info',        dot: 'bg-blue-400' },
  'completed': { label: 'Concluído',  variant: 'success',     dot: 'bg-emerald-500' },
  'failed':    { label: 'Falhou',     variant: 'destructive', dot: 'bg-red-500' },
}

interface StatusBadgeProps {
  status: AnyStatus | string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, variant: 'secondary' as BadgeVariant, dot: 'bg-slate-400' }
  const isRunning = status === 'running'

  return (
    <Badge variant={config.variant} className="gap-1.5">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${config.dot} ${isRunning ? 'animate-pulse' : ''}`}
      />
      {config.label}
    </Badge>
  )
}
