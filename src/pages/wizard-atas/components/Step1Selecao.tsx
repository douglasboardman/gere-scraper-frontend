import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import apiClient from '@/api/client'
import type { ContratacaoPrevia } from '../types'

interface Props {
  onComplete: (contratacao: ContratacaoPrevia) => void
}

export function Step1Selecao({ onComplete }: Props) {
  const [contratacoes, setContratacoes] = useState<ContratacaoPrevia[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get('/pregao-atas/contratacoes-previas')
      .then(r => setContratacoes(r.data))
      .finally(() => setLoading(false))
  }, [])

  const selectedContratacao = contratacoes.find(c => c.identificador === selected)

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground mb-4">
          Selecione o pregão eletrônico importado (sem atas) para gerar as atas de registro de preços.
        </p>

        {loading && <p className="text-sm text-muted-foreground">Carregando contratações...</p>}

        {!loading && contratacoes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma contratação elegível encontrada. Realize uma importação prévia primeiro.
          </p>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {contratacoes.map(c => (
            <div
              key={c.identificador}
              onClick={() => setSelected(c.identificador)}
              className={`p-3 border rounded cursor-pointer transition-colors ${
                selected === c.identificador
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-medium text-sm">
                Pregão Eletrônico nº {c.numContratacao}/{c.anoContratacao}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {c.objeto || 'Sem objeto informado'} • {c._count.itens} itens
              </div>
              <div className="text-xs text-muted-foreground">{c.nomeUnGestora}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <Button
            disabled={!selectedContratacao}
            onClick={() => selectedContratacao && onComplete(selectedContratacao)}
          >
            Próximo →
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
