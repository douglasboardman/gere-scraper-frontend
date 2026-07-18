import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import apiClient from '@/api/client'

interface ItemDescricao {
  numeroItem: string
  descBreve: string
  descDetalhada: string
}

interface Props {
  identContratacao: string
  onComplete: () => void
  onBack: () => void
}

export function Step4Descricoes({ identContratacao, onComplete, onBack }: Props) {
  const [descricoes, setDescricoes] = useState<ItemDescricao[]>([])
  const [loadingItens, setLoadingItens] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiClient.get(`/pregao-atas/${identContratacao}/itens`)
      .then(r => setDescricoes(r.data.map((item: any) => ({
        numeroItem: item.sequencialItemPregao,
        descBreve: item.descBreve,
        descDetalhada: item.descDetalhada,
      }))))
      .finally(() => setLoadingItens(false))
  }, [identContratacao])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await apiClient.post(
        `/pregao-atas/${identContratacao}/upload-descricoes`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      if (data.itens) {
        setDescricoes(prev => prev.map(d => {
          const match = data.itens.find((i: any) => i.numeroItem === d.numeroItem)
          return match ? { ...d, descDetalhada: match.descDetalhada } : d
        }))
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiClient.patch(`/pregao-atas/${identContratacao}/descricoes`, {
        itens: descricoes.map(d => ({ numeroItem: d.numeroItem, descDetalhada: d.descDetalhada })),
      })
      onComplete()
    } finally {
      setSaving(false)
    }
  }

  const todosPendentes = descricoes.some(d => !d.descDetalhada || d.descDetalhada === 'Pendente')

  if (loadingItens) {
    return <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Carregando itens...</p></CardContent></Card>
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Informe a descrição detalhada de cada item conforme o Termo de Referência.
          </p>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleUpload} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Importando...' : '↑ Importar CSV/XLS'}
            </Button>
          </div>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {descricoes.map((item, idx) => (
            <div key={item.numeroItem} className="border rounded p-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Item {item.numeroItem} — {item.descBreve}
              </div>
              <Textarea
                className="text-sm"
                placeholder="Descrição detalhada conforme Termo de Referência..."
                value={item.descDetalhada === 'Pendente' ? '' : item.descDetalhada}
                onChange={e => setDescricoes(prev => prev.map((d, i) =>
                  i === idx ? { ...d, descDetalhada: e.target.value } : d
                ))}
                rows={2}
              />
            </div>
          ))}
        </div>

        {todosPendentes && (
          <p className="text-xs text-amber-600 mt-2">
            Alguns itens ainda estão com descrição pendente. Você pode avançar assim mesmo ou completar agora.
          </p>
        )}

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onBack}>← Voltar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar e Avançar →'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
