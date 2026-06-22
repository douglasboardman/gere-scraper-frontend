import ExcelJS from 'exceljs'
import type { IContratacao, IAtaRegPrecos, IContrato, IItem, IFornecimento } from '@/types'
import { MODALIDADE_LABEL } from '@/types'
import { formatCNPJ } from '@/lib/utils'

function fmtDate(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function fmtCur(v?: number | null): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtQty(v?: number | null): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(v)
}

function addSheet(wb: ExcelJS.Workbook, name: string, rows: unknown[][]): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(name)
  for (const row of rows) ws.addRow(row)
  return ws
}

export async function exportContratacaoExcel(
  contratacao: IContratacao,
  atas: IAtaRegPrecos[],
  contratos: IContrato[],
  itens: IItem[],
  fornecimentos: IFornecimento[],
): Promise<void> {
  const wb = new ExcelJS.Workbook()

  // ── Aba 1: Contratação ────────────────────────────────────────────
  addSheet(wb, 'Contratação', [
    ['Campo', 'Valor'],
    ['Nº Contratação', contratacao.numContratacao],
    ['Ano', String(contratacao.anoContratacao)],
    ['UASG Gestora', contratacao.uasgUnGestora],
    ['Nome UN Gestora', contratacao.nomeUnGestora ?? '—'],
    ['Modalidade', MODALIDADE_LABEL[contratacao.modContratacao ?? ''] ?? contratacao.modContratacao ?? '—'],
    ['Nº Edital', contratacao.numEdital ?? '—'],
    ['Vigência Início', fmtDate(contratacao.iniVigencia)],
    ['Vigência Fim', fmtDate(contratacao.fimVigencia)],
    ['Status', contratacao.statusParticipacao ?? (contratacao.ultimaImportacao as { status?: string } | null)?.status ?? '—'],
    ['Objeto', contratacao.objeto ?? '—'],
  ])

  // ── Aba 2: Atas ───────────────────────────────────────────────────
  addSheet(wb, 'Atas', [
    ['Nº Ata', 'Fornecedor', 'CNPJ Fornecedor', 'Vigência Início', 'Vigência Fim', 'Status'],
    ...atas.map((a) => [
      a.numAta,
      a.nomeFornecedor ?? a.cnpjFornecedor ?? a.identFornecedor ?? '—',
      a.cnpjFornecedor ?? '—',
      fmtDate(a.iniVigencia),
      fmtDate(a.fimVigencia),
      a.status,
    ]),
  ])

  // ── Aba 3: Contratos ──────────────────────────────────────────────
  addSheet(wb, 'Contratos', [
    ['Nº Contrato', 'UASG Contratante', 'Fornecedor', 'Valor Global', 'Vigência Início', 'Vigência Fim', 'Status'],
    ...contratos.map((c) => [
      c.numContrato,
      c.uasgContratante,
      c.fornecedor?.razaoSocial ?? c.fornecedor?.nome ?? c.identFornecedor,
      fmtCur(c.valGlobal),
      fmtDate(c.iniVigencia),
      fmtDate(c.fimVigencia),
      c.status,
    ]),
  ])

  // ── Aba 4: Itens ──────────────────────────────────────────────────
  addSheet(wb, 'Itens', [
    ['Seq.', 'Descrição Breve', 'Descrição Detalhada', 'Qtd. Homologada', 'Valor Unitário', 'Un. Medida', 'Tipo', 'Status'],
    ...itens.map((i) => [
      i.sequencialItemPregao ?? '—',
      i.descBreve ?? i.descricaoBreve ?? '—',
      i.descDetalhada ?? i.descricaoDetalhada ?? '—',
      fmtQty(i.qtdHomologada),
      fmtCur(i.valUnitario ?? i.valorUnitario),
      i.unMedida ?? i.unidadeMedida ?? '—',
      i.tipo ?? '—',
      i.status,
    ]),
  ])

  // ── Aba 5: Fornecimentos ──────────────────────────────────────────
  addSheet(wb, 'Fornecimentos', [
    ['Fornecedor', 'CNPJ', 'Item', 'Descrição Detalhada', 'Qtd. Autorizada', 'Qtd. Utilizada', 'Saldo Disponível', 'Valor Unitário', 'Status'],
    ...fornecimentos.map((f) => {
      const item = typeof f.identItem !== 'string' ? f.identItem : null
      const itemDesc = item?.descBreve ?? item?.descricaoBreve ?? item?.numItem ?? (typeof f.identItem === 'string' ? f.identItem : '—')
      const itemDescDetalhada = item?.descDetalhada ?? item?.descricaoDetalhada ?? '—'
      return [
        f.nomeFornecedor ?? f.identFornecedor,
        f.cnpjFornecedor ? formatCNPJ(f.cnpjFornecedor) : '—',
        itemDesc,
        itemDescDetalhada,
        fmtQty(f.qtdAutorizada),
        fmtQty(f.qtdUtilizada),
        fmtQty(f.saldoDisponivel ?? f.saldo),
        fmtCur(f.valorUnitario ?? f.valUnitHomologado),
        f.status,
      ]
    }),
  ])

  // ── Download ──────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `contratacao-${contratacao.numContratacao}-${contratacao.anoContratacao}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
