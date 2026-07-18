import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ResultadoPregao } from '../types'

interface Props {
  resultado: ResultadoPregao
  onComplete: () => void
  onBack: () => void
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function Step3Quantitativos({ resultado, onComplete, onBack }: Props) {
  const { itens } = resultado

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <p className="text-sm font-medium">
            {itens.length} {itens.length === 1 ? 'item encontrado' : 'itens encontrados'}
          </p>
          <p className="text-sm text-muted-foreground">
            Confira os dados extraídos do PDF antes de prosseguir.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium w-12">Nº</th>
                <th className="pb-2 pr-4 font-medium">Descrição</th>
                <th className="pb-2 pr-4 font-medium text-right">Qtd. Total</th>
                <th className="pb-2 pr-4 font-medium">Un.</th>
                <th className="pb-2 pr-4 font-medium text-right">Vlr. Estimado</th>
                <th className="pb-2 font-medium">Locais de Entrega</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.numeroItem} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-4 tabular-nums">{item.numeroItem}</td>
                  <td className="py-2 pr-4 max-w-[240px]">{item.descricaoResumida}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {item.qtdTotalHomologada.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{item.unMedida}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {item.valorUnitario > 0 ? formatarMoeda(item.valorUnitario) : '—'}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {item.participantes.map((p) => `${p.nomeUnidade} (${p.qtd})`).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={onComplete}>
            Confirmar e prosseguir
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
