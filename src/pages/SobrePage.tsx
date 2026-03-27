import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, ExternalLink } from 'lucide-react'
import { fetchVersion } from '@/api/version.api'

export function SobrePage() {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    fetchVersion()
      .then(setVersion)
      .catch(() => setVersion(null))
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b px-6 py-4">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-4xl flex flex-col lg:flex-row items-start gap-16">

          {/* Logo side */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="Logo GERE"
              width="200"
              height="200"
            />
          </div>

          {/* Text side */}
          <div className="flex-1 space-y-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tight" style={{ color: '#2a593a' }}>
                GERE
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                Gerenciador de Requisições em Contratações Públicas
              </p>
            </div>

            <div
              className="w-12 h-0.5 rounded"
              style={{ backgroundColor: '#82ab90' }}
            />

            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Sobre a aplicação
              </h2>
              <p className="text-foreground leading-relaxed">
                O GERE é um sistema integrado para gerenciamento de requisições em atas de registro
                de preços e contratações públicas. Ele automatiza a extração de dados do Portal
                Nacional de Contratações Públicas (PNCP), centraliza o controle de itens, fornecedores
                e fornecimentos, e simplifica o fluxo de aprovação de requisições internas.
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Desenvolvido para atender às demandas de gestão de compras públicas em conformidade
                com a Lei nº 14.133/2021, oferecendo rastreabilidade, controle de saldo e transparência
                em cada etapa do processo.
              </p>
            </div>

            {version && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium"
                style={{ borderColor: 'rgba(42,89,58,0.3)', color: '#2a593a', backgroundColor: 'rgba(42,89,58,0.05)' }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#2a593a' }} />
                Versão {version}
              </div>
            )}

            <div
              className="w-12 h-0.5 rounded"
              style={{ backgroundColor: '#82ab90' }}
            />

            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Desenvolvedor
              </h2>
              <p className="text-foreground font-medium">
                Douglas Ricardo Boardman dos Reis
              </p>
              <div className="space-y-1.5">
                <a
                  href="mailto:douglas.boardman@gmail.com"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  douglas.boardman@gmail.com
                </a>
                <a
                  href="https://github.com/douglasboardman"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  github.com/douglasboardman
                </a>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          {version ? `GERE v${version}` : 'GERE'} · Instituto Federal Farroupilha - Campus Uruguaiana
        </p>
      </footer>
    </div>
  )
}
