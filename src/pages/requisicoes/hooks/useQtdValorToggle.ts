import { useState } from 'react'
import type { IFornecimento, IItem } from '@/types'
import {
  valUnitario,
  floatToMaskDigits,
  formatCurrencyMask,
  type SelectedItemEntry,
} from '../utils/requisicaoUtils'

function calcularQtd(valor: number, vUnit: number): number {
  return vUnit > 0 ? Math.round((valor / vUnit) * 100000) / 100000 : 0
}

// ── Single-item toggle (EditItemDialog) ─────────────────────────────────────

interface UseQtdValorToggleOptions {
  valorUnitario: number
  saldoDisponivel: number | null
  qtdInicial?: number
}

export function useQtdValorToggle({
  valorUnitario: vUnit,
  saldoDisponivel,
  qtdInicial = 1,
}: UseQtdValorToggleOptions) {
  const [modo, setModo] = useState<'qtd' | 'valor'>('qtd')
  const [qtdStr, setQtdStr] = useState(qtdInicial.toFixed(5))
  const [valorRawDigits, setValorRawDigits] = useState('0')

  const valorFloat = (parseInt(valorRawDigits, 10) || 0) / 100
  const qtdNum = modo === 'qtd' ? Number(qtdStr) : calcularQtd(valorFloat, vUnit)
  const valorTotal = modo === 'valor' ? valorFloat : vUnit * qtdNum
  const excedeSaldo = saldoDisponivel !== null && qtdNum > saldoDisponivel

  function alternarModo(novoModo: 'qtd' | 'valor') {
    setModo(novoModo)
    if (novoModo === 'valor') setValorRawDigits('0')
  }

  function handleCurrencyKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const key = e.key
    if (!/[0-9]/.test(key) && key !== 'Backspace') return
    setValorRawDigits(key === 'Backspace' ? valorRawDigits.slice(0, -1) : valorRawDigits + key)
  }

  function setValorDireto(val: number) {
    setValorRawDigits(String(Math.round(val * 100)))
  }

  return {
    modo,
    qtdStr,
    setQtdStr,
    qtdNum,
    valorFloat,
    valorTotal,
    valorRawDigits,
    valorDisplay: formatCurrencyMask(valorRawDigits),
    excedeSaldo,
    alternarModo,
    handleCurrencyKeyDown,
    setValorDireto,
    mutationPayload: modo === 'valor'
      ? { valDesejado: valorFloat }
      : { qtdSolicitada: Number(qtdStr) },
  }
}

// ── Multi-item Map toggle (Step3Itens, AddItemsDialog) ──────────────────────

export function useQtdValorMap(initialItems?: Map<string, SelectedItemEntry>) {
  const [items, setItems] = useState<Map<string, SelectedItemEntry>>(initialItems ?? new Map())
  const [valorRawDigits, setValorRawDigits] = useState<Map<string, string>>(new Map())

  function addItem(f: IFornecimento, item: IItem) {
    setItems((prev) => {
      if (prev.has(f.identificador)) return prev
      const next = new Map(prev)
      next.set(f.identificador, {
        fornecimento: f,
        item,
        quantidade: 1,
        modo: 'qtd',
        valDigitado: valUnitario(f),
      })
      return next
    })
  }

  function removeItem(idForn: string) {
    setItems((prev) => {
      const next = new Map(prev)
      next.delete(idForn)
      return next
    })
  }

  function handleQtd(idForn: string, qtd: number, maxQtd?: number) {
    setItems((prev) => {
      const entry = prev.get(idForn)
      if (!entry || qtd <= 0) return prev
      const next = new Map(prev)
      next.set(idForn, { ...entry, quantidade: maxQtd != null ? Math.min(qtd, maxQtd) : qtd })
      return next
    })
  }

  function handleValor(idForn: string, val: number) {
    setItems((prev) => {
      const entry = prev.get(idForn)
      if (!entry) return prev
      const vUnit = valUnitario(entry.fornecimento)
      const next = new Map(prev)
      next.set(idForn, { ...entry, valDigitado: val, quantidade: calcularQtd(val, vUnit) })
      return next
    })
  }

  function handleModo(idForn: string, novoModo: 'qtd' | 'valor') {
    if (novoModo === 'valor') {
      setValorRawDigits((d) => {
        const nd = new Map(d)
        nd.set(idForn, '0')
        return nd
      })
      setItems((prev) => {
        const e = prev.get(idForn)
        if (!e) return prev
        const next = new Map(prev)
        next.set(idForn, { ...e, modo: novoModo, valDigitado: 0 })
        return next
      })
    } else {
      setItems((prev) => {
        const e = prev.get(idForn)
        if (!e) return prev
        const next = new Map(prev)
        next.set(idForn, { ...e, modo: novoModo })
        return next
      })
    }
  }

  function handleCurrencyKeyDown(idForn: string, e: React.KeyboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const key = e.key
    if (!/[0-9]/.test(key) && key !== 'Backspace') return
    const entry = items.get(idForn)
    const current = valorRawDigits.get(idForn) ?? (entry ? floatToMaskDigits(entry.valDigitado) : '0')
    const digits = key === 'Backspace' ? current.slice(0, -1) : current + key
    setValorRawDigits((prev) => {
      const nd = new Map(prev)
      nd.set(idForn, digits)
      return nd
    })
    handleValor(idForn, (parseInt(digits, 10) || 0) / 100)
  }

  function getValorDisplay(idForn: string): string {
    const entry = items.get(idForn)
    return formatCurrencyMask(valorRawDigits.get(idForn) ?? (entry ? floatToMaskDigits(entry.valDigitado) : '0'))
  }

  function reset() {
    setItems(new Map())
    setValorRawDigits(new Map())
  }

  const totalValue = Array.from(items.values()).reduce(
    (sum, e) => sum + (e.modo === 'valor' ? e.valDigitado : valUnitario(e.fornecimento) * e.quantidade),
    0,
  )

  return {
    items,
    setItems,
    addItem,
    removeItem,
    handleQtd,
    handleValor,
    handleModo,
    handleCurrencyKeyDown,
    getValorDisplay,
    reset,
    totalValue,
  }
}
