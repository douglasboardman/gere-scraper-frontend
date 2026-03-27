import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { requisicoesApi } from '@/api/requisicoes.api'
import { itemRequisicaoApi } from '@/api/itemRequisicao.api'
import { fornecimentosApi } from '@/api/fornecimentos.api'
import { itensApi } from '@/api/itens.api'
import { contratacoesApi } from '@/api/contratacoes.api'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatCurrency, tipoRequisicaoLabel } from '@/lib/utils'
import type { IContratacao, IFornecimento, IItem, IRequisicao, IUnidade } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SelectedItemEntry = {
  fornecimento: IFornecimento
  item: IItem
  quantidade: number
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatCNPJ(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length !== 14) return digits
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function cnpjFromFornecedorId(identFornecedor: string): string {
  // identFornecedor format: "F44971159000129" → cnpj "44971159000129"
  const raw = identFornecedor.startsWith('F') ? identFornecedor.slice(1) : identFornecedor
  return formatCNPJ(raw)
}


function fmtDate(dateStr?: string): string {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return dateStr
  }
}

function valUnitario(f: IFornecimento): number {
  return f.valUnitHomologado ?? f.valorUnitario ?? 0
}

function saldoDisp(f: IFornecimento): number {
  return f.saldoDisponivel ?? f.saldo ?? 0
}

function descBreve(item: IItem): string {
  return item.descBreve ?? item.descricaoBreve ?? item.identificador ?? ''
}

function descDetalhada(item: IItem): string {
  return item.descDetalhada ?? item.descricaoDetalhada ?? 'Não informada.'
}

