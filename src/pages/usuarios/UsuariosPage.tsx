import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Loader2, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'
import { usuariosApi } from '@/api/usuarios.api'
import { unidadesApi } from '@/api/unidades.api'
import { uorgsApi } from '@/api/uorgs.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import type { IUsuario, UserRole } from '@/types'
import { usePermission } from '@/hooks/usePermission'
import type { BadgeProps } from '@/components/ui/badge'

type BadgeVariant = BadgeProps['variant']

const novoUsuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['admin', 'gestor_unidade', 'gestor_contratos', 'gestor_financeiro', 'gestor_contratacoes', 'requisitante'] as const),
  unidade: z.string().optional(),
  uorg_key: z.string().optional(),
})

type NovoUsuarioFormData = z.infer<typeof novoUsuarioSchema>

const roleLabels: Record<UserRole, string> = {
  admin:               'Administrador',
  gestor_unidade:      'Gestor de Unidade',
  gestor_contratos:    'Gestor de Contratos',
  gestor_financeiro:   'Gestor Financeiro',
  gestor_contratacoes: 'Gestor de Contratações',
  requisitante:        'Requisitante',
}

const roleBadgeVariants: Record<UserRole, BadgeVariant> = {
  admin:               'default',
  gestor_unidade:      'success',
  gestor_contratos:    'info',
  gestor_financeiro:   'purple',
  gestor_contratacoes: 'warning',
  requisitante:        'secondary',
}

export function UsuariosPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { isAdmin } = usePermission()

  const { data: usuariosRaw = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuariosApi.listar,
  })

  // gestor_unidade não pode ver nem editar usuários admin
  const usuarios = isAdmin ? usuariosRaw : usuariosRaw.filter((u) => u.role !== 'admin')

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadesApi.listar,
  })

  const form = useForm<NovoUsuarioFormData>({
    resolver: zodResolver(novoUsuarioSchema),
    defaultValues: {
      nome: '',
      email: '',
      senha: '',
      role: 'requisitante',
      unidade: '',
      uorg_key: '',
    },
  })

  const selectedRole = form.watch('role')
  const selectedUnidade = form.watch('unidade')

  const { data: uorgs = [], isLoading: uorgsLoading } = useQuery({
    queryKey: ['uorgs-unidade', selectedUnidade],
    queryFn: () => uorgsApi.listarPorUnidade(selectedUnidade!),
    enabled: !!selectedUnidade,
  })

  const criarMutation = useMutation({
    mutationFn: (data: NovoUsuarioFormData) => usuariosApi.criar(data),
    onSuccess: () => {
      toast.success('Usuário criado com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setDialogOpen(false)
      form.reset()
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao criar usuário.'
      toast.error(msg)
    },
  })

  const toggleAtivoMutation = useMutation({
    mutationFn: (id: string) => usuariosApi.toggleAtivo(id),
    onSuccess: (usuario) => {
      toast.success(`Usuário ${usuario.ativo ? 'ativado' : 'desativado'} com sucesso.`)
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
    onError: () => {
      toast.error('Erro ao alterar status do usuário.')
    },
  })

  const columns: ColumnDef<IUsuario, unknown>[] = [
    {
      accessorKey: 'nome',
      header: 'Nome',
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.nome}</span>
      ),
    },
    {
      accessorKey: 'email',
      header: 'E-mail',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Perfil',
      cell: ({ row }) => (
        <Badge variant={roleBadgeVariants[row.original.role] ?? 'secondary'}>
          {roleLabels[row.original.role] ?? row.original.role}
        </Badge>
      ),
    },
    {
      id: 'ativo',
      header: 'Ativo',
      cell: ({ row }) => (
        <Switch
          checked={row.original.ativo}
          onCheckedChange={() => toggleAtivoMutation.mutate(row.original.id)}
          disabled={toggleAtivoMutation.isPending}
        />
      ),
    },
    {
      id: 'acoes',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/usuarios/${row.original.id}`)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Gerenciamento de usuários do sistema"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={usuarios}
        isLoading={isLoading}
        searchPlaceholder="Buscar por nome ou e-mail..."
        emptyMessage="Nenhum usuário encontrado."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              O usuário será criado já ativo no sistema.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => criarMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
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
                    <FormLabel>E-mail *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@instituicao.gov.br" {...field} />
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
                    <FormLabel>Senha *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
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
                    <FormLabel>Perfil *</FormLabel>
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
                        <SelectItem value="gestor_unidade">Gestor de Unidade</SelectItem>
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
                        <FormLabel>UORG *</FormLabel>
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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={criarMutation.isPending}>
                  {criarMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Usuário'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
