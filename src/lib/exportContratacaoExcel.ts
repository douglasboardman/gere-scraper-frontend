import * as XLSX from 'xlsx'
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

export function exportContratacaoExcel(
  contratacao: IContratacao,
  atas: IAtaRegPrecos[],
  contratos: IContrato[],
  itens: IItem[],
  fornecimentos: IFornecimento[],
): void {
  const wb = XLSX.utils.book_new()

  // ── Aba 1: Contratação ────────────────────────────────────────────
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
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
    ]),
    'Contratação',
  )

  // ── Aba 2: Atas ───────────────────────────────────────────────────
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Nº Ata', 'Fornecedor', 'CNPJ Fornecedor', 'Vigência Início', 'Vigência Fim', 'Status'],
      ...atas.map((a) => [
        a.numAta,
        a.nomeFornecedor ?? a.cnpjFornecedor ?? a.identFornecedor ?? '—',
        a.cnpjFornecedor ?? '—',
        fmtDate(a.iniVigencia),
        fmtDate(a.fimVigencia),
        a.status,
      ]),
    ]),
    'Atas',
  )

  // ── Aba 3: Contratos ──────────────────────────────────────────────
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
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
    ]),
    'Contratos',
  )

  // ── Aba 4: Itens ──────────────────────────────────────────────────
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
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
    ]),
    'Itens',
  )

  // ── Aba 5: Fornecimentos ──────────────────────────────────────────
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
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
    ]),
    'Fornecimentos',
  )

  XLSX.writeFile(wb, `contratacao-${contratacao.numContratacao}-${contratacao.anoContratacao}.xlsx`)
}