function unMedida(item: IItem): string {
  return item.unMedida ?? item.unidadeMedida ?? ''
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

const STEPS = [
  { num: 1, label: 'Dados' },
  { num: 2, label: 'Contratação' },
  { num: 3, label: 'Itens' },
  { num: 4, label: 'Revisão' },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8 select-none">
      {STEPS.map((s, i) => {
        const done = s.num < current
        const active = s.num === current
        return (
          <div key={s.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                  done && 'bg-primary border-primary text-primary-foreground',
                  active && 'border-primary text-primary bg-background',
                  !done && !active && 'border-muted-foreground/30 text-muted-foreground/40 bg-background',
                )}
              >
                {done ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span
                className={cn(
                  'text-xs mt-1 font-medium',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-16 mb-5 mx-1 transition-colors',
                  done ? 'bg-primary' : 'bg-muted',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Dados da Requisição
// ---------------------------------------------------------------------------

const step1Schema = z.object({
  tipo: z.enum(['Material', 'Servico'], { required_error: 'Selecione o tipo da requisição' }),
  justificativa: z.string().min(30, 'Justificativa deve ter pelo menos 30 caracteres'),
  observacoes: z.string().optional(),
})

type Step1Data = z.infer<typeof step1Schema>

function Step1Dados({
  initialData,
  onComplete,
}: {
  initialData?: Step1Data
  onComplete: (data: Step1Data) => void
}) {
  const [editing, setEditing] = useState(!initialData)

  const form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      tipo: initialData?.tipo ?? undefined,
      justificativa: initialData?.justificativa ?? '',
      observacoes: initialData?.observacoes ?? '',
    },
  })

  // ── Modo leitura (campos bloqueados) ─────────────────────────────────────
  if (!editing && initialData) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Dados da Requisição</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3 mr-1.5" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Tipo</p>
            <p className="text-sm font-medium">{tipoRequisicaoLabel(initialData.tipo)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Justificativa</p>
            <p className="text-sm whitespace-pre-wrap">{initialData.justificativa}</p>
          </div>
          {initialData.observacoes && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Observações</p>
              <p className="text-sm whitespace-pre-wrap">{initialData.observacoes}</p>
            </div>
          )}
          <div className="flex justify-end pt-1">
            <Button onClick={() => onComplete(initialData)}>
              Avançar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Modo edição / criação ─────────────────────────────────────────────────
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-base">Dados da Requisição</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) => { setEditing(false); onComplete(d) })}
            className="space-y-5"
          >
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Material">Material</SelectItem>
                      <SelectItem value="Servico">Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="justificativa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Justificativa *{' '}
                    <span className="text-muted-foreground font-normal text-xs">
                      (mín. 30 caracteres)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="Descreva a necessidade e justificativa da requisição..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Observações{' '}
                    <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Informações adicionais..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-1">
              {initialData && (
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                  Cancelar edição
                </Button>
              )}
              <Button type="submit" className="ml-auto">
                Avançar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Escolha da Contratação
// ---------------------------------------------------------------------------

/** Extrai o identificador da compra do identificador do fornecimento.
 *  Formato: U{uasg}I{itemSeq}C{compraId}  ex. U157363I00095C158127900102025
 *  O compra ID é tudo a partir do último 'C'.
 */
function extrairIdContratacao(identFornecimento: string): string | null {
  const idx = identFornecimento.indexOf('C')
  return idx !== -1 ? identFornecimento.slice(idx) : null
}

function Step2Contratacao({
  userUasg,
  tipoRequisicao,
  step1Data,
  existingRequisicao,
  onComplete,
  onBack,
}: {
  userUasg: string
  tipoRequisicao: 'Material' | 'Servico'
  step1Data: Step1Data
  existingRequisicao: IRequisicao | null
  onComplete: (req: IRequisicao, contratacao: IContratacao) => void
  onBack: () => void
}) {
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

  // 1) Busca os fornecimentos da unidade do usuário
  const { data: fornecimentos = [], isLoading: loadingForn } = useQuery({
    queryKey: ['fornecimentos-unidade', userUasg],
    queryFn: () => fornecimentosApi.listarPorUnidade(userUasg),
    enabled: !!userUasg,
  })

  // 2) Extrai compra IDs únicos dos identificadores dos fornecimentos
  const uniqueContratacaoIds = Array.from(
    new Set(
      fornecimentos
        .map((f) => extrairIdContratacao(f.identificador))
        .filter((id): id is string => id !== null),
    ),
  )

  // 3) Busca os detalhes de cada compra
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

  // 4) Busca itens de cada compra para filtrar pelo tipo da requisição
  const { data: itensPorContratacao = {}, isLoading: loadingItens } = useQuery({
    queryKey: ['itens-tipo-wizard', uniqueContratacaoIds, tipoRequisicao],
    queryFn: async () => {
      const results = await Promise.allSettled(
        uniqueContratacaoIds.map(async (id) => {
          const itens = await itensApi.listar({ identContratacao: id })
          return { id, itens }
        }),
      )
      const map: Record<string, IItem[]> = {}
      for (const r of results) {
        if (r.status === 'fulfilled') map[r.value.id] = r.value.itens
      }
      return map
    },
    enabled: uniqueContratacaoIds.length > 0,
  })

  const isLoading = loadingForn || loadingContratacoes || loadingItens

  // Filtra compras que possuem pelo menos um item do tipo da requisição
  const contratacoesFiltradas = contratacoes.filter((c) => {
    const itens = itensPorContratacao[c.identificador]
    if (!itens) return true // enquanto carrega, não oculta
    return itens.some((it) => (it.tipo ?? 'Material') === tipoRequisicao)
  })

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
      ) : contratacoes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            {uniqueContratacaoIds.length} fornecimento(s) encontrado(s), mas não foi possível carregar as contratações associadas.
          </CardContent>
        </Card>
      ) : contratacoesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            Nenhuma contratação com itens do tipo <strong>{tipoRequisicao}</strong> encontrada para sua unidade.
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
                    <span className="font-semibold text-sm text-primary">{contratacao.numEdital}</span>
                    <Badge variant="outline" className="text-xs">
                      {contratacao.modContratacao}
                    </Badge>
                  </div>
                  <p className="text-sm leading-snug line-clamp-2">{contratacao.objeto}</p>
                  <div className="flex flex-wrap gap-x-4 mt-1.5 text-xs text-muted-foreground">
                    <span>
                      Vigência: {fmtDate(contratacao.iniVigencia)} até {fmtDate(contratacao.fimVigencia)}
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
                  {selecionarMutation.isPending && selectingId === contratacao.identificador ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>Selecionar <ArrowRight className="ml-1 h-3 w-3" /></>
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

// ---------------------------------------------------------------------------
// Step 3 — Seleção de Itens
// ---------------------------------------------------------------------------

function Step3Itens({
  selectedCompra,
  userUasg,
  initialItems,
  onComplete,
  onBack,
}: {
  selectedCompra: IContratacao
  userUasg: string
  initialItems: Map<string, SelectedItemEntry>
  onComplete: (items: Map<string, SelectedItemEntry>) => void
  onBack: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItemEntry>>(initialItems)
  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogSearch, setCatalogSearch] = useState('')

  const { data: fornecimentos = [], isLoading: loadingForn } = useQuery({
    queryKey: ['fornecimentos-wizard', selectedCompra.identificador, userUasg],
    queryFn: () =>
      fornecimentosApi.listarPorContratacaoUnidade(selectedCompra.identificador, userUasg),
  })

  const { data: itens = [], isLoading: loadingItens } = useQuery({
    queryKey: ['itens-wizard', selectedCompra.identificador],
    queryFn: () => itensApi.listar({ identContratacao: selectedCompra.identificador }),
  })

  const itemMap = new Map<string, IItem>(itens.map((it) => [it.identificador, it]))
  const isLoading = loadingForn || loadingItens

  function resolveItem(f: IFornecimento): IItem | undefined {
    if (typeof f.identItem !== 'string') return f.identItem as IItem
    return itemMap.get(f.identItem)
  }

  const CATALOG_PAGE_SIZE = 10
  const filteredFornecimentos = catalogSearch.trim()
    ? fornecimentos.filter((f) => {
        const item = resolveItem(f)
        if (!item) return false
        const q = catalogSearch.toLowerCase()
        return (
          descBreve(item).toLowerCase().includes(q) ||
          descDetalhada(item).toLowerCase().includes(q)
        )
      })
    : fornecimentos
  const totalCatalogPages = Math.max(1, Math.ceil(filteredFornecimentos.length / CATALOG_PAGE_SIZE))
  const paginatedFornecimentos = filteredFornecimentos.slice(
    (catalogPage - 1) * CATALOG_PAGE_SIZE,
    catalogPage * CATALOG_PAGE_SIZE,
  )

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function handleAdd(f: IFornecimento) {
    const item = resolveItem(f)
    if (!item) return
    setSelectedItems((prev) => {
      if (prev.has(f.identificador)) return prev
      const next = new Map(prev)
      next.set(f.identificador, { fornecimento: f, item, quantidade: 1 })
      return next
    })
  }

  function handleRemove(idForn: string) {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      next.delete(idForn)
      return next
    })
  }

  function handleQtd(idForn: string, qtd: number) {
    setSelectedItems((prev) => {
      const entry = prev.get(idForn)
      if (!entry) return prev
      const maxSaldo = saldoDisp(entry.fornecimento)
      if (qtd <= 0) return prev
      const next = new Map(prev)
      next.set(idForn, { ...entry, quantidade: Math.min(qtd, maxSaldo) })
      return next
    })
  }

  const totalValue = Array.from(selectedItems.values()).reduce(
    (sum, e) => sum + valUnitario(e.fornecimento) * e.quantidade,
    0,
  )

  function handleNext() {
    if (selectedItems.size === 0) {
      toast.warning('Adicione pelo menos um item antes de prosseguir.')
      return
    }
    onComplete(selectedItems)
  }

  return (
    <div className="flex flex-col gap-4" style={{ minHeight: '520px' }}>
      {/* Compra info banner */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2 text-sm shrink-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="font-semibold text-primary">{selectedCompra.numEdital}</span>
        <span className="text-muted-foreground">—</span>
        <span className="line-clamp-1 text-muted-foreground">{selectedCompra.objeto}</span>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4 flex-1 overflow-hidden" style={{ height: '480px' }}>
          {/* LEFT — catalog */}
          <div className="col-span-3 flex flex-col border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/20 shrink-0 space-y-2">
              <p className="text-sm font-semibold">
                Itens disponíveis{' '}
                <span className="text-muted-foreground font-normal">
                  ({catalogSearch.trim() ? `${filteredFornecimentos.length} de ${fornecimentos.length}` : fornecimentos.length})
                </span>
              </p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-7 text-xs"
                  placeholder="Pesquisar por descrição..."
                  value={catalogSearch}
                  onChange={(e) => {
                    setCatalogSearch(e.target.value)
                    setCatalogPage(1)
                  }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y">
              {fornecimentos.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm text-center px-6">
                  Nenhum fornecimento encontrado para sua unidade nesta contratação.
                </div>
              ) : (
                paginatedFornecimentos.map((f) => {
                  const item = resolveItem(f)
                  const isExpanded = expandedId === f.identificador
                  const isAdded = selectedItems.has(f.identificador)
                  const vUnit = valUnitario(f)
                  const saldo = saldoDisp(f)
                  const isSaldoZero = saldo <= 0

                  return (
                    <div
                      key={f.identificador}
                      className={cn(
                        'transition-colors',
                        isAdded && !isSaldoZero && 'bg-primary/5',
                        isSaldoZero && 'bg-muted/40 opacity-60',
                      )}
                    >
                      {/* Item row */}
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug line-clamp-1">
                            {item ? descBreve(item) : f.identificador}
                          </p>
                          <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-muted-foreground">
                            <span>Saldo: {saldo} {item ? unMedida(item) : ''}</span>
                            <span className="text-foreground font-medium">
                              {formatCurrency(vUnit)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => toggleExpand(f.identificador)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                            {isExpanded ? 'Fechar' : 'Detalhes'}
                          </Button>
                          {!isSaldoZero && (
                            <Button
                              size="icon"
                              variant={isAdded ? 'secondary' : 'default'}
                              className="h-7 w-7"
                              title={isAdded ? 'Já adicionado' : 'Adicionar item'}
                              disabled={isAdded}
                              onClick={() => handleAdd(f)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Expand detail panel */}
                      {isExpanded && item && (
                        <div className="border-t bg-muted/20 px-4 py-3 space-y-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                              Descrição detalhada
                            </p>
                            <p className="leading-relaxed">{descDetalhada(item)}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Qtd Homologada</p>
                              <p className="font-medium">
                                {item.qtdHomologada ?? '—'} {unMedida(item)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Saldo Disponível</p>
                              <p className="font-medium">
                                {saldo} {unMedida(item)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Valor Unitário</p>
                              <p className="font-medium text-green-700">{formatCurrency(vUnit)}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">
                            Fornecimento: {f.identificador}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Pagination */}
            {totalCatalogPages > 1 && (
              <div className="border-t px-3 py-2 bg-muted/10 shrink-0 flex items-center justify-between">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                  disabled={catalogPage === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {catalogPage} / {totalCatalogPages}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                  disabled={catalogPage === totalCatalogPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* RIGHT — cart */}
          <div className="col-span-2 flex flex-col border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/20 shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Selecionados{' '}
                  <span className="text-muted-foreground font-normal">({selectedItems.size})</span>
                </p>
                <span className="text-sm font-bold text-green-700">
                  {formatCurrency(totalValue)}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y">
              {selectedItems.size === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm text-center px-4">
                  Nenhum item adicionado. Use o{' '}
                  <span className="mx-1 font-bold">(+)</span> para adicionar.
                </div>
              ) : (
                Array.from(selectedItems.entries()).map(([idForn, entry]) => {
                  const vUnit = valUnitario(entry.fornecimento)
                  const saldoMax = saldoDisp(entry.fornecimento)
                  return (
                    <div key={idForn} className="px-3 py-2.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium leading-snug line-clamp-2 flex-1">
                          {descBreve(entry.item)}
                        </p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => handleRemove(idForn)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Qtd:
                        </span>
                        <Input
                          type="number"
                          min={0}
                          max={saldoMax}
                          step={1}
                          value={entry.quantidade}
                          onChange={(e) => handleQtd(idForn, Number(e.target.value))}
                          className="h-7 w-20 text-xs"
                        />
                        <span className="text-xs text-muted-foreground flex-1 text-right">
                          {formatCurrency(vUnit * entry.quantidade)}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between shrink-0 pt-1">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={handleNext} disabled={selectedItems.size === 0 || isLoading}>
          Revisar Requisição
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — Revisão e Envio
// ---------------------------------------------------------------------------

function Step4Revisao({
  requisicao,
  selectedCompra,
  selectedItems,
  onBack,
}: {
  requisicao: IRequisicao
  selectedCompra: IContratacao
  selectedItems: Map<string, SelectedItemEntry>
  onBack: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  // Group items by fornecedor identifier
  const byFornecedor = new Map<string, SelectedItemEntry[]>()
  for (const entry of selectedItems.values()) {
    const key = entry.fornecimento.identFornecedor as string
    if (!byFornecedor.has(key)) byFornecedor.set(key, [])
    byFornecedor.get(key)!.push(entry)
  }
  const documents = Array.from(byFornecedor.entries())

  const totalGeral = Array.from(selectedItems.values()).reduce(
    (sum, e) => sum + valUnitario(e.fornecimento) * e.quantidade,
    0,
  )

  const userUnidade = typeof user?.unidade === 'object' ? (user.unidade as IUnidade) : null
  const unidadeNome = userUnidade?.nomeAbrev ?? userUnidade?.nome ?? '—'

  type ConflitosItem = {
    identFornecimento: string
    descricaoItem: string
    qtdSolicitadaAtual: number
    qtdComprometida: number
    saldoDisponivel: number
    requisicoesConcorrentes: string[]
  }
  const [conflitoPendente, setConflitoPendente] = useState<{ conflitos: ConflitosItem[] } | null>(null)

  const confirmarCienciaMutation = useMutation({
    mutationFn: (novasObservacoes: string) =>
      requisicoesApi.atualizar(requisicao.identificador, { observacoes: novasObservacoes }),
    onSuccess: () => {
      toast.info('Requisição mantida como rascunho. O conflito foi registrado nas observações.')
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
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
          quantidadeSolicitada: entry.quantidade,
        })
      }
      if (enviar) {
        await requisicoesApi.enviar(requisicao.identificador)
      }
    },
    onSuccess: (_, enviar) => {
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      toast.success(
        enviar ? 'Requisição enviada para análise.' : 'Requisição salva como rascunho.',
      )
      navigate(`/requisicoes/${requisicao.identificador}`)
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string; conflitos?: ConflitosItem[] } } }
      if (axiosErr.response?.status === 409 && axiosErr.response.data?.conflitos?.length) {
        setConflitoPendente({ conflitos: axiosErr.response.data.conflitos })
      } else {
        toast.error(
          axiosErr.response?.data?.error ?? 'Erro ao salvar a requisição. Verifique os itens e tente novamente.',
        )
      }
    },
  })

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* ── Cabeçalho do documento ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">
                Requisição de {tipoRequisicaoLabel(requisicao.tipo)}
              </p>
              <p className="font-mono text-xs text-muted-foreground">{requisicao.identificador}</p>
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
              <p className="text-xs text-muted-foreground font-mono">{user?.uorg_key ?? '—'}</p>
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
              {selectedCompra.numEdital} — {selectedCompra.modContratacao}
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

      {/* ── Documentos por fornecedor ── */}
      {documents.map(([identFornecedor, entries], docIdx) => {
        const cnpj = cnpjFromFornecedorId(identFornecedor)
        const nomeFornecedor = entries[0].fornecimento.nomeFornecedor ?? null
        const subTotal = entries.reduce(
          (s, e) => s + valUnitario(e.fornecimento) * e.quantidade,
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
                        <td className="py-2 px-2 text-right">{entry.quantidade}</td>
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

      {/* ── Total geral + botões de ação ── */}
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
                Os itens abaixo possuem saldo bloqueado por requisições da sua unidade já enviadas e pendentes de aprovação.
                A requisição será salva como rascunho para que você possa resolver o conflito antes de tentar o envio novamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm max-h-60 overflow-y-auto">
              {conflitoPendente.conflitos.map((c) => (
                <div key={c.identFornecimento} className="rounded-md border p-3 space-y-1">
                  <p className="font-medium">{c.descricaoItem}</p>
                  <p className="text-muted-foreground text-xs">Fornecimento: {c.identFornecimento}</p>
                  <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                    <div><span className="text-muted-foreground">Saldo disponível</span><br />{c.saldoDisponivel}</div>
                    <div><span className="text-muted-foreground">Comprometido</span><br />{c.qtdComprometida}</div>
                    <div><span className="text-muted-foreground">Solicitado aqui</span><br />{c.qtdSolicitadaAtual}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Requisições concorrentes: {c.requisicoesConcorrentes.join(', ')}
                  </p>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConflitoPendente(null)} disabled={confirmarCienciaMutation.isPending}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  const INICIO = '[ANOTAÇÃO AUTOMÁTICA DO SISTEMA - INÍCIO]'
                  const FIM = '[ANOTAÇÃO AUTOMÁTICA DO SISTEMA - FIM]'
                  const dataHora = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  const detalhes = conflitoPendente.conflitos.map((c) =>
                    `"${c.descricaoItem}" (fornecimento: ${c.identFornecimento}) — saldo disponível: ${c.saldoDisponivel}, comprometido por outras requisições enviadas: ${c.qtdComprometida}, solicitado nesta requisição: ${c.qtdSolicitadaAtual} (requisições concorrentes: ${c.requisicoesConcorrentes.join(', ')})`
                  ).join('; ')
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

// ---------------------------------------------------------------------------
// Main Page — orchestrates wizard state
// ---------------------------------------------------------------------------

export function NovaRequisicaoPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [requisicao, setRequisicao] = useState<IRequisicao | null>(null)
  const [selectedCompra, setSelectedCompra] = useState<IContratacao | null>(null)
  // selectedItems is lifted here so step 3 preserves selection when user goes back from step 4
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItemEntry>>(new Map())

  const userUasg =
    typeof user?.unidade === 'object' ? (user.unidade as IUnidade).uasg : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Requisição"
        subtitle="Siga os passos para criar uma requisição de material ou serviço."
        actions={
          <Button variant="outline" onClick={() => navigate('/requisicoes/minhas_requisicoes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        }
      />

      <StepIndicator current={step} />

      {step === 1 && (
        <Step1Dados
          initialData={step1Data ?? undefined}
          onComplete={(data) => {
            setStep1Data(data)
            setStep(2)
          }}
        />
      )}

      {step === 2 && userUasg && step1Data && (
        <Step2Contratacao
          userUasg={userUasg}
          tipoRequisicao={step1Data.tipo}
          step1Data={step1Data}
          existingRequisicao={requisicao}
          onComplete={(req, contratacao) => {
            setRequisicao(req)
            setSelectedCompra(contratacao)
            setStep(3)
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 2 && (!userUasg || !step1Data) && (
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Não foi possível determinar sua unidade. Tente fazer login novamente.
          </CardContent>
        </Card>
      )}

      {step === 3 && selectedCompra && userUasg && (
        <Step3Itens
          selectedCompra={selectedCompra}
          userUasg={userUasg}
          initialItems={selectedItems}
          onComplete={(items) => {
            setSelectedItems(items)
            setStep(4)
          }}
          onBack={() => setStep(2)}
        />
      )}

      {step === 3 && (!selectedCompra || !userUasg) && (
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Não foi possível determinar sua unidade. Tente fazer login novamente.
          </CardContent>
        </Card>
      )}

      {step === 4 && requisicao && selectedCompra && (
        <Step4Revisao
          requisicao={requisicao}
          selectedCompra={selectedCompra}
          selectedItems={selectedItems}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  )
}
