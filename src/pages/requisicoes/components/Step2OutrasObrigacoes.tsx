import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { outrasObrigacoesApi } from '@/api/outras-obrigacoes.api'
import { requisicoesApi } from '@/api/requisicoes.api'
import { formatCurrency } from '@/lib/utils'
import type { IContratoOob, IRequisicao, IContratacao } from '@/types'

const anoAtual = String(new Date().getFullYear())

interface Step2OutrasObrigacoesProps {
  userUasg: string
  step1Data: { destDespesa: 'Material' | 'Servico' | 'Outras_Obrigacoes'; justificativa: string; observacoes?: string }
  existingRequisicao: IRequisicao | null
  onComplete: (req: IRequisicao, contratacaoOob: IContratacao, contratoOob: IContratoOob) => void
  onBack: () => void
}

export function Step2OutrasObrigacoes({
  userUasg,
  step1Data,
  existingRequisicao,
  onComplete,
  onBack,
}: Step2OutrasObrigacoesProps) {
  const [selectedContratoId, setSelectedContratoId] = useState<string | null>(null)

  const { data: oob, isLoading } = useQuery({
    queryKey: ['oob-wizard', userUasg, anoAtual],
    queryFn: () => outrasObrigacoesApi.buscarWizard(anoAtual),
  })

  const selecionarMutation = useMutation({
    mutationFn: async (contrato: IContratoOob) => {
      let req: IRequisicao
      if (existingRequisicao) {
        req = await requisicoesApi.atualizar(existingRequisicao.identificador, {
          identContratacao: oob!.identificador,
        })
      } else {
        req = await requisicoesApi.criar({
          ...step1Data,
          identContratacao: oob!.identificador,
        })
      }
      return { req, contrato }
    },
    onSuccess: ({ req, contrato }) => {
      onComplete(req, oob as unknown as IContratacao, contrato)
    },
    onError: () => toast.error('Erro ao vincular requisição.'),
  })

  const contratos = (oob?.contratos ?? []).filter((c) => c.status === 'Disponivel')

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!oob) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-16 text-center text-muted-foreground text-sm">
          Nenhum registro de Outras Obrigações encontrado para o ano {anoAtual}.
        </CardContent>
      </Card>
    )
  }

  if (contratos.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-16 text-center text-muted-foreground text-sm">
          Não há contratos com status Disponível em Outras Obrigações para {anoAtual}.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <p className="text-sm text-muted-foreground">
        Selecione o contrato de Outras Obrigações ao qual deseja vincular sua requisição.
      </p>

      <div className="space-y-3">
        {contratos.map((contrato) => {
          const isSelected = selectedContratoId === contrato.identificador
          return (
            <Card
              key={contrato.identificador}
              className={`cursor-pointer transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedContratoId(contrato.identificador)}
            >
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-primary">{contrato.numContrato}</p>
                  {contrato.objeto && (
                    <p className="text-sm leading-snug line-clamp-2 mt-0.5">{contrato.objeto}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor Global: {formatCurrency(contrato.valGlobal)}
                  </p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-muted-foreground/40'
                  }`}
                />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} disabled={selecionarMutation.isPending}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button
          disabled={!selectedContratoId || selecionarMutation.isPending}
          onClick={() => {
            const contrato = contratos.find((c) => c.identificador === selectedContratoId)
            if (contrato) selecionarMutation.mutate(contrato)
          }}
        >
          {selecionarMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
