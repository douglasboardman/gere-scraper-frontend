import { useState, useEffect } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { useJobStream } from '@/hooks/useJobStream'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ScrapingProgressBar() {
  const { activeJobId, setActiveJobId } = useAuthStore()
  const [minimized, setMinimized] = useState(false)
  const queryClient = useQueryClient()
  const { progresso, itensProcessados, totalItens, atasProcessadas, atasTotal, mensagem, status, isActive } =
    useJobStream(activeJobId)

  useEffect(() => {
    if (status === 'completed' || status === 'failed') {
      queryClient.invalidateQueries({ queryKey: ['compras'] })
    }
  }, [status, queryClient])

  // Don't render if no active job
  if (!activeJobId) return null

  // Hide if minimized and completed
  if (minimized && status === 'completed') {
    return null
  }

  const handleClose = () => {
    if (status === 'completed' || status === 'failed') {
      setActiveJobId(null)
    } else {
      setMinimized(true)
    }
  }

  const isFailed = status === 'failed'
  const isCompleted = status === 'completed'

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 px-4 py-3 transition-all duration-300',
        isFailed ? 'bg-red-900' : 'bg-[#272626]'
      )}
    >
      {minimized ? (
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-2 text-white text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-green-400" />
            <span>Processamento em andamento...</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 h-7"
            onClick={() => setMinimized(false)}
          >
            Expandir
          </Button>
        </div>
      ) : (
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="shrink-0">
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              ) : isFailed ? (
                <AlertCircle className="h-5 w-5 text-red-400" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-green-400" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white text-sm font-medium truncate">
                  {isCompleted
                    ? 'Processamento concluído!'
                    : isFailed
                    ? 'Erro no processamento'
                    : `Processando: ${mensagem || 'Aguarde...'}`}
                </p>
                <div className="text-xs text-gray-400 ml-4 shrink-0">
                  {atasTotal > 0 && (
                    <span className="mr-3">
                      {atasProcessadas}/{atasTotal} atas
                    </span>
                  )}
                  {totalItens > 0 && (
                    <span>
                      {itensProcessados}/{totalItens} itens
                    </span>
                  )}
                </div>
              </div>

              <Progress
                value={progresso}
                className={cn(
                  'h-1.5',
                  isFailed ? 'bg-red-700 [&>div]:bg-red-400' : 'bg-white/20 [&>div]:bg-green-400'
                )}
              />
            </div>

            {/* Percentage */}
            <div className="text-white text-sm font-semibold w-10 text-right shrink-0">
              {progresso}%
            </div>

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10 shrink-0"
              onClick={handleClose}
              title={isActive ? 'Minimizar' : 'Fechar'}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
