import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Mail, CheckCircle2 } from 'lucide-react'
import { authApi } from '@/api/auth.api'
import { fetchVersion } from '@/api/version.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const forgotSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

type ForgotFormData = z.infer<typeof forgotSchema>

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    fetchVersion()
      .then(setVersion)
      .catch(() => setVersion(null))
  }, [])

  const form = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: ForgotFormData) => {
    setIsLoading(true)
    setError(null)
    try {
      await authApi.forgotPassword(data.email)
      setSent(true)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao processar solicitação. Tente novamente.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col items-center justify-center w-2/5 p-12"
        style={{ backgroundColor: '#272626' }}
      >
        <div className="flex flex-col items-center text-center space-y-6 max-w-xs">
          <img src="/logo-branco.svg" alt="GERE" width="80" height="80" />

          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">GERE</h1>
            <p className="text-sm mt-2" style={{ color: '#82ab90' }}>
              Gerenciador de Requisições em
            </p>
            <p className="text-sm" style={{ color: '#82ab90' }}>
              Contratações Públicas
            </p>
          </div>

          <div
            className="w-16 h-px"
            style={{ backgroundColor: 'rgba(130, 171, 144, 0.4)' }}
          />

          <p className="text-xs text-gray-400 leading-relaxed">
            Sistema integrado para gerenciamento de requisições em atas de registro de preços e
            contratações públicas.
          </p>
        </div>

        <div className="mt-auto text-center space-y-1">
          <p className="text-xs text-gray-400 font-medium">
            GERE{version ? ` | Versão ${version}` : ''}
          </p>
          <Link
            to="/sobre"
            className="text-xs hover:underline transition-colors"
            style={{ color: '#82ab90' }}
          >
            Sobre esta Aplicação
          </Link>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="flex flex-col items-center lg:hidden mb-6">
            <img src="/logo.svg" alt="GERE" width="80" height="80" />
            <h1 className="text-2xl font-bold mt-3" style={{ color: '#2a593a' }}>
              GERE
            </h1>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 mx-auto" style={{ color: '#2a593a' }} />
              <h2 className="text-2xl font-bold text-foreground">E-mail enviado</h2>
              <p className="text-muted-foreground text-sm">
                Se o e-mail informado estiver cadastrado no sistema, você receberá um link
                para redefinição de senha. Verifique também a pasta de spam.
              </p>
              <p className="text-muted-foreground text-xs">
                O link expira em 1 hora.
              </p>
              <Link to="/login">
                <Button className="w-full mt-2" style={{ backgroundColor: '#2a593a' }}>
                  Voltar ao login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Esqueci minha senha</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Informe seu e-mail cadastrado e enviaremos um link para redefinição de senha
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            autoComplete="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    style={{ backgroundColor: '#2a593a' }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Enviar link de redefinição
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <p className="text-sm text-center text-muted-foreground">
                <Link to="/login" className="font-medium underline" style={{ color: '#2a593a' }}>
                  Voltar ao login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
