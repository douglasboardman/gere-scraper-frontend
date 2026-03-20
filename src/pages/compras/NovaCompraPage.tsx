import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { comprasApi } from '@/api/compras.api'
import { unidadesApi } from '@/api/unidades.api'
import type { ICompra } from '@/types'
import { useAuthStore } from '@/store/auth.store'
import { usePermission } from '@/hooks/usePermission'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const currentYear = new Date().getFullYear()

const modalidades = ['Pregão', 'Concorrência', 'Dispensa', 'Inexigibilidade'] as const

const novaCompraSchema = z.object({
  numCompra: z.string().min(1, 'Número da compra é obrigatório'),
  anoCompra: z.string().regex(/^\d{4}$/, 'Ano deve ter 4 dígitos'),
  uasgUnGestora: z.string().min(1, 'UASG da unidade gestora é obrigatória'),
  modalidade: z.enum(modalidades, {
    errorMap: () => ({ message: 'Selecione a modalidade' }),
  }),
  uasgParticipante: z.string().optional(),
})

type NovaCompraFormData = z.infer<typeof novaCompraSchema>

export function NovaCompraPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setActiveJobId } = useAuthStore()
  const { isAdmin } = usePermission()

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadesApi.listar,
    enabled: isAdmin,
  })

  const form = useForm<NovaCompraFormData>({
    resolver: zodResolver(novaCompraSchema),
    defaultValues: {
      numCompra: '',
      anoCompra: String(currentYear),
      uasgUnGestora: '',
      modalidade: undefined,
      uasgParticipante: undefined,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: NovaCompraFormData) =>
      comprasApi.criar({
        numCompra: data.numCompra,
        anoCompra: data.anoCompra,
        uasgUnGestora: data.uasgUnGestora,
        modalidade: data.modalidade,
        ...(isAdmin && data.uasgParticipante ? { uasgParticipante: data.uasgParticipante } : {}),
      }),
    onSuccess: (result) => {
      // setQueryData atualiza o cache diretamente, sem network round-trip nem respeito ao staleTime
      if (!result.reimport) {
        queryClient.setQueryData<ICompra[]>(['compras'], (old) => [result.compra, ...(old ?? [])])
      }
      setActiveJobId(result.jobId)

      const msg = result.reimport
        ? 'Compra já processada. Importando fornecimentos para sua unidade...'
        : 'Compra registrada! Acompanhe o progresso na barra inferior.'
      toast.success(msg, { duration: 6000 })
      navigate('/compras')
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao registrar compra.'
      toast.error(msg)
    },
  })

  const onSubmit = (data: NovaCompraFormData) => {
    if (isAdmin && !data.uasgParticipante) {
      form.setError('uasgParticipante', { message: 'Selecione a unidade participante' })
      return
    }
    mutation.mutate(data)
  }

  return (
    <div>
      <PageHeader
        title="Importar Compra"
        subtitle="Importe uma compra do portal ComprasGov para o sistema"
        actions={
          <Button variant="outline" onClick={() => navigate('/compras')}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Dados da Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numCompra"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero da Compra *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 90010" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="anoCompra"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ano da Compra *</FormLabel>
                      <FormControl>
                        <Input placeholder={String(currentYear)} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="uasgUnGestora"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UASG Unidade Gestora *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 158127" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="modalidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modalidade *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {modalidades.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isAdmin && (
                  <FormField
                    control={form.control}
                    name="uasgParticipante"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Unidade Participante *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a unidade participante..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {unidades.map((u) => (
                              <SelectItem key={u._id} value={u.uasg}>
                                {u.uasg} - {u.nomeAbrev || u.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    'Importar Compra'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/compras')}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
