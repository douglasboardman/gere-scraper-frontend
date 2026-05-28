export function parseIdentContratacao(ident: string): { uasg: string; codMod: string; numContratacao: string; ano: string } | null {
  const match = ident.match(/^CON-(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return null
  return { uasg: match[1], codMod: match[2], numContratacao: match[3], ano: match[4] }
}

export function displayNumEdital(ident: string): string {
  const parsed = parseIdentContratacao(ident)
  return parsed ? `${parsed.numContratacao}/${parsed.ano}` : ident
}

export function displayContratacaoFull(ident: string): string {
  const parsed = parseIdentContratacao(ident)
  return parsed ? `Contratação: ${parsed.numContratacao}/${parsed.ano} | UASG Gestora: ${parsed.uasg}` : ident
}

export function extractAnoContratacao(ident: string): string {
  const parsed = parseIdentContratacao(ident)
  return parsed ? parsed.ano : ''
}

export function extractCnpj(identFornecedor: string): string {
  return identFornecedor.startsWith('FOR-') ? identFornecedor.slice(4) : identFornecedor
}

export function buildDetailUrl(basePath: string, id: string): string {
  return `${basePath}?id=${encodeURIComponent(id)}`
}
