import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, User, Building2, Network } from 'lucide-react'
import { usuariosApi } from '@/api/usuarios.api'
import { unidadesApi } from '@/api/unidades.api'
import { uorgsApi } from '@/api/uorgs.api'
import type { IUnidade } from '@/types'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const perfilSchema = z
  .object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional().or(z.literal('')),
    senhaAtual: z.string().optional().or(z.literal('')),
    novaSenha: z
      .string()
      .min(6, 'Nova senha deve ter pelo menos 6 caracteres')
      .optional()
      .or(z.literal('')),
    confirmarSenha: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.novaSenha && data.novaSenha !== data.confirmarSenha) return false
      return true
    },
    {
      message: 'As senhas não conferem',
      path: ['confirmarSenha'],
    }
  )

type PerfilFormData = z.infer<typeof perfilSchema>

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  gestor_compras: 'Gestor de Compras',
  requerente: 'Requerente',
}

export function PerfilPage() {
  const { user, setUser } = useAuthStore()
  const [saved, setSaved] = useState(false)

  const unidadeId = user?.unidade
    ? typeof user.unidade === 'string' ? user.unidade : (user.unidade as IUnidade)._id
    : null

  const { data: unidade } = useQuery({
    queryKey: ['unidade', unidadeId],
    queryFn: () => unidadesApi.obter(unidadeId!),
    enabled: !!unidadeId && typeof user?.unidade === 'string',
  })

  const { data: uorg } = useQuery({
    queryKey: ['uorg', user?.uorg_key],
    queryFn: () => uorgsApi.obter(user!.uorg_key!),
    enabled: !!user?.uorg_key,
  })

  const unidadeResolvida = typeof user?.unidade === 'object' ? user.unidade as IUnidade : unidade

  const form = useForm<PerfilFormData>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nome: user?.nome ?? '',
      senhaAtual: '',
      novaSenha: '',
      confirmarSenha: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: PerfilFormData) => {
      const payload: { nome?: string; senhaAtual?: string; novaSenha?: string } = {}
      if (data.nome) payload.nome = data.nome
      if (data.senhaAtual && data.novaSenha) {
        payload.senhaAtual = data.senhaAtual
        payload.novaSenha = data.novaSenha
      }
      return usuariosApi.atualizarPerfil(payload)
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      toast.success('Perfil atualizado com sucesso.')
      setSaved(true)
      form.reset({
        nome: updatedUser.nome,
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: '',
      })
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao atualizar perfil.'
      toast.error(msg)
    },
  })

  return (
    <div className="max-w-2xl">
      <PageHeader title="Meu Perfil" subtitle="Gerencie suas informações pessoais e senha" />

      {/* Profile summary */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: '#2a593a' }}
            >
              {user?.nome?.charAt(0).toUpperCase() ?? <User />}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{user?.nome}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="mt-1">
                {roleLabels[user?.role ?? 'requerente']}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lotação */}
      {(unidadeResolvida || uorg) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Lotação</CardTitle>
            <CardDescription>Dados de lotação do servidor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {unidadeResolvida && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Unidade</p>
                  <p className="text-sm text-muted-foreground">
                    {unidadeResolvida.nomeAbrev ?? unidadeResolvida.nome}
                  </p>
                  {unidadeResolvida.nomeAbrev && unidadeResolvida.nome && (
                    <p className="text-xs text-muted-foreground">{unidadeResolvida.nome}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    UASG {unidadeResolvida.uasg}
                    {unidadeResolvida.localidade && ` — ${unidadeResolvida.localidade}`}
                  </p>
                </div>
              </div>
            )}
            {uorg && (
              <div className="flex items-start gap-3">
                <Network className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">UORG</p>
                  <p className="text-sm text-muted-foreground">
                    {uorg.uorg_sg ? `${uorg.uorg_sg} — ${uorg.uorg_no}` : uorg.uorg_no}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editar Informações</CardTitle>
          <CardDescription>
            Atualize seu nome ou altere sua senha de acesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="space-y-5"
            >
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-4">Alterar Senha</h4>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="senhaAtual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha Atual</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Digite sua senha atual"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="novaSenha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
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
                        <FormLabel>Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Repita a nova senha"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : saved ? (
                    'Salvo!'
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                >
                  Descartar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
