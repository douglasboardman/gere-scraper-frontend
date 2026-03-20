import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Printer } from 'lucide-react'
import { requisicoesApi } from '@/api/requisicoes.api'
import { itemRequisicaoApi } from '@/api/itemRequisicao.api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency, formatCNPJ } from '@/lib/utils'
import type { IItemRequisicao, IFornecimento, IItem, IUsuario, IUnidade, IUorg } from '@/types'


function getItemData(item: IItemRequisicao): { seq: string; descDetalhada: string; tipo: string } {
  const f = item.idFornecimento as IFornecimento
  const i = (typeof f !== 'string' ? f?.idItem : null) as IItem | null
  return {
    seq: i?.sequencialItemPregao ?? '—',
    descDetalhada: i?.descDetalhada ?? i?.descBreve ?? (typeof f === 'string' ? f : f?.identificador) ?? '—',
    tipo: i?.tipo ?? '—',
  }
}

function getFornecedorName(item: IItemRequisicao): string {
  const f = item.idFornecimento as IFornecimento
  if (typeof f === 'string') return '—'
  return f?.nomeFornecedor ?? '—'
}

function getFornecedorCnpj(items: IItemRequisicao[]): string | null {
  const f = items[0]?.idFornecimento as IFornecimento
  if (!f || typeof f === 'string') return null
  return f.cnpjFornecedor ?? null
}

interface InfoCardProps {
  requisitante: IUsuario | null
  unidade: IUnidade | null
  uorg: IUorg | undefined
  tipo: string | undefined
  justificativa: string | undefined
  observacoes: string | undefined
  status: string
  idUnidade: unknown
  uorg_key: string | undefined
}

function InfoCard({ requisitante, unidade, uorg, tipo, justificativa, observacoes, status, idUnidade, uorg_key }: InfoCardProps) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-2 border rounded-md p-3 text-xs">
      <div>
        <p className="text-muted-foreground uppercase font-semibold mb-0.5">Requisitante</p>
        <p className="font-medium">{requisitante?.nome ?? '—'}</p>
      </div>
      <div>
        <p className="text-muted-foreground uppercase font-semibold mb-0.5">Unidade (UASG)</p>
        <p className="font-medium">
          {unidade ? `${unidade.uasg} — ${unidade.nomeAbrev ?? unidade.nome}` : (idUnidade as string)}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground uppercase font-semibold mb-0.5">Setor / UORG</p>
        <p className="font-medium">
          {uorg ? `${uorg.uorg_sg ? uorg.uorg_sg + ' — ' : ''}${uorg.uorg_no}` : (uorg_key ?? '—')}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground uppercase font-semibold mb-0.5">Tipo</p>
        <p className="font-medium">{tipo ?? '—'}</p>
      </div>
      <div className="col-span-2">
        <p className="text-muted-foreground uppercase font-semibold mb-0.5">Justificativa</p>
        <p className="whitespace-pre-wrap">{justificativa ?? '—'}</p>
      </div>
      {observacoes && (
        <div className="col-span-2">
          <p className="text-muted-foreground uppercase font-semibold mb-0.5">Observações</p>
          <p>{observacoes}</p>
        </div>
      )}
      <div className="col-span-2 flex items-center justify-between pt-1.5 border-t">
        <p className="text-muted-foreground uppercase font-semibold">Status</p>
        <p className="font-bold text-green-700">{status}</p>
      </div>
    </div>
  )
}

