import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { requisicoesApi } from '@/api/requisicoes.api'
import { unidadesApi } from '@/api/unidades.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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

const novaRequisicaoSchema = z.object({
  idUnidade: z.string().min(1, 'Unidade é obrigatória'),
  observacao: z.string().optional(),
})

type NovaRequisicaoFormData = z.infer<typeof novaRequisicaoSchema>

export function NovaRequisicaoPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadesApi.listar,
  })

  const form = useForm<NovaRequisicaoFormData>({
    resolver: zodResolver(novaRequisicaoSchema),
    defaultValues: {
      idUnidade: '',
      observacao: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: NovaRequisicaoFormData) => requisicoesApi.criar(data),
    onSuccess: (req) => {
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      toast.success('Requisição criada com sucesso!')
      navigate(`/requisicoes/${req._id}`)
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao criar requisição.'
      toast.error(msg)
    },
  })

  return (
    <div>
      <PageHeader
        title="Nova Requisição"
        subtitle="Crie uma nova requisição de materiais ou serviços"
        actions={
          <Button variant="outline" onClick={() => navigate('/requisicoes')}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Dados da Requisição</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="idUnidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade Requisitante *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a unidade..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {unidades.map((u) => (
                          <SelectItem key={u._id} value={u._id}>
                            {u.nomeAbrev ?? u.nome ?? u.uasg}
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
                name="observacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações adicionais sobre a requisição..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Requisição'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/requisicoes')}
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
