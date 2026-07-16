import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { requisicoesApi } from '@/api/requisicoes.api'
import { itemRequisicaoApi } from '@/api/itemRequisicao.api'
import { uorgsApi } from '@/api/uorgs.api'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { destDespesaLabel, formatCurrency, formatQtd } from '@/lib/utils'
import { qk } from '@/lib/query-keys'
import { MODALIDADE_LABEL } from '@/types'
import type { IContratacao, IRequisicao, IUnidade } from '@/types'
import {
  valUnitario,
  cnpjFromFornecedorId,
  descBreve,
  unMedida,
  fmtDate,
  type SelectedItemEntry,
} from '../utils/requisicaoUtils'

type ConflitosItem = {
  identFornecimento: string
  descricaoItem: string
  qtdSolicitadaAtual: number
  qtdComprometida: number
  saldoDisponivel: number
  requisicoesConcorrentes: string[]
}

interface Step4RevisaoProps {
  requisicao: IRequisicao
  selectedCompra: IContratacao
  selectedItems: Map<string, SelectedItemEntry>
  onBack: () => void
}

export function Step4Revisao({
  requisicao,
  selectedCompra,
  selectedItems,
  onBack,
}: Step4RevisaoProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const byFornecedor = new Map<string, SelectedItemEntry[]>()
  for (const entry of selectedItems.values()) {
    const key = entry.fornecimento.identFornecedor as string
    if (!byFornecedor.has(key)) byFornecedor.set(key, [])
    byFornecedor.get(key)!.push(entry)
  }
  const documents = Array.from(byFornecedor.entries())

  const totalGeral = Array.from(selectedItems.values()).reduce(
    (sum, e) =>
      sum + (e.modo === 'valor' ? e.valDigitado : valUnitario(e.fornecimento) * e.quantidade),
    0,
  )

  const userUnidade = typeof user?.unidade === 'object' ? (user.unidade as IUnidade) : null
  const unidadeNome = userUnidade?.nomeAbrev ?? userUnidade?.nome ?? '—'

  const { data: uorg } = useQuery({
    queryKey: qk.uorgs.detail(user!.identUorg!),
    queryFn: () => uorgsApi.obter(user!.identUorg!),
    enabled: !!user?.identUorg,
  })
  const uorgLabel = uorg
    ? `${uorg.sigla ? uorg.sigla + ' — ' : ''}${uorg.nome}`
    : (user?.identUorg ?? '—')

  const [conflitoPendente, setConflitoPendente] = useState<{ conflitos: ConflitosItem[] } | null>(
    null,
  )

  const confirmarCienciaMutation = useMutation({
    mutationFn: (novasObservacoes: string) =>
      requisicoesApi.atualizar(requisicao.identificador, { observacoes: novasObservacoes }),
    onSuccess: () => {
      toast.info('Requisição mantida como rascunho. O conflito foi registrado nas observações.')
      queryClient.invalidateQueries({ queryKey: qk.requisicoes.all })
      setConflitoPendente(null)
      navigate('/requisicoes/minhas_requisicoes')
    },
    onError: () => {
      toast.error('Erro ao salvar a anotação de conflito.')
    },
  })

  const salvarMutation = useMutation({
    mutationFn: async (enviar: boolean) => {
      for (const [idForn, entry] of selectedItems.entries()) {
        await itemRequisicaoApi.criar({
          identRequisicao: requisicao.identificador,
          identFornecimento: idForn,
          ...(entry.modo === 'valor'
            ? { valDesejado: entry.valDigitado }
            : { qtdSolicitada: entry.quantidade }),
        })
      }
      if (enviar) {
        await requisicoesApi.enviar(requisicao.identificador)
      }
    },
    onSuccess: (_, enviar) => {
      queryClient.invalidateQueries({ queryKey: qk.requisicoes.all })
      toast.success(
        enviar ? 'Requisição enviada para análise.' : 'Requisição salva como rascunho.',
      )
      navigate(`/requisicoes/detalhe?id=${encodeURIComponent(requisicao.identificador)}`)
    },
    onError: (err: unknown) => {
      const axiosErr = err as {
        response?: {
          status?: number
          data?: { error?: string; conflitos?: ConflitosItem[] }
        }
      }
      if (axiosErr.response?.status === 409 && axiosErr.response.data?.conflitos?.length) {
        setConflitoPendente({ conflitos: axiosErr.response.data.conflitos })
      } else {
        toast.error(
          axiosErr.response?.data?.error ??
            'Erro ao salvar a requisição. Verifique os itens e tente novamente.',
        )
      }
    },
  })

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Cabeçalho do documento */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">
                Requisição de {destDespesaLabel(requisicao.destDespesa)}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {requisicao.identificador}
              </p>
            </div>
            <Badge variant="outline">{requisicao.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                Requerente
              </p>
              <p className="font-medium">{user?.nome}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                Unidade / Setor
              </p>
              <p className="font-medium">{unidadeNome}</p>
              <p className="text-xs text-muted-foreground">{uorgLabel}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
              Justificativa
            </p>
            <p className="leading-relaxed whitespace-pre-wrap">{requisicao.justificativa}</p>
          </div>

          {(requisicao as unknown as { observacoes?: string }).observacoes && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                Observações
              </p>
              <p className="leading-relaxed whitespace-pre-wrap">
                {(requisicao as unknown as { observacoes?: string }).observacoes}
              </p>
            </div>
          )}

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
              Compra Vinculada
            </p>
            <p className="font-medium">
              {selectedCompra.numEdital} —{' '}
              {MODALIDADE_LABEL[selectedCompra.modContratacao ?? ''] ??
                selectedCompra.modContratacao}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {selectedCompra.objeto}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Vigência: {fmtDate(selectedCompra.iniVigencia)} até{' '}
              {fmtDate(selectedCompra.fimVigencia)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Documentos por fornecedor */}
      {documents.map(([identFornecedor, entries], docIdx) => {
        const cnpj = cnpjFromFornecedorId(identFornecedor)
        const nomeFornecedor = entries[0].fornecimento.nomeFornecedor ?? null
        const subTotal = entries.reduce(
          (s, e) =>
            s + (e.modo === 'valor' ? e.valDigitado : valUnitario(e.fornecimento) * e.quantidade),
          0,
        )

        return (
          <Card key={identFornecedor}>
            <CardHeader className="pb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">
                Documento {String(docIdx + 1).padStart(2, '0')}
              </p>
              <CardTitle className="text-sm font-semibold">
                CNPJ {cnpj}
                {nomeFornecedor && (
                  <span className="font-normal text-muted-foreground"> — {nomeFornecedor}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-1.5 pr-4 font-medium">Descrição</th>
                    <th className="text-right py-1.5 px-2 font-medium w-16">Qtd</th>
                    <th className="text-right py-1.5 px-2 font-medium w-24">Valor Unit.</th>
                    <th className="text-right py-1.5 pl-2 font-medium w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const vUnit = valUnitario(entry.fornecimento)
                    return (
                      <tr
                        key={entry.fornecimento.identificador}
                        className="border-b border-dashed last:border-0"
                      >
                        <td className="py-2 pr-4">
                          <p className="font-medium">{descBreve(entry.item)}</p>
                          <p className="text-xs text-muted-foreground">{unMedida(entry.item)}</p>
                        </td>
                        <td className="py-2 px-2 text-right">{formatQtd(entry.quantidade)}</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(vUnit)}</td>
                        <td className="py-2 pl-2 text-right font-medium">
                          {formatCurrency(vUnit * entry.quantidade)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={3}
                      className="pt-2.5 text-right text-xs text-muted-foreground font-medium"
                    >
                      Subtotal
                    </td>
                    <td className="pt-2.5 pl-2 text-right font-semibold">
                      {formatCurrency(subTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        )
      })}

      {/* Total geral + ações */}
      <Card className="border-primary/20">
        <CardContent className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Valor Total da Requisição
            </p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalGeral)}</p>
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              disabled={salvarMutation.isPending}
              onClick={() => salvarMutation.mutate(false)}
            >
              {salvarMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar Rascunho
            </Button>
            <Button
              disabled={salvarMutation.isPending}
              onClick={() => salvarMutation.mutate(true)}
            >
              {salvarMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enviar para Análise
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={onBack} disabled={salvarMutation.isPending}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      {conflitoPendente && (
        <Dialog open onOpenChange={() => setConflitoPendente(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Conflito de Saldo Detectado</DialogTitle>
              <DialogDescription>
                Os itens abaixo possuem saldo bloqueado por requisições da sua unidade já enviadas
                e pendentes de aprovação. A requisição será salva como rascunho para que você
                possa resolver o conflito antes de tentar o envio novamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm max-h-60 overflow-y-auto">
              {conflitoPendente.conflitos.map((c) => (
                <div key={c.identFornecimento} className="rounded-md border p-3 space-y-1">
                  <p className="font-medium">{c.descricaoItem}</p>
                  <p className="text-muted-foreground text-xs">
                    Fornecimento: {c.identFornecimento}
                  </p>
                  <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                    <div>
                      <span className="text-muted-foreground">Saldo disponível</span>
                      <br />
                      {formatQtd(c.saldoDisponivel)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Comprometido</span>
                      <br />
                      {formatQtd(c.qtdComprometida)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Solicitado aqui</span>
                      <br />
                      {formatQtd(c.qtdSolicitadaAtual)}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Requisições concorrentes: {c.requisicoesConcorrentes.join(', ')}
                  </p>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConflitoPendente(null)}
                disabled={confirmarCienciaMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  const INICIO = '[ANOTAÇÃO AUTOMÁTICA DO SISTEMA - INÍCIO]'
                  const FIM = '[ANOTAÇÃO AUTOMÁTICA DO SISTEMA - FIM]'
                  const dataHora = new Date().toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const detalhes = conflitoPendente.conflitos
                    .map(
                      (c) =>
                        `"${c.descricaoItem}" (fornecimento: ${c.identFornecimento}) — saldo disponível: ${c.saldoDisponivel}, comprometido por outras requisições enviadas: ${c.qtdComprometida}, solicitado nesta requisição: ${c.qtdSolicitadaAtual} (requisições concorrentes: ${c.requisicoesConcorrentes.join(', ')})`,
                    )
                    .join('; ')
                  const conteudo = `Em ${dataHora}, o sistema detectou conflito de saldo ao tentar enviar esta requisição. Os seguintes fornecimentos possuem saldo insuficiente em razão de outras requisições enviadas pendentes de aprovação: ${detalhes}. A requisição foi mantida como rascunho para que o conflito seja resolvido antes de nova tentativa de envio.`
                  const bloco = `${INICIO}\n${conteudo}\n${FIM}`
                  const atual = (requisicao.observacoes ?? '').trim()
                  const idxI = atual.indexOf(INICIO)
                  const idxF = atual.indexOf(FIM)
                  let novas: string
                  if (idxI !== -1 && idxF !== -1) {
                    const antes = atual.slice(0, idxI).trimEnd()
                    const depois = atual.slice(idxF + FIM.length).trimStart()
                    novas = [antes, bloco, depois].filter(Boolean).join('\n')
                  } else {
                    novas = atual ? `${atual}\n${bloco}` : bloco
                  }
                  confirmarCienciaMutation.mutate(novas)
                }}
                disabled={confirmarCienciaMutation.isPending}
              >
                Entendi, salvar como rascunho
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
