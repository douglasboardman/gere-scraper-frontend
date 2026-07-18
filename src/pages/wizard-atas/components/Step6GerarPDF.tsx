import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { API_BASE_URL } from '@/api/client'

interface Ata {
  identificador: string
  numAta: string
  fornecedorNome?: string
}

interface Props {
  identContratacao: string
  atas: Ata[]
}

export function Step6GerarPDF({ identContratacao, atas }: Props) {
  const downloadPdf = (identAta: string, numAta: string) => {
    const token = localStorage.getItem('gere_token')
    const url = `${API_BASE_URL}/pregao-atas/${identContratacao}/atas/${identAta}/pdf`
    const a = document.createElement('a')
    a.href = `${url}${token ? `?token=${token}` : ''}`
    a.download = `ata-${numAta}.pdf`
    a.click()
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground mb-4">
          Atas geradas com sucesso. Baixe os documentos para impressão e assinatura.
        </p>

        {atas.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma ata gerada.</p>
        )}

        <div className="space-y-2">
          {atas.map(ata => (
            <div key={ata.identificador} className="flex items-center justify-between border rounded p-3">
              <div>
                <p className="text-sm font-medium">Ata nº {ata.numAta}</p>
                {ata.fornecedorNome && (
                  <p className="text-xs text-muted-foreground">{ata.fornecedorNome}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadPdf(ata.identificador, ata.numAta)}>
                ↓ Baixar PDF
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 bg-green-50 dark:bg-green-950 rounded text-sm text-green-700 dark:text-green-300">
          Atas, fornecimentos e participações registrados no sistema.
          Após a publicação no PNCP, atualize os campos idAtaPncp e sequencialAta via painel administrativo.
        </div>
      </CardContent>
    </Card>
  )
}
