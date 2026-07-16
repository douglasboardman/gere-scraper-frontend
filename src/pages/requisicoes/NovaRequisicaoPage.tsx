import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { IContratacao, IContratoOob, IRequisicao, IUnidade } from '@/types'
import { type Step1Data, type SelectedItemEntry } from './utils/requisicaoUtils'
import { StepIndicator } from './components/StepIndicator'
import { Step1Dados } from './components/Step1Dados'
import { Step2Contratacao } from './components/Step2Contratacao'
import { Step2OutrasObrigacoes } from './components/Step2OutrasObrigacoes'
import { Step3Itens } from './components/Step3Itens'
import { Step4Revisao } from './components/Step4Revisao'

export function NovaRequisicaoPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [requisicao, setRequisicao] = useState<IRequisicao | null>(null)
  const [selectedCompra, setSelectedCompra] = useState<IContratacao | null>(null)
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItemEntry>>(new Map())
  const [selectedContratoOob, setSelectedContratoOob] = useState<IContratoOob | null>(null)

  const userUasg =
    typeof user?.unidade === 'object' ? (user.unidade as IUnidade).uasg : undefined

  return (
    <div>
      <PageHeader
        title="Nova Requisição"
        subtitle="Crie uma requisição de material ou serviço."
        actions={
          <Button variant="outline" onClick={() => navigate('/requisicoes/minhas_requisicoes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        }
      />

      <StepIndicator current={step} />

      {step === 1 && (
        <Step1Dados
          initialData={step1Data ?? undefined}
          onComplete={(data) => {
            if (step1Data?.destDespesa !== data.destDespesa) {
              setSelectedCompra(null)
              setSelectedItems(new Map())
              setRequisicao(null)
              setSelectedContratoOob(null)
            }
            setStep1Data(data)
            setStep(2)
          }}
        />
      )}

      {step === 2 && userUasg && step1Data && step1Data.destDespesa === 'Outras_Obrigacoes' && (
        <Step2OutrasObrigacoes
          userUasg={userUasg}
          step1Data={step1Data}
          existingRequisicao={requisicao}
          onComplete={(req, contratacaoOob, contratoOob) => {
            setRequisicao(req)
            setSelectedCompra(contratacaoOob)
            setSelectedContratoOob(contratoOob)
            setStep(3)
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 2 && userUasg && step1Data && step1Data.destDespesa !== 'Outras_Obrigacoes' && (
        <Step2Contratacao
          userUasg={userUasg}
          tipoRequisicao={step1Data.destDespesa}
          step1Data={step1Data}
          existingRequisicao={requisicao}
          onComplete={(req, contratacao) => {
            setRequisicao(req)
            setSelectedCompra(contratacao)
            setStep(3)
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 2 && (!userUasg || !step1Data) && (
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Não foi possível determinar sua unidade. Tente fazer login novamente.
          </CardContent>
        </Card>
      )}

      {step === 3 && requisicao && selectedCompra && step1Data && (
        <Step3Itens
          selectedCompra={selectedCompra}
          userUasg={userUasg!}
          destDespesa={step1Data.destDespesa}
          initialItems={selectedItems}
          identContratoOob={selectedContratoOob?.identificador}
          onComplete={(items) => {
            setSelectedItems(items)
            setStep(4)
          }}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && requisicao && selectedCompra && (
        <Step4Revisao
          requisicao={requisicao}
          selectedCompra={selectedCompra}
          selectedItems={selectedItems}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  )
}
