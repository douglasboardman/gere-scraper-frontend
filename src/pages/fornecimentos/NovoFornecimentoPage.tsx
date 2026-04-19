import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { fornecimentosApi } from '@/api/fornecimentos.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const schema = z.object({
  identItem: z.string().min(1, 'Identificador do item é obrigatório'),
  identContrato: z.string().optional(),
  qtdAutorizada: z.coerce.number().positive('Quantidade deve ser positiva'),
  valUnitHomologado: z.coerce.number().positive('Valor unitário deve ser positivo'),
})

type FormData = z.infer<typeof schema>

export function NovoFornecimentoPage() {
  const navigate = useNavigate()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      identItem: '',
      identContrato: '',
      qtdAutorizada: 0,
      valUnitHomologado: 0,
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      fornecimentosApi.criar({
        identItem: data.identItem,
        identContrato: data.identContrato || undefined,
        qtdAutorizada: data.qtdAutorizada,
        valUnitHomologado: data.valUnitHomologado,
      }),
    onSuccess: (fornecimento) => {
      toast.success('Fornecimento criado com sucesso.')
      navigate(`/fornecimentos/${fornecimento.identificador}`)
    },
    onError: (error: unknown) => {
      const d = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data
      toast.error(d?.message ?? d?.error ?? 'Erro ao criar fornecimento.')
    },
  })

  const onSubmit = (data: FormData) => createMutation.mutate(data)

  return (
    <div>
      <PageHeader
        title="Novo Fornecimento"
        subtitle="Registrar fornecimento manualmente para um item de contratação"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="identItem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identificador do Item *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 15842620252019001001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="identContrato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identificador do Contrato</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional — vincula ao contrato" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="qtdAutorizada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade Autorizada *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" min={0.001} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valUnitHomologado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Unitário Homologado (R$) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0.01} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <p className="text-xs text-muted-foreground pt-1">
                O fornecedor será inferido automaticamente a partir do contrato ou ata vinculados ao item.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Salvando...' : 'Criar Fornecimento'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
