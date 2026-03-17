import { useState } from 'react'
import { toast } from 'sonner'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { fornecedoresApi } from '@/api/fornecedores.api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { SancoesResponse } from '@/types'

const SANCAO_LABELS: Record<keyof SancoesResponse, { sigla: string; descricao: string }> = {
  sancionadoCEIS: {
    sigla: 'CEIS',
    descricao: 'Cadastro Nacional de Empresas Inidôneas e Suspensas',
  },
  sancionadoCNEP: {
    sigla: 'CNEP',
    descricao: 'Cadastro Nacional de Empresas Punidas',
  },
  sancionadoCEPIM: {
    sigla: 'CEPIM',
    descricao: 'Cadastro de Entidades Privadas sem Fins Lucrativos Impedidas',
  },
  sancionadoCEAF: {
    sigla: 'CEAF',
    descricao: 'Cadastro de Expulsões da Administração Federal',
  },
}

interface SancoesDialogProps {
  open: boolean
  onClose: () => void
  nomeFornecedor: string
  sancoes: SancoesResponse | null
}

export function SancoesDialog({ open, onClose, nomeFornecedor, sancoes }: SancoesDialogProps) {
  if (!sancoes) return null

  const temSancao = Object.values(sancoes).some(Boolean)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {temSancao ? (
              <ShieldAlert className="h-5 w-5 text-red-500" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            )}
            Consulta de Sancoes
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{nomeFornecedor}</p>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {(Object.keys(SANCAO_LABELS) as (keyof SancoesResponse)[]).map((key) => {
            const sancionado = sancoes[key]
            const { sigla, descricao } = SANCAO_LABELS[key]
            return (
              <div
                key={key}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  sancionado ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                }`}
              >
                {sancionado ? (
                  <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-sm font-semibold ${sancionado ? 'text-red-700' : 'text-green-700'}`}>
                    {sigla} — {sancionado ? 'Sancionado' : 'Regular'}
                  </p>
                  <p className="text-xs text-muted-foreground">{descricao}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Hook que encapsula a lógica de consulta e estado do dialog de sanções. */
export function useSancoesDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nomeFornecedor, setNomeFornecedor] = useState('')
  const [sancoes, setSancoes] = useState<SancoesResponse | null>(null)

  const consultar = async (cnpj: string, nome: string) => {
    setNomeFornecedor(nome)
    setLoading(true)
    try {
      const data = await fornecedoresApi.consultarSancoes(cnpj)
      setSancoes(data)
      setOpen(true)
    } catch {
      toast.error('Nao foi possivel consultar sancoes no momento.')
    } finally {
      setLoading(false)
    }
  }

  const fechar = () => {
    setOpen(false)
    setSancoes(null)
  }

  return { open, loading, nomeFornecedor, sancoes, consultar, fechar }
}