export function RequisicaoImprimirPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: requisicao, isLoading } = useQuery({
    queryKey: ['requisicao-imprimir', id],
    queryFn: () => requisicoesApi.imprimir(id!).then((r) => r.requisicao),
    enabled: !!id,
  })

  const { data: itens = [], isLoading: loadingItens } = useQuery({
    queryKey: ['itens-imprimir', id],
    queryFn: () => itemRequisicaoApi.listar(requisicao!.identificador),
    enabled: !!requisicao?.identificador,
  })

  const valorTotal = itens.reduce((sum, i) => sum + (i.valorTotal ?? 0), 0)

  const unidade = requisicao && typeof requisicao.idUnidade !== 'string'
    ? (requisicao.idUnidade as IUnidade)
    : null
  const uorg = requisicao?.uorg as IUorg | undefined
  const requisitante = requisicao && typeof requisicao.requisitante !== 'string'
    ? (requisicao.requisitante as IUsuario)
    : null

  const observacoes = requisicao?.observacoes ?? (requisicao as unknown as { observacao?: string })?.observacao

  const itensPorFornecedor = itens.reduce((acc, item) => {
    const nome = getFornecedorName(item)
    if (!acc[nome]) acc[nome] = []
    acc[nome].push(item)
    return acc
  }, {} as Record<string, IItemRequisicao[]>)

  const fornecedores = Object.entries(itensPorFornecedor)
  const multi = fornecedores.length > 1

  if (isLoading || loadingItens) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!requisicao) return <div className="p-8">Requisição não encontrada.</div>

  const infoCardProps: InfoCardProps = {
    requisitante,
    unidade,
    uorg,
    tipo: requisicao.tipo,
    justificativa: requisicao.justificativa,
    observacoes,
    status: requisicao.status,
    idUnidade: requisicao.idUnidade,
    uorg_key: requisicao.uorg_key,
  }

  return (
    <div>
      {/* Barra de ações — não imprime */}
      <div className="flex items-center gap-2 p-4 border-b print:hidden">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Conteúdo imprimível */}
      <div className="p-8 max-w-4xl mx-auto print:p-6 print:max-w-none text-sm print:text-xs">

        {/* Cabeçalho da requisição — aparece uma única vez no topo */}
        <div className="text-center border-b pb-4 mb-5">
          <h1 className="text-xl font-bold uppercase tracking-wide">Requisição de Empenho</h1>
          <p className="text-lg font-mono mt-1">{requisicao.identificador}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Criada em {format(new Date(requisicao.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            {requisicao.dataEnvio && (
              <> · Enviada em {format(new Date(requisicao.dataEnvio), 'dd/MM/yyyy', { locale: ptBR })}</>
            )}
          </p>
        </div>

        {/* Documentos por fornecedor */}
        {fornecedores.map(([fornecedor, itensForn], idx) => {
          const totalFornecedor = itensForn.reduce((s, i) => s + (i.valorTotal ?? 0), 0)
          const isLast = idx === fornecedores.length - 1
          const docLabel = `Documento ${String(idx + 1).padStart(2, '0')}`

          const cnpj = getFornecedorCnpj(itensForn)

          return (
            <div key={fornecedor} className={cn(idx > 0 && 'break-before-page')}>
              {/* Card de info da requisição — no primeiro doc segue o cabeçalho; nos demais abre a página */}
              <InfoCard {...infoCardProps} />

              {/* Label do documento + CNPJ e nome do fornecedor */}
              <div className="mt-4 mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{docLabel}</p>
                <p className="text-sm font-semibold mt-0.5">
                  {cnpj && <span className="text-muted-foreground font-normal mr-1">{formatCNPJ(cnpj)} —</span>}
                  {fornecedor}
                </p>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-14">Nº Pregão</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Descrição</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-16">Tipo</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground w-10">Qtd</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Valor Unit.</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {itensForn.map((item) => {
                      const { seq, descDetalhada, tipo } = getItemData(item)
                      return (
                        <tr key={item._id}>
                          <td className="px-3 py-2 font-mono text-center">{seq}</td>
                          <td className="px-3 py-2">{descDetalhada}</td>
                          <td className="px-3 py-2">{tipo}</td>
                          <td className="px-3 py-2 text-right">{item.quantidadeSolicitada}</td>
                          <td className="px-3 py-2 text-right">
                            {item.valorUnitario != null ? formatCurrency(item.valorUnitario) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {item.valorTotal != null ? formatCurrency(item.valorTotal) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/10">
                      <td colSpan={5} className="px-3 py-2 text-right font-semibold">
                        Total a ser empenhado para o fornecedor
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-green-700">
                        {formatCurrency(totalFornecedor)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Total geral + assinaturas — apenas no último documento, sem quebra de página */}
              {isLast && (
                <div className="mt-8">
                  <div className="flex items-center justify-between border-t pt-4">
                    <p className={cn('font-bold uppercase tracking-wide', multi ? 'text-sm' : 'text-base')}>
                      Impacto Financeiro Total
                    </p>
                    <p className={cn('font-bold text-green-700', multi ? 'text-base' : 'text-xl')}>
                      {formatCurrency(valorTotal)}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-8 pt-10 mt-10 border-t">
                    <div className="text-center">
                      <div className="border-b border-foreground mb-2 h-10" />
                      <p className="text-sm font-medium">{requisitante?.nome ?? 'Requisitante'}</p>
                      <p className="text-xs text-muted-foreground">Requisitante</p>
                    </div>
                    <div className="text-center">
                      <div className="border-b border-foreground mb-2 h-10" />
                      <p className="text-sm font-medium">Gestor de Compras</p>
                      <p className="text-xs text-muted-foreground">Aprovação</p>
                    </div>
                    <div className="text-center">
                      <div className="border-b border-foreground mb-2 h-10" />
                      <p className="text-sm font-medium">Ordenador de Despesas</p>
                      <p className="text-xs text-muted-foreground">Autorização</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

      </div>
    </div>
  )
}
