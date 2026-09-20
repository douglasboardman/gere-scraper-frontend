import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const detalhe = isRouteErrorResponse(error)
    ? error.statusText || `Erro ${error.status}`
    : error instanceof Error
      ? error.message
      : 'Não foi possível carregar esta tela.'

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-lg rounded-lg border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">GERE</p>
        <h1 className="mt-2 text-2xl font-semibold">Não foi possível carregar esta tela</h1>
        <p className="mt-3 text-sm text-muted-foreground">O problema pode ser temporário. Tente recarregar ou volte ao painel.</p>
        <p className="mt-4 rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">{detalhe}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
          <a className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted" href="/dashboard">
            Ir para o painel
          </a>
        </div>
      </section>
    </main>
  )
}
