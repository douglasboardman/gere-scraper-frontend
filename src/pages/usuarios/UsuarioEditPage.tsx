import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, KeyRound, Trash2 } from 'lucide-react'
import { usuariosApi } from '@/api/usuarios.api'
import { getApiErrorMessage } from '@/lib/api-error'
import { unidadesApi } from '@/api/unidades.api'
import { uorgsApi } from '@/api/uorgs.api'
import { qk } from '@/lib/query-keys'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { useState, useEffect } from 'react'
import type { UserRole, IUsuario } from '@/types'
import { usePermission } from '@/hooks/usePermission'

const editUsuarioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['admin', 'gestor_orgao', 'gestor_unidade', 'gestor_contratos', 'gestor_financeiro', 'gestor_contratacoes', 'requisitante'] as const),
  unidade: z.string().optional(),
  identUorg: z.string().optional(),
})

type EditUsuarioFormData = z.infer<typeof editUsuarioSchema>

const roleLabels: Record<UserRole, string> = {
  admin:               'Administrador',
  gestor_orgao:        'Gestor do Órgão',
  gestor_unidade:      'Gestor de Unidade',
  gestor_contratos:    'Gestor de Contratos',
  gestor_financeiro:   'Gestor Financeiro',
  gestor_contratacoes: 'Gestor de Contratações',
  requisitante:        'Requisitante',
}

export function UsuarioEditPage() {
  const { id } = useParams<{ id: string }>()
  const { isAdmin } = usePermission()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: usuario, isLoading } = useQuery({
    queryKey: qk.usuarios.detail(id!),
    queryFn: () => usuariosApi.obter(id!),
    enabled: !!id,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: qk.unidades.all,
    queryFn: unidadesApi.listar,
  })

  const form = useForm<EditUsuarioFormData>({
    resolver: zodResolver(editUsuarioSchema),
    values: usuario
      ? {
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          unidade: usuario.identUnidade ?? usuario.unidade?.identificador ?? '',
          identUorg: usuario.identUorg ?? '',
        }
      : undefined,
  })

  const selectedRole = form.watch('role')
  const selectedUnidade = form.watch('unidade')
  // Fallback para identUnidade direto enquanto o form ainda não sincronizou via values/useEffect
  const queryUnidade = selectedUnidade ?? usuario?.identUnidade ?? ''

  const { data: uorgs = [], isLoading: uorgsLoading } = useQuery({
    queryKey: qk.uorgs.byUnidade(queryUnidade),
    queryFn: () => uorgsApi.listarPorUnidade(queryUnidade),
    enabled: !!queryUnidade,
  })

  // Garante que identUorg seja aplicado após UORGs carregarem, caso o form.values
  // tenha sincronizado antes das opções estarem disponíveis no Select (race condition).
  useEffect(() => {
    if (!usuario?.identUorg || uorgsLoading || !uorgs.length) return
    if (!form.getValues('identUorg')) {
      form.setValue('identUorg', usuario.identUorg, { shouldDirty: false, shouldValidate: false })
    }
  }, [usuario?.identUorg, uorgsLoading, uorgs])

  const updateMutation = useMutation({
    mutationFn: (data: EditUsuarioFormData) =>
      isAdmin
        ? usuariosApi.atualizar(id!, data)
        : usuariosApi.gestorUnidadeAtualizar(id!, { identUorg: data.identUorg, role: data.role }),
    onSuccess: () => {
      toast.success('Usuário atualizado com sucesso.')
      queryClient.invalidateQueries({ queryKey: qk.usuarios.all })
      queryClient.invalidateQueries({ queryKey: qk.usuarios.detail(id!) })
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

  const deleteMutation = useMutation({
    mutationFn: () => usuariosApi.deletar(id!),
    onSuccess: () => {
      toast.success('Usuário excluído com sucesso.')
      navigate('/usuarios')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Erro ao excluir usuário.'))
      setDeleteDialogOpen(false)
    },
  })

  const resetSenhaMutation = useMutation({
    mutationFn: () => usuariosApi.resetSenha(id!),
    onSuccess: (data) => {
      toast.success(data.message)
      setResetDialogOpen(false)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Erro ao enviar e-mail de redefinição de senha.'))
    },
  })

  const toggleAtivoMutation = useMutation({
    mutationFn: () => usuariosApi.toggleAtivo(id!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: qk.usuarios.detail(id!) })
      const previous = queryClient.getQueryData<IUsuario>(qk.usuarios.detail(id!))
      queryClient.setQueryData<IUsuario>(qk.usuarios.detail(id!), (old) =>
        old ? { ...old, ativo: !old.ativo } : old
      )
      const toastId = toast.loading('Processando...')
      return { previous, toastId }
    },
    onSuccess: (updated, _vars, context) => {
      toast.success(`Usuário ${updated.ativo ? 'ativado' : 'desativado'} com sucesso.`, { id: context?.toastId })
      queryClient.invalidateQueries({ queryKey: qk.usuarios.detail(id!) })
      queryClient.invalidateQueries({ queryKey: qk.usuarios.all })
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(qk.usuarios.detail(id!), context.previous)
      toast.error('Erro ao alterar status do usuário.', { id: context?.toastId })
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
          <div className="flex gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/usuarios')}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        }
      />

      <div className="max-w-2xl">
        <div className="rounded-lg border bg-card p-6 space-y-6">
          {/* Status info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={usuario.ativo}
                onCheckedChange={() => toggleAtivoMutation.mutate()}
                disabled={toggleAtivoMutation.isPending}
              />
              <span className="text-sm font-medium text-muted-foreground">
                {usuario.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
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
                        <SelectItem value="requisitante">Requisitante</SelectItem>
                        <SelectItem value="gestor_contratos">Gestor de Contratos</SelectItem>
                        <SelectItem value="gestor_financeiro">Gestor Financeiro</SelectItem>
                        <SelectItem value="gestor_contratacoes">Gestor de Contratações</SelectItem>
                        {isAdmin && <SelectItem value="gestor_unidade">Gestor de Unidade</SelectItem>}
                        {isAdmin && <SelectItem value="admin">Administrador</SelectItem>}
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
                            form.setValue('identUorg', '')
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
                    name="identUorg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UORG</FormLabel>
                        <Select
                          key={queryUnidade || 'empty'}
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!queryUnidade || uorgsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  !queryUnidade
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
                              <SelectItem key={uorg.identificador} value={uorg.identificador}>
                                {uorg.sigla ? `${uorg.sigla} - ` : ''}{uorg.nome}
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

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Usuário</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. O usuário <strong>{usuario?.nome}</strong> será permanentemente excluído do sistema. Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
