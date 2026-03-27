import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'
import { authApi } from '@/api/auth.api'
import { uorgsApi } from '@/api/uorgs.api'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const registerSchema = z
  .object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('E-mail inválido'),
    senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmarSenha: z.string().min(1, 'Confirme a senha'),
    unidade: z.string().min(1, 'Selecione a unidade'),
    uorg_key: z.string().min(1, 'Selecione a UORG de exercício'),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    fetchVersion()
      .then(setVersion)
      .catch(() => setVersion(null))
  }, [])

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: '',
      unidade: '',
      uorg_key: '',
    },
  })

  const selectedUnidade = form.watch('unidade')

  const { data: unidades = [] } = useQuery({
    queryKey: ['auth-unidades'],
    queryFn: authApi.listarUnidades,
  })

  const { data: uorgs = [], isLoading: uorgsLoading } = useQuery({
    queryKey: ['auth-uorgs', selectedUnidade],
    queryFn: () => uorgsApi.listarPorUnidade(selectedUnidade),
    enabled: !!selectedUnidade,
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError(null)
    try {
      const { confirmarSenha: _, ...registerData } = data
      await authApi.register(registerData)
      toast.success('Solicitação de cadastro enviada! Aguarde a aprovação do administrador.')
      navigate('/login')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao solicitar cadastro. Tente novamente.'
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

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md space-y-6">
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
            <h2 className="text-2xl font-bold text-foreground">Solicitar Cadastro</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Preencha seus dados para solicitar acesso ao sistema
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail institucional *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="seu@email.gov.br"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="senha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha *</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Min. 6 caracteres"
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
                      <FormLabel>Confirmar senha *</FormLabel>
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
              </div>

              <FormField
                control={form.control}
                name="unidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value)
                        form.setValue('uorg_key', '')
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a unidade..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {unidades.map((u) => (
                          <SelectItem key={u.identificador} value={u.identificador}>
                            {u.nomeAbrev ?? u.nome} ({u.uasg})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="uorg_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UORG de exercício *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedUnidade || uorgsLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedUnidade
                                ? 'Selecione uma unidade primeiro'
                                : uorgsLoading
                                  ? 'Carregando UORGs...'
                                  : 'Selecione a UORG...'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {uorgs.map((uorg) => (
                          <SelectItem key={uorg.uorg_key} value={uorg.uorg_key}>
                            {uorg.uorg_sg ? `${uorg.uorg_sg} - ` : ''}{uorg.uorg_no}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <UserPlus className="h-4 w-4" />
                    Solicitar Cadastro
                  </>
                )}
              </Button>
            </form>
          </Form>

          <p className="text-sm text-center text-muted-foreground">
            Já possui acesso?{' '}
            <Link to="/login" className="font-medium underline" style={{ color: '#2a593a' }}>
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
