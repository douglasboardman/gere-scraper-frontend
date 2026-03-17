import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react'
import { authApi } from '@/api/auth.api'
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

const resetSchema = z
  .object({
    novaSenha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmarSenha: z.string().min(1, 'Confirme a senha'),
  })
  .refine((data) => data.novaSenha === data.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  })

type ResetFormData = z.infer<typeof resetSchema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      novaSenha: '',
      confirmarSenha: '',
    },
  })

  const onSubmit = async (data: ResetFormData) => {
    if (!token) return

    setIsLoading(true)
    setError(null)
    try {
      await authApi.resetPassword(token, data.novaSenha)
      setSuccess(true)
      toast.success('Senha redefinida com sucesso!')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao redefinir senha. O link pode ter expirado.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm text-center space-y-4">
          <h2 className="text-xl font-bold text-foreground">Link inválido</h2>
          <p className="text-muted-foreground text-sm">
            O link de redefinição de senha é inválido ou está incompleto.
          </p>
          <Button onClick={() => navigate('/login')} style={{ backgroundColor: '#2a593a' }}>
            Ir para o Login
          </Button>
        </div>
      </div>
    )
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

        <div className="mt-auto text-center">
          <p className="text-xs text-gray-500">
            Desenvolvido por Douglas Ricardo Boardman dos Reis
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            douglas.boardman@gmail.com
          </p>
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

          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 mx-auto" style={{ color: '#2a593a' }} />
              <h2 className="text-2xl font-bold text-foreground">Senha redefinida</h2>
              <p className="text-muted-foreground text-sm">
                Sua senha foi alterada com sucesso. Agora você pode fazer login com a nova senha.
              </p>
              <Button
                className="w-full"
                onClick={() => navigate('/login')}
                style={{ backgroundColor: '#2a593a' }}
              >
                Ir para o Login
              </Button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Redefinir Senha</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Informe sua nova senha abaixo
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="novaSenha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmarSenha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar nova senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Repita a senha"
                            autoComplete="new-password"
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
                        Redefinindo...
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        Redefinir Senha
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
