const dataBrasilia = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' })

// Datas de vigência representam dias civis. O último dia é inclusivo em Brasília.
export function vigenciaEncerrada(fim?: string | null, agora = new Date()): boolean {
  if (!fim) return false
  const hoje = dataBrasilia.format(agora)
  return fim.slice(0, 10) < hoje
}

export function formatarDataVigencia(data?: string | null): string {
  return data ? data.slice(0, 10).split('-').reverse().join('/') : '—'
}
