import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  preparacaoAtasApi as api,
  type PreviaPacote,
} from '@/api/preparacao-atas.api'
import { usePermission } from '@/hooks/usePermission'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage } from '@/lib/api-error'

export function PreparacaoAtasPage() {
  const { isGestorOrgao } = usePermission()
  const [params, setParams] = useSearchParams()
  const compra = params.get('compra') || ''
  const [busca, setBusca] = useState(compra)
  const [arquivo, setArquivo] = useState<File>()
  const [previa, setPrevia] = useState<PreviaPacote>()
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState('')
  const [confirmacao, setConfirmacao] = useState(false)
  const consulta = useQuery({
    queryKey: ['preparacao-atas', compra],
    queryFn: () => api.consultar(compra),
    enabled: isGestorOrgao && /^\d{17}$/.test(compra),
  })
  if (!isGestorOrgao) return <Navigate to="/atas" replace />
  async function executar(fn: () => Promise<void>) {
    setOcupado(true)
    setAviso('')
    try {
      await fn()
    } catch (e) {
      setAviso(getApiErrorMessage(e, 'Falha na operação.'))
    } finally {
      setOcupado(false)
    }
  }
  function selecionar(id: string) {
    setConfirmacao(false)
    setBusca(id)
    setParams({ compra: id })
  }
  return (
    <main className="space-y-6">
      <PageHeader
        title="Preparação de atas"
        subtitle="Histórico das emissões e importação de pacotes do preparador."
      />
      <section className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Importar pacote de preparação</h2>
        <label className="block">
          Arquivo ZIP
          <Input
            type="file"
            accept=".zip"
            disabled={ocupado}
            onChange={(e) => {
              setArquivo(e.target.files?.[0])
              setPrevia(undefined)
              setAviso('')
            }}
          />
        </label>
        <Button
          disabled={!arquivo || ocupado}
          onClick={() =>
            executar(async () => {
              setPrevia(undefined)
              const p = await api.pacote(arquivo!)
              setPrevia(p)
              selecionar(p.idCompra)
            })
          }
        >
          Validar pacote
        </Button>
        {previa && (
          <div className="space-y-2">
            <p>
              {previa.atas} ata(s), {previa.itens} item(ns),{' '}
              {previa.participantes} unidade(s) participante(s).
            </p>
            <details>
              <summary>Conferir itens do pacote</summary>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>CNPJ</th>
                    <th>Quantidade</th>
                    <th>Valor unitário</th>
                  </tr>
                </thead>
                <tbody>
                  {previa.detalhes.map((i) => (
                    <tr key={i.item}>
                      <td>{i.item}</td>
                      <td>{i.cnpj}</td>
                      <td>{i.quantidade}</td>
                      <td>{i.unitario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
            {previa.repetido ? (
              <p>Pacote já importado.</p>
            ) : (
              <Button
                disabled={ocupado}
                onClick={() =>
                  executar(async () => {
                    await api.pacote(arquivo!, previa.hash)
                    setPrevia(undefined)
                    setAviso('Importação confirmada.')
                    await consulta.refetch()
                  })
                }
              >
                Confirmar importação
              </Button>
            )}
          </div>
        )}
      </section>
      <section className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Rodadas do pregão</h2>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            selecionar(busca)
            setAviso('')
          }}
        >
          <label>
            Identificador da compra
            <Input
              required
              pattern="[0-9]{17}"
              inputMode="numeric"
              maxLength={17}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
          <Button disabled={ocupado}>Consultar</Button>
        </form>
        {consulta.isFetching && <p>Consultando rodadas…</p>}
        {consulta.error && (
          <p role="alert">{getApiErrorMessage(consulta.error)}</p>
        )}
        {consulta.data && (
          <>
            {!consulta.data.conferido && (
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.checked)}
                  />
                  Conferi as atas anteriores deste pregão e importei os pacotes
                  já emitidos. Casos de identificação duvidosa foram resolvidos.
                </label>
                <Button
                  variant="outline"
                  disabled={!confirmacao || ocupado}
                  onClick={() =>
                    executar(async () => {
                      await api.conferir(compra)
                      await consulta.refetch()
                    })
                  }
                >
                  Registrar conferência
                </Button>
              </div>
            )}
            {!consulta.data.rodadas.length && (
              <p>Nenhuma rodada registrada para esta compra.</p>
            )}
            {consulta.data.rodadas.map((r, n) => (
              <article key={r.id} className="border-t pt-3 space-y-2">
                <h3 className="font-semibold">
                  Rodada {n + 1} ·{' '}
                  {new Date(r.criadaEm).toLocaleDateString('pt-BR')}
                </h3>
                <p className="text-sm">
                  {r.importadaEm
                    ? 'Importada'
                    : r.emitidaEm
                      ? 'Emitida'
                      : 'Reservada'}{' '}
                  · {r.id}
                </p>
                {r.atas.map((a) => (
                  <details key={a.chave}>
                    <summary>
                      {a.nome} · {a.cnpj} · {a.itens.length} item(ns)
                    </summary>
                    <p>
                      Vigência de {a.inicio} a {a.fim}. {a.conciliacao}.
                    </p>
                    <p>
                      Itens:{' '}
                      {a.itens
                        .map((i) => i.numero)
                        .sort((x, y) => Number(x) - Number(y))
                        .join(', ')}
                      .
                    </p>
                    {a.oficial && (
                      <Link
                        className="underline"
                        to={'/atas/detalhe?id=' + encodeURIComponent(a.oficial)}
                      >
                        Abrir ata oficial
                      </Link>
                    )}
                  </details>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={ocupado}
                    variant="outline"
                    onClick={() =>
                      executar(() => api.baixar(compra, r.id, 'zip'))
                    }
                  >
                    Baixar ZIP original
                  </Button>
                  {r.planilhaHash && (
                    <Button
                      disabled={ocupado}
                      variant="outline"
                      onClick={() =>
                        executar(() => api.baixar(compra, r.id, 'xlsx'))
                      }
                    >
                      Baixar XLSX original
                    </Button>
                  )}
                  {!r.emitidaEm && (
                    <Button
                      disabled={ocupado}
                      onClick={() =>
                        executar(async () => {
                          await api.recuperar(compra, r)
                          await consulta.refetch()
                        })
                      }
                    >
                      Concluir emissão dos originais reservados
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </>
        )}
      </section>
      {aviso && (
        <p role="status" className="rounded-md border p-3">
          {aviso}
        </p>
      )}
    </main>
  )
}
