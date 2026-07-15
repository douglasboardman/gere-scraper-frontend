import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Global error boundary — catches render-time errors anywhere in the tree
 * and shows a recoverable fallback instead of a blank white screen.
 * Must be a class component (React's error boundary API requires it).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-screen items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-destructive mb-2">
              Algo deu errado
            </h2>
            <p className="text-sm text-muted-foreground mb-6 font-mono">
              {this.state.error?.message ?? 'Erro de renderização desconhecido.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-sm underline text-primary hover:text-primary/80"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
