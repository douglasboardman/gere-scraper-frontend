import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, FileSearch } from 'lucide-react'
import apiClient from '@/api/client'
import type { ResultadoPregao } from '../types'

interface Props {
  identContratacao: string
  onComplete: (resultado: ResultadoPregao) => void
  onBack: () => void
}

export function Step2ExtrairPDF({ identContratacao, onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extrair = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post<ResultadoPregao>(
        `/pregao-atas/${identContratacao}/extrair-resultado`,
      )
      onComplete(data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Erro ao extrair dados do PDF.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-3">
          <FileSearch className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">Extrair relação de itens do PNCP</p>
            <p className="text-sm text-muted-foreground mt-1">
              Baixa o arquivo ZIP do PNCP, extrai o PDF <em>RelacaoItens</em> e parseia os itens
              com suas quantidades e locais de entrega.
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive border border-destructive/30 rounded p-3 bg-destructive/5">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={loading}>
            Voltar
          </Button>
          <Button onClick={extrair} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Extraindo...' : 'Extrair dados do PDF'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
