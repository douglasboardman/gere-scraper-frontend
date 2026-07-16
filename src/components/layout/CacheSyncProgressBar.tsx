import { useEffect } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { qk } from '@/lib/query-keys'
import { useCacheSyncStream } from '@/hooks/useCacheSyncStream'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CacheSyncProgressBar() {
  const { activeCacheSyncJobId, setActiveCacheSyncJobId } = useAuthStore()
  const queryClient = useQueryClient()
  const {
    progresso, mensagem,
    contratosInseridos, contratosAtualizados, contratosIgnorados,
    status,
  } = useCacheSyncStream(activeCacheSyncJobId)

  useEffect(() => {
    if (status === 'completed' || status === 'failed') {
      queryClient.invalidateQueries({ queryKey: qk.contratos.dashboardAll })
      const timer = setTimeout(() => setActiveCacheSyncJobId(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [status, queryClient, setActiveCacheSyncJobId])

  if (!activeCacheSyncJobId) return null

  const isFailed = status === 'failed'
  const isCompleted = status === 'completed'

  const counters =
    contratosInseridos + contratosAtualizados + contratosIgnorados > 0
      ? `${contratosInseridos} inseridos · ${contratosAtualizados} atualizados · ${contratosIgnorados} ignorados`
      : null

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 px-4 py-3 transition-all duration-300',
        isFailed ? 'bg-red-900' : 'bg-[#272626]',
      )}
    >
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : isFailed ? (
              <AlertCircle className="h-5 w-5 text-red-400" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white text-sm font-medium truncate">
                {isCompleted
                  ? 'Cache sincronizado!'
                  : isFailed
                  ? 'Erro na sincronização'
                  : `Sincronizando cache: ${mensagem || 'Aguarde...'}`}
              </p>
              {counters && (
                <span className="text-xs text-gray-400 ml-4 shrink-0">{counters}</span>
              )}
            </div>
            <Progress
              value={progresso}
              className={cn(
                'h-1.5',
                isFailed
                  ? 'bg-red-700 [&>div]:bg-red-400'
                  : 'bg-white/20 [&>div]:bg-orange-400',
              )}
            />
          </div>

          <div className="text-white text-sm font-semibold w-10 text-right shrink-0">
            {progresso}%
          </div>

          {(isCompleted || isFailed) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10 shrink-0"
              onClick={() => setActiveCacheSyncJobId(null)}
              title="Fechar"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
