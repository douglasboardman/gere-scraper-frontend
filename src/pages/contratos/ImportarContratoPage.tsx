import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { contratosApi } from '@/api/contratos.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { IContratacao, IContratoExterno, IItemContratoExterno } from '@/types'
import { MODALIDADE_LABEL } from '@/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

const fmtDate = (iso?: string | null) => {
  if (!iso) return '–'
  return iso.split('T')[0].split('-').reverse().join('/')
}

// ─── types ────────────────────────────────────────────────────────────────────

interface ItensEntry extends IItemContratoExterno {
  qtdUtilizada: number
}

const STEPS = [
  { num: 1, label: 'Contratação' },
  { num: 2, label: 'Dados do Contrato' },
  { num: 3, label: 'Itens' },
]

// ─── StepIndicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, idx) => (
        <div key={s.num} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                current === s.num
                  ? 'bg-primary text-primary-foreground border-primary'
                  : current > s.num
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : 'bg-muted text-muted-foreground border-muted-foreground/30'
              }`}
            >
              {current > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
            </div>
            <span className={`text-xs whitespace-nowrap ${current === s.num ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`h-0.5 w-16 mx-2 mb-4 transition-colors ${current > s.num + 0 ? 'bg-primary/40' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

function Step1SelecionarContratacao({
  onComplete,
}: {
  onComplete: (contratacao: IContratacao) => void
}) {
  const { data: lista, isLoading, isError } = useQuery({
    queryKey: ['contratos', 'importaveis'],
    queryFn: () => contratosApi.listarImportaveis(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando contratações disponíveis…
      </div>
    )
  }

  if (isError) {
    return <p className="text-destructive py-8">Erro ao carregar contratações. Tente novamente.</p>
  }

  if (!lista || lista.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">Nenhuma contratação disponível</p>
        <p className="text-sm mt-1">Sua unidade já possui contratos em todas as contratações importadas, ou ainda não há nenhuma importada.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Selecione a contratação à qual o contrato a ser importado pertence.
      </p>
      {lista.map((c) => (
        <Card
          key={c.identificador}
          className="cursor-pointer transition-colors hover:border-primary/60"
          onClick={() => onComplete(c)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-semibold">
                  {c.numEdital ?? `${c.numContratacao}/${c.anoContratacao}`}
                </CardTitle>
                {c.objeto && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.objeto}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.modContratacao && (
                  <Badge variant="secondary" className="text-xs">
                    {MODALIDADE_LABEL[c.modContratacao] ?? c.modContratacao}
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); onComplete(c) }}
                >
                  Selecionar <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>UASG Gestora: <strong>{c.uasgUnGestora}</strong>{c.nomeUnGestora && c.nomeUnGestora !== 'PENDING' && c.nomeUnGestora !== c.uasgUnGestora ? ` — ${c.nomeUnGestora}` : ''}</span>
              {c.iniVigencia && <span>Vigência: {fmtDate(c.iniVigencia)}{c.fimVigencia ? ` até ${fmtDate(c.fimVigencia)}` : ''}</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

function formatNumContrato(significantDigits: string): string {
  const padded = ('000000000' + significantDigits).slice(-9)
  return `${padded.slice(0, 5)}/${padded.slice(5)}`
}

function maskCnpj(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

const step2Schema = z.object({
  numContratoFormatado: z
    .string()
    .regex(/^\d{5}\/\d{4}$/, 'Informe o número no formato 00000/0000 (9 dígitos)'),
  cnpjFornecedor: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 14, 'CNPJ deve ter 14 dígitos'),
})
type Step2Form = z.infer<typeof step2Schema>

function Step2DadosContrato({
  contratacao,
  onComplete,
  onBack,
}: {
  contratacao: IContratacao
  onComplete: (contrato: IContratoExterno) => void
  onBack: () => void
}) {
  const [selectedContrato, setSelectedContrato] = useState<IContratoExterno | null>(null)
  const [resultados, setResultados] = useState<IContratoExterno[] | null>(null)
  const [numContratoDigits, setNumContratoDigits] = useState('')

  const handleNumContratoKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    onChange: (v: string) => void,
  ) => {
    if (/^\d$/.test(e.key) && numContratoDigits.length < 9) {
      e.preventDefault()
      const next = numContratoDigits + e.key
      setNumContratoDigits(next)
      onChange(formatNumContrato(next))
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      const next = numContratoDigits.slice(0, -1)
      setNumContratoDigits(next)
      onChange(next.length ? formatNumContrato(next) : '')
    } else if (!['Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
    }
  }

  const form = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: { numContratoFormatado: '', cnpjFornecedor: '' },
  })

  const consultaMutation = useMutation({
    mutationFn: (values: Step2Form) => {
      const [numContrato, anoStr] = values.numContratoFormatado.split('/')
      return contratosApi.consultaExterna({
        identContratacao: contratacao.identificador,
        numContrato: `${numContrato}/${anoStr}`,
        anoContrato: parseInt(anoStr, 10),
        cnpjFornecedor: values.cnpjFornecedor,
      })
    },
    onSuccess: (data) => {
      setResultados(data)
      setSelectedContrato(null)
      if (data.length === 0) toast.warning('Nenhum contrato encontrado com os dados informados.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Erro ao consultar dados do contrato.')
    },
  })

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Informe os dados do contrato derivado de <strong>{contratacao.numContratacao}/{contratacao.anoContratacao}</strong> e clique em <em>Importar Dados do Contrato</em> para consultar as informações oficiais.
      </p>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => consultaMutation.mutate(values))}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <FormField
            control={form.control}
            name="numContratoFormatado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número Contrato</FormLabel>
                <FormControl>
                  <Input
                    placeholder="00000/0000"
                    inputMode="numeric"
                    value={field.value}
                    onChange={() => {}}
                    onKeyDown={(e) => handleNumContratoKeyDown(e, field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cnpjFornecedor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ do Fornecedor</FormLabel>
                <FormControl>
                  <Input
                    placeholder="00.000.000/0000-00"
                    inputMode="numeric"
                    value={field.value}
                    onChange={(e) => field.onChange(maskCnpj(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="sm:col-span-3">
            <Button type="submit" variant="outline" disabled={consultaMutation.isPending}>
              {consultaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar Dados do Contrato
            </Button>
          </div>
        </form>
      </Form>

      {resultados !== null && resultados.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">{resultados.length} contrato(s) encontrado(s):</p>
          {resultados.map((c) => (
            <Card
              key={c.idCompra + c.numeroContrato}
              className={`cursor-pointer transition-colors hover:border-primary/60 ${selectedContrato?.idCompra === c.idCompra && selectedContrato?.numeroContrato === c.numeroContrato ? 'border-primary ring-1 ring-primary' : ''}`}
              onClick={() => setSelectedContrato(c)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold">{c.numeroContrato}</CardTitle>
                    {c.objeto && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.objeto}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant={selectedContrato?.idCompra === c.idCompra && selectedContrato?.numeroContrato === c.numeroContrato ? 'default' : 'outline'}
                    onClick={(e) => { e.stopPropagation(); setSelectedContrato(c) }}
                  >
                    Selecionar <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  <span>Fornecedor: <strong>{c.nomeRazaoSocialFornecedor}</strong> ({c.niFornecedor})</span>
                  <span>Vigência: {fmtDate(c.dataVigenciaInicial)}{c.dataVigenciaFinal ? ` até ${fmtDate(c.dataVigenciaFinal)}` : ''}</span>
                  <span>Valor Global: <strong>{fmt(c.valorGlobal)}</strong></span>
                  {c.numeroParcelas && <span>Parcelas: {c.numeroParcelas}x {c.valorParcela ? fmt(c.valorParcela) : ''}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <Button disabled={!selectedContrato} onClick={() => selectedContrato && onComplete(selectedContrato)}>
          Avançar <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

function Step3Itens({
  contratacao,
  contratoExterno,
  onBack,
  onComplete,
}: {
  contratacao: IContratacao
  contratoExterno: IContratoExterno
  onBack: () => void
  onComplete: (itens: Map<string, ItensEntry>) => void
}) {
  const [itensState, setItensState] = useState<Map<string, ItensEntry>>(new Map())
  const [carregado, setCarregado] = useState(false)

  const carregarMutation = useMutation({
    mutationFn: () =>
      contratosApi.itensExternos({
        identContratacao: contratacao.identificador,
        numContrato: contratoExterno.numeroContrato,
        dataVigenciaInicial: contratoExterno.dataVigenciaInicial,
        idCompra: contratoExterno.idCompra,
        numControlePncpContrato: contratoExterno.numeroControlePncpContrato,
      }),
    onSuccess: (data) => {
      const map = new Map<string, ItensEntry>()
      for (const item of data) {
        map.set(item.numeroItem, { ...item, qtdUtilizada: item.quantidadeItem })
      }
      setItensState(map)
      setCarregado(true)
      if (data.length === 0) toast.warning('Nenhum item encontrado para este contrato.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Erro ao carregar itens do contrato.')
    },
  })

  const handleQtdUtilizada = (numeroItem: string, value: number) => {
    setItensState((prev) => {
      const entry = prev.get(numeroItem)
      if (!entry) return prev
      const clamped = Math.max(0, Math.min(entry.quantidadeItem, value))
      const next = new Map(prev)
      next.set(numeroItem, { ...entry, qtdUtilizada: isNaN(clamped) ? 0 : clamped })
      return next
    })
  }

  const itens = Array.from(itensState.values())

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Carregue os itens do contrato <strong>{contratoExterno.numeroContrato}</strong>. Ajuste a <em>Qtd. Utilizada</em> se necessário antes de importar.
      </p>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => carregarMutation.mutate()}
          disabled={carregarMutation.isPending}
        >
          {carregarMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Carregar Itens do Contrato
        </Button>

        {carregado && itens.length > 0 && (
          <Button
            onClick={() => onComplete(itensState)}
          >
            Importar Contrato <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>

      {carregado && itens.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Seq.</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Val. Unitário</TableHead>
                <TableHead className="text-right">Qtd. Autorizada</TableHead>
                <TableHead className="text-right w-36">Qtd. Utilizada</TableHead>
                <TableHead className="text-right">Saldo Disponível</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => {
                const saldo = item.quantidadeItem - item.qtdUtilizada
                return (
                  <TableRow key={item.numeroItem}>
                    <TableCell className="text-muted-foreground text-xs">{item.numeroItem}</TableCell>
                    <TableCell className="text-xs max-w-xs">
                      <span className="line-clamp-2">{item.descricaoIitem}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs">{fmt(item.valorUnitarioItem)}</TableCell>
                    <TableCell className="text-right text-xs">{item.quantidadeItem}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        max={item.quantidadeItem}
                        step={1}
                        value={item.qtdUtilizada}
                        onChange={(e) => handleQtdUtilizada(item.numeroItem, Number(e.target.value))}
                        className="h-7 w-24 text-xs text-right ml-auto"
                      />
                    </TableCell>
                    <TableCell className={`text-right text-xs font-medium ${saldo < 0 ? 'text-destructive' : ''}`}>
                      {saldo}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ImportarContratoPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedContratacao, setSelectedContratacao] = useState<IContratacao | null>(null)
  const [selectedContratoExterno, setSelectedContratoExterno] = useState<IContratoExterno | null>(null)

  const importarMutation = useMutation({
    mutationFn: (itensState: Map<string, ItensEntry>) => {
      if (!selectedContratacao || !selectedContratoExterno) throw new Error('Estado inválido')
      return contratosApi.importar({
        identContratacao: selectedContratacao.identificador,
        contratoExterno: selectedContratoExterno,
        itens: Array.from(itensState.values()).map((item) => ({
          numeroItem: item.numeroItem,
          quantidadeItem: item.quantidadeItem,
          qtdUtilizada: item.qtdUtilizada,
          valorUnitarioItem: item.valorUnitarioItem,
        })),
      })
    },
    onSuccess: (res) => {
      const aviso = res.itensIgnorados.length > 0
        ? ` (${res.itensIgnorados.length} item(s) ignorado(s) por não existirem localmente)`
        : ''
      toast.success(`Contrato importado com sucesso! ${res.fornecimentosCriados} fornecimento(s) criado(s).${aviso}`)
      navigate(`/contratos/${res.contrato.identificador}`)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Erro ao importar contrato.')
    },
  })

  return (
    <div className="container mx-auto max-w-4xl py-6 px-4">
      <PageHeader
        title="Importar Contrato"
        subtitle="Importe um contrato derivado de uma contratação já registrada no sistema."
      />

      <div className="mt-8">
        <StepIndicator current={step} />

        {step === 1 && (
          <Step1SelecionarContratacao
            onComplete={(contratacao) => {
              setSelectedContratacao(contratacao)
              setStep(2)
            }}
          />
        )}

        {step === 2 && selectedContratacao && (
          <Step2DadosContrato
            contratacao={selectedContratacao}
            onComplete={(contrato) => {
              setSelectedContratoExterno(contrato)
              setStep(3)
            }}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && selectedContratacao && selectedContratoExterno && (
          <Step3Itens
            contratacao={selectedContratacao}
            contratoExterno={selectedContratoExterno}
            onBack={() => setStep(2)}
            onComplete={(itensState) => importarMutation.mutate(itensState)}
          />
        )}

        {importarMutation.isPending && (
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex items-center gap-3 bg-card border rounded-xl px-8 py-6 shadow-lg">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm font-medium">Importando contrato…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
