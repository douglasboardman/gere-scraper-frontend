import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { StepIndicatorAtas } from './components/StepIndicatorAtas'
import { Step1Selecao } from './components/Step1Selecao'
import { Step2ExtrairPDF } from './components/Step2ExtrairPDF'
import { Step3Quantitativos } from './components/Step3Quantitativos'
import { Step4Descricoes } from './components/Step4Descricoes'
import { Step5GerarAtas } from './components/Step5GerarAtas'
import { Step6GerarPDF } from './components/Step6GerarPDF'
import type { ContratacaoPrevia, ResultadoPregao } from './types'

export function WizardAtasPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1)
  const [contratacao, setContratacao] = useState<ContratacaoPrevia | null>(null)
  const [resultado, setResultado] = useState<ResultadoPregao | null>(null)
  const [atasGeradas, setAtasGeradas] = useState<Array<{ identificador: string; numAta: string; fornecedorNome?: string }>>([])

  return (
    <div>
      <PageHeader
        title="Wizard — Geração de Atas de Registro de Preços"
        subtitle="Gere as atas de um pregão eletrônico a partir dos dados do PNCP."
        actions={
          <Button variant="outline" onClick={() => navigate('/contratacoes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        }
      />

      <StepIndicatorAtas current={step} />

      {step === 1 && (
        <Step1Selecao
          onComplete={(c) => {
            setContratacao(c)
            setStep(2)
          }}
        />
      )}

      {step === 2 && contratacao && (
        <Step2ExtrairPDF
          identContratacao={contratacao.identificador}
          onComplete={(r) => {
            setResultado(r)
            setStep(3)
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && contratacao && resultado && (
        <Step3Quantitativos
          resultado={resultado}
          onComplete={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && contratacao && (
        <Step4Descricoes
          identContratacao={contratacao.identificador}
          onComplete={() => setStep(5)}
          onBack={() => setStep(3)}
        />
      )}

      {step === 5 && contratacao && resultado && (
        <Step5GerarAtas
          identContratacao={contratacao.identificador}
          resultado={resultado}
          onComplete={(atas) => {
            setAtasGeradas(atas)
            setStep(6)
          }}
          onBack={() => setStep(4)}
        />
      )}

      {step === 6 && contratacao && (
        <Step6GerarPDF
          identContratacao={contratacao.identificador}
          atas={atasGeradas}
        />
      )}
    </div>
  )
}
