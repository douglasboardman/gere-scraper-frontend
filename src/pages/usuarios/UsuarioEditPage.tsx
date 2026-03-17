import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, KeyRound } from 'lucide-react'
import { usuariosApi } from '@/api/usuarios.api'
import { unidadesApi } from '@/api/unidades.api'
import { uorgsApi } from '@/api/uorgs.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useState } from 'react'
import type { UserRole } from '@/types'

const editUsuarioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['admin', 'gestor_compras', 'requerente'] as const),
  unidade: z.string().optional(),
  uorg_key: z.string().optional(),
})

type EditUsuarioFormData = z.infer<typeof editUsuarioSchema>

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  gestor_compras: 'Gestor de Compras',
  requerente: 'Requerente',
}

export function UsuarioEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const { data: usuario, isLoading } = useQuery({
    queryKey: ['usuario', id],
    queryFn: () => usuariosApi.obter(id!),
    enabled: !!id,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadesApi.listar,
  })

  const form = useForm<EditUsuarioFormData>({
    resolver: zodResolver(editUsuarioSchema),
    values: usuario
      ? {
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          unidade: typeof usuario.unidade === 'string'
            ? usuario.unidade
            : usuario.unidade?._id ?? '',
          uorg_key: usuario.uorg_key ?? '',
        }
      : undefined,
  })

  const selectedRole = form.watch('role')
  const selectedUnidade = form.watch('unidade')

  const { data: uorgs = [], isLoading: uorgsLoading } = useQuery({
    queryKey: ['uorgs-unidade', selectedUnidade],
    queryFn: () => uorgsApi.listarPorUnidade(selectedUnidade!),
    enabled: !!selectedUnidade,
  })

  const updateMutation = useMutation({
    mutationFn: (data: EditUsuarioFormData) => usuariosApi.atualizar(id!, data),
    onSuccess: () => {
      toast.success('Usuário atualizado com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      queryClient.invalidateQueries({ queryKey: ['usuario', id] })
      navigate('/usuarios')
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ??
        (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.error ??
        'Erro ao atualizar usuário.'
      toast.error(msg)
    },
  })

  const resetSenhaMutation = useMutation({
    mutationFn: () => usuariosApi.resetSenha(id!),
    onSuccess: (data) => {
      toast.success(data.message)
      setResetDialogOpen(false)
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao enviar e-mail de redefinição de senha.'
      toast.error(msg)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!usuario) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Usuário não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/usuarios')}>
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Editar Usuário"
        subtitle={usuario.nome}
        actions={
          <Button variant="outline" onClick={() => navigate('/usuarios')}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <div className="max-w-2xl">
        <div className="rounded-lg border bg-card p-6 space-y-6">
          {/* Status info */}
          <div className="flex items-center gap-3">
            <Badge variant={usuario.ativo ? 'success' : 'secondary'}>
              {usuario.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
            <Badge variant="outline">
              {roleLabels[usuario.role]}
            </Badge>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="requerente">Requerente</SelectItem>
                        <SelectItem value="gestor_compras">Gestor de Compras</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedRole !== 'admin' && (
                <>
                  <FormField
                    control={form.control}
                    name="unidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade</FormLabel>
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
                              <SelectItem key={u._id} value={u._id}>
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
                        <FormLabel>UORG</FormLabel>
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
                                      ? 'Carregando...'
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
                </>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetDialogOpen(true)}
                >
                  <KeyRound className="h-4 w-4" />
                  Resetar Senha
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/usuarios')}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* Dialog de confirmação de reset de senha */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
            <DialogDescription>
              Um e-mail será enviado para <strong>{usuario.email}</strong> com um link para
              redefinição de senha. O link expira em 1 hora.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => resetSenhaMutation.mutate()}
              disabled={resetSenhaMutation.isPending}
            >
              {resetSenhaMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar E-mail'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
