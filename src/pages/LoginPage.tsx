import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, LogIn } from 'lucide-react'
import { authApi } from '@/api/auth.api'
import { fetchVersion } from '@/api/version.api'
import { useAuthStore } from '@/store/auth.store'
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

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
})

type LoginFormData = z.infer<typeof loginSchema>


export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    fetchVersion()
      .then(setVersion)
      .catch(() => setVersion(null))
  }, [])

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '' },
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authApi.login(data.email, data.senha)
      login(response.token, response.usuario)
      toast.success(`Bem-vindo, ${response.usuario.nome}!`)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ??
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message ??
        'Credenciais inválidas. Tente novamente.'
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

        {/* Footer */}
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

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex flex-col items-center lg:hidden mb-6">
            <img src="/logo.svg" alt="GERE" width="80" height="80" />
            <h1 className="text-2xl font-bold mt-3" style={{ color: '#2a593a' }}>
              GERE
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Gerenciador de Requisições em Contratações Públicas
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Entrar</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Informe suas credenciais para acessar o sistema
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

              <FormField
                control={form.control}
                name="senha"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Senha</FormLabel>
                      <Link
                        to="/esqueci-senha"
                        className="text-xs font-medium underline"
                        style={{ color: '#2a593a' }}
                        tabIndex={-1}
                      >
                        Esqueci minha senha
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
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
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Entrar
                  </>
                )}
              </Button>
            </form>
          </Form>

          <p className="text-sm text-center text-muted-foreground">
            Ainda não tem acesso?{' '}
            <Link to="/registro" className="font-medium underline" style={{ color: '#2a593a' }}>
              Solicitar cadastro
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
