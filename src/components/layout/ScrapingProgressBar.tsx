import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Loader2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { useJobStream } from '@/hooks/useJobStream'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const AMPARO_LEGAL_LABELS: Record<string, string> = {
  LEI_14133_2021: 'Lei 14.133/2021 (Nova Lei de Licitações)',
  LEI_8666_1993: 'Lei 8.666/1993',
}

const MODALIDADE_LABELS: Record<string, string> = {
  Pregao_Eletronico: 'Pregão Eletrônico',
  Pregao_Presencial: 'Pregão Presencial',
  Pregao: 'Pregão',
  Concorrencia_Eletronica: 'Concorrência Eletrônica',
  Concorrencia_Presencial: 'Concorrência Presencial',
  Concorrencia: 'Concorrência',
  Dispensa: 'Dispensa',
  Inexigibilidade: 'Inexigibilidade',
  Chamada_Publica: 'Chamada Pública',
}

export function ScrapingProgressBar() {
  const navigate = useNavigate()
  const { activeJobId, setActiveJobId, activeJobFormData } = useAuthStore()
  const [minimized, setMinimized] = useState(false)
  const [notFoundDialogOpen, setNotFoundDialogOpen] = useState(false)
  const queryClient = useQueryClient()
  const { progresso, itensProcessados, totalItens, atasProcessadas, atasTotal, mensagem, status, errorCode, isActive } =
    useJobStream(activeJobId)

  useEffect(() => {
    if (status === 'completed' || status === 'failed') {
      queryClient.invalidateQueries({ queryKey: ['contratacoes'] })
    }
  }, [status, queryClient])

  useEffect(() => {
    if (status === 'failed' && errorCode === 'CONTRATACAO_NOT_FOUND') {
      setNotFoundDialogOpen(true)
    }
  }, [status, errorCode])

  const handleNotFoundDialogClose = () => {
    setNotFoundDialogOpen(false)
    setActiveJobId(null)
  }

  const handleNotFoundRetry = () => {
    setNotFoundDialogOpen(false)
    setActiveJobId(null)
    navigate('/contratacoes/nova')
  }

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
    <>
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

      <Dialog open={notFoundDialogOpen} onOpenChange={(open) => { if (!open) handleNotFoundDialogClose() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Contratação não localizada
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              A contratação informada não foi encontrada nas bases de dados governamentais
              com os parâmetros informados. O processo de importação não foi concluído.
            </DialogDescription>
          </DialogHeader>

          {activeJobFormData && (
            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1">
              <p className="font-medium text-foreground mb-2">Parâmetros informados:</p>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
                <span className="font-medium text-foreground">Nº da Contratação</span>
                <span>{activeJobFormData.numContratacao}/{activeJobFormData.anoContratacao}</span>
                <span className="font-medium text-foreground">UASG Gestora</span>
                <span>{activeJobFormData.uasgUnGestora}</span>
                <span className="font-medium text-foreground">Modalidade</span>
                <span>{MODALIDADE_LABELS[activeJobFormData.modalidade] ?? activeJobFormData.modalidade}</span>
                <span className="font-medium text-foreground">Amparo Legal</span>
                <span>{AMPARO_LEGAL_LABELS[activeJobFormData.amparoLegal] ?? activeJobFormData.amparoLegal}</span>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Verifique os dados informados, em especial o <strong>Amparo Legal</strong> da contratação, e tente novamente.
          </p>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleNotFoundDialogClose}>
              Fechar
            </Button>
            <Button onClick={handleNotFoundRetry}>
              Nova Importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
