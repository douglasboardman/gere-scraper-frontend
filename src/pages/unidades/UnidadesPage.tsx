import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'
import { unidadesApi } from '@/api/unidades.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { formatCNPJ } from '@/lib/utils'
import { usePermission } from '@/hooks/usePermission'
import type { IUnidade } from '@/types'

const unidadeSchema = z.object({
  uasg: z.string().min(1, 'UASG é obrigatória'),
  codUorg: z.string().min(1, 'Código UORG é obrigatório'),
})

type UnidadeFormData = z.infer<typeof unidadeSchema>

export function UnidadesPage() {
  const { can } = usePermission()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadesApi.listar,
  })

  const form = useForm<UnidadeFormData>({
    resolver: zodResolver(unidadeSchema),
    defaultValues: {
      uasg: '',
      codUorg: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: UnidadeFormData) => unidadesApi.criar(data),
    onSuccess: () => {
      toast.success('Unidade cadastrada com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['unidades'] })
      setDialogOpen(false)
      form.reset()
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao cadastrar unidade.'
      toast.error(msg)
    },
  })

  const columns: ColumnDef<IUnidade, unknown>[] = [
    {
      accessorKey: 'uasg',
      header: 'UASG',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.original.uasg}</span>
      ),
    },
    {
      accessorKey: 'cnpj',
      header: 'CNPJ',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.cnpj ? formatCNPJ(row.original.cnpj) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'nome',
      header: 'Nome',
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.nome ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'nomeAbrev',
      header: 'Nome Abreviado',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.nomeAbrev ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'localidade',
      header: 'Localidade',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.localidade ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'codGestao',
      header: 'Cód. Gestão',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.codGestao ?? '—'}</span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Unidades"
        subtitle="Unidades gestoras e participantes cadastradas"
        actions={
          can('manage:unidades') ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Cadastrar Unidade
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={unidades}
        isLoading={isLoading}
        searchPlaceholder="Buscar por nome ou UASG..."
        emptyMessage="Nenhuma unidade encontrada."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Unidade</DialogTitle>
            <DialogDescription>
              Informe a UASG e o código UORG. Os demais dados serão coletados automaticamente dos portais de transparência.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="uasg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UASG *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 158140" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="codUorg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cód. UORG *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 643" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={mutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando dados...
                    </>
                  ) : (
                    'Cadastrar'
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
