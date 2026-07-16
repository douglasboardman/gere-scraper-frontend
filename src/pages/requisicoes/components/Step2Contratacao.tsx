import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Loader2, Search } from 'lucide-react'
import { requisicoesApi } from '@/api/requisicoes.api'
import { fornecimentosApi } from '@/api/fornecimentos.api'
import { contratacoesApi } from '@/api/contratacoes.api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { destDespesaLabel } from '@/lib/utils'
import { MODALIDADE_LABEL } from '@/types'
import type { IContratacao, IRequisicao } from '@/types'
import { fmtDate, extrairIdContratacao, type Step1Data } from '../utils/requisicaoUtils'

interface Step2ContratacaoProps {
  userUasg: string
  tipoRequisicao: 'Material' | 'Servico' | 'Outras_Obrigacoes'
  step1Data: Step1Data
  existingRequisicao: IRequisicao | null
  onComplete: (req: IRequisicao, contratacao: IContratacao) => void
  onBack: () => void
}

export function Step2Contratacao({
  userUasg,
  tipoRequisicao,
  step1Data,
  existingRequisicao,
  onComplete,
  onBack,
}: Step2ContratacaoProps) {
  const [search, setSearch] = useState('')
  const [selectingId, setSelectingId] = useState<string | null>(null)

  const selecionarMutation = useMutation({
    mutationFn: async (contratacao: IContratacao) => {
      if (existingRequisicao) {
        return requisicoesApi.atualizar(existingRequisicao.identificador, {
          identContratacao: contratacao.identificador,
        })
      }
      return requisicoesApi.criar({ ...step1Data, identContratacao: contratacao.identificador })
    },
    onSuccess: (req, contratacao) => {
      onComplete(req, contratacao)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao salvar a requisição.'
      toast.error(msg)
      setSelectingId(null)
    },
  })

  const { data: fornecimentos = [], isLoading: loadingForn } = useQuery({
    queryKey: ['fornecimentos-unidade', userUasg],
    queryFn: () => fornecimentosApi.listarPorUnidade(userUasg),
    enabled: !!userUasg,
  })

  const fornecimentosDestDespesa = fornecimentos.filter(
    (f) => f.destDespesa === tipoRequisicao,
  )

  const uniqueContratacaoIds = Array.from(
    new Set(
      fornecimentosDestDespesa
        .map((f) => extrairIdContratacao(f.identificador))
        .filter((id): id is string => id !== null),
    ),
  )

  const { data: contratacoes = [], isLoading: loadingContratacoes } = useQuery({
    queryKey: ['contratacoes-wizard', uniqueContratacaoIds],
    queryFn: async () => {
      if (uniqueContratacaoIds.length === 0) return []
      const results = await Promise.allSettled(
        uniqueContratacaoIds.map((id) => contratacoesApi.obter(id)),
      )
      return results
        .filter((r): r is PromiseFulfilledResult<IContratacao> => r.status === 'fulfilled')
        .map((r) => r.value)
    },
    enabled: uniqueContratacaoIds.length > 0,
  })

  const isLoading = loadingForn || loadingContratacoes

  const contratacoesFiltradas = contratacoes.filter(
    (c) => (c.statusParticipacao ?? c.ultimaImportacao?.status) === 'Disponivel',
  )

  const filtered = contratacoesFiltradas.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.objeto?.toLowerCase().includes(q) ||
      c.numEdital?.toLowerCase().includes(q) ||
      c.modContratacao?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Pesquisar por objeto, edital ou modalidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : fornecimentos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            Sua unidade (UASG {userUasg}) não possui fornecimentos registrados como participante.
          </CardContent>
        </Card>
      ) : fornecimentosDestDespesa.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            Sua unidade possui fornecimentos, mas nenhum com destinação de despesa{' '}
            <strong>{destDespesaLabel(tipoRequisicao)}</strong>.
          </CardContent>
        </Card>
      ) : contratacoes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            {uniqueContratacaoIds.length} fornecimento(s) encontrado(s), mas não foi possível
            carregar as contratações associadas.
          </CardContent>
        </Card>
      ) : contratacoesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            Nenhuma contratação disponível com fornecimentos de{' '}
            <strong>{destDespesaLabel(tipoRequisicao)}</strong> para sua unidade.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            Nenhuma contratação corresponde à pesquisa.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((contratacao) => (
            <Card
              key={contratacao.identificador}
              className="hover:border-primary/50 transition-colors group cursor-default"
            >
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-primary">
                      {contratacao.numEdital}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {MODALIDADE_LABEL[contratacao.modContratacao ?? ''] ??
                        contratacao.modContratacao}
                    </Badge>
                  </div>
                  <p className="text-sm leading-snug line-clamp-2">{contratacao.objeto}</p>
                  <div className="flex flex-wrap gap-x-4 mt-1.5 text-xs text-muted-foreground">
                    <span>
                      Vigência: {fmtDate(contratacao.iniVigencia)} até{' '}
                      {fmtDate(contratacao.fimVigencia)}
                    </span>
                    <span>UASG: {contratacao.uasgUnGestora}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 opacity-75 group-hover:opacity-100 transition-opacity"
                  disabled={selecionarMutation.isPending}
                  onClick={() => {
                    setSelectingId(contratacao.identificador)
                    selecionarMutation.mutate(contratacao)
                  }}
                >
                  {selecionarMutation.isPending &&
                  selectingId === contratacao.identificador ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      Selecionar <ArrowRight className="ml-1 h-3 w-3" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-start pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    </div>
  )
}
