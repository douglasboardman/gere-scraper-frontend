import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import apiClient from '@/api/client'
import type { ResultadoPregao } from '../types'

interface Props {
  identContratacao: string
  resultado: ResultadoPregao
  onComplete: (atasGeradas: Array<{ identificador: string; numAta: string; fornecedorNome?: string }>) => void
  onBack: () => void
}

export function Step5GerarAtas({ identContratacao, resultado, onComplete, onBack }: Props) {
  const [numPrimeiraAta, setNumPrimeiraAta] = useState('')
  const [iniVigencia, setIniVigencia] = useState('')
  const [fimVigencia, setFimVigencia] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fornecedores = [...new Set(resultado.itens.map(i => i.fornecedorNome).filter(Boolean))]

  const handleGerar = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post(`/pregao-atas/${identContratacao}/gerar-atas`, {
        numPrimeiraAta,
        iniVigencia,
        fimVigencia,
        resultado,
      })
      onComplete(data.atasGeradas ?? [])
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Erro ao gerar atas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {fornecedores.length > 0 && (
          <div className="bg-muted rounded p-3 text-sm">
            <p className="font-medium mb-1">Serão geradas {fornecedores.length} ata(s):</p>
            {fornecedores.map((f, i) => (
              <p key={f} className="text-muted-foreground text-xs">Ata {i + 1}: {f}</p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="numAta">Número da 1ª Ata</Label>
            <Input id="numAta" placeholder="Ex: 100" value={numPrimeiraAta} onChange={e => setNumPrimeiraAta(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="iniVig">Início da Vigência</Label>
            <Input id="iniVig" type="date" value={iniVigencia} onChange={e => setIniVigencia(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fimVig">Fim da Vigência</Label>
            <Input id="fimVig" type="date" value={fimVigencia} onChange={e => setFimVigencia(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={onBack}>← Voltar</Button>
          <Button
            onClick={handleGerar}
            disabled={loading || !numPrimeiraAta || !iniVigencia || !fimVigencia}
          >
            {loading ? 'Gerando...' : 'Gerar Atas'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
