import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { contratacoesApi } from '@/api/contratacoes.api'
import { unidadesApi } from '@/api/unidades.api'
import type { IContratacao, ModalidadeContratacao, AmparoLegal } from '@/types'
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

// value = enum Prisma (enviado à API), label = exibição para o usuário
const modalidades14133 = [
  { value: 'Pregao_Eletronico', label: 'Pregão Eletrônico' },
  { value: 'Pregao_Presencial', label: 'Pregão Presencial' },
  { value: 'Concorrencia_Eletronica', label: 'Concorrência Eletrônica' },
  { value: 'Concorrencia_Presencial', label: 'Concorrência Presencial' },
  { value: 'Dispensa', label: 'Dispensa' },
  { value: 'Inexigibilidade', label: 'Inexigibilidade' },
  { value: 'Chamada_Publica', label: 'Chamada Pública' },
] as const

// Modalidades válidas no SIASG para contratações sob a Lei 8.666/93
const modalidades8666 = [
  { value: 'Concorrencia', label: 'Concorrência' },
  { value: 'Pregao', label: 'Pregão' },
  { value: 'Dispensa', label: 'Dispensa' },
  { value: 'Inexigibilidade', label: 'Inexigibilidade' },
] as const

const allModalidadeValues = [
  ...modalidades14133.map(m => m.value),
  ...modalidades8666.map(m => m.value),
] as unknown as [string, ...string[]]

const novaCompraSchema = z.object({
  amparoLegal: z.enum(['LEI_14133_2021', 'LEI_8666_1993'], {
    errorMap: () => ({ message: 'Selecione o amparo legal' }),
  }),
  numContratacao: z.string().min(1, 'Número da contratação é obrigatório'),
  anoContratacao: z.string().regex(/^\d{4}$/, 'Ano deve ter 4 dígitos'),
  uasgUnGestora: z.string().min(1, 'UASG da unidade gestora é obrigatória'),
  modalidade: z.enum(allModalidadeValues, {
    errorMap: () => ({ message: 'Selecione a modalidade' }),
  }),
  uasgParticipante: z.string().optional(),
})

type NovaCompraFormData = z.infer<typeof novaCompraSchema>

export function NovaContratacaoPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setActiveJobId, setActiveJobFormData } = useAuthStore()
  const { isAdmin } = usePermission()

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadesApi.listar,
    enabled: isAdmin,
  })

  const form = useForm<NovaCompraFormData>({
    resolver: zodResolver(novaCompraSchema),
    defaultValues: {
      amparoLegal: 'LEI_14133_2021',
      numContratacao: '',
      anoContratacao: String(currentYear),
      uasgUnGestora: '',
      modalidade: undefined,
      uasgParticipante: undefined,
    },
  })

  const amparoLegalAtual = useWatch({ control: form.control, name: 'amparoLegal' })
  const modalidadesDisponiveis = amparoLegalAtual === 'LEI_8666_1993' ? modalidades8666 : modalidades14133

  const mutation = useMutation({
    mutationFn: (data: NovaCompraFormData) =>
      contratacoesApi.criar({
        amparoLegal: data.amparoLegal as AmparoLegal,
        numContratacao: data.numContratacao,
        anoContratacao: data.anoContratacao,
        uasgUnGestora: data.uasgUnGestora,
        modalidade: data.modalidade as ModalidadeContratacao,
        ...(isAdmin && data.uasgParticipante ? { uasgParticipante: data.uasgParticipante } : {}),
      }),
    onSuccess: (result, variables) => {
      // setQueryData atualiza o cache diretamente, sem network round-trip nem respeito ao staleTime
      if (!result.reimport) {
        queryClient.setQueryData<IContratacao[]>(['contratacoes'], (old) => [result.contratacao, ...(old ?? [])])
      }
      setActiveJobId(result.jobId)
      setActiveJobFormData({
        numContratacao: variables.numContratacao,
        anoContratacao: variables.anoContratacao,
        uasgUnGestora: variables.uasgUnGestora,
        modalidade: variables.modalidade,
        amparoLegal: variables.amparoLegal,
      })

      const msg = result.reimport
        ? 'Contratação já processada. Importando fornecimentos para sua unidade...'
        : 'Contratação registrada! Acompanhe o progresso na barra inferior.'
      toast.success(msg, { duration: 6000 })
      navigate('/contratacoes')
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao registrar contratação.'
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
        title="Importar Contratação"
        subtitle="Importe uma contratação do portal ContrataçõesGov para o sistema"
        actions={
          <Button variant="outline" onClick={() => navigate('/contratacoes')}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Dados da Contratação</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amparoLegal"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Amparo Legal *</FormLabel>
                      <Select onValueChange={(v) => { field.onChange(v); form.setValue('modalidade', undefined as any) }} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o amparo legal..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LEI_14133_2021">Lei 14.133/2021 — Nova Lei de Licitações</SelectItem>
                          <SelectItem value="LEI_8666_1993">Lei 8.666/1993 — Lei Anterior</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numContratacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da Contratação *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 90010" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="anoContratacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ano da Contratação *</FormLabel>
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
                          {modalidadesDisponiveis.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
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
                              <SelectItem key={u.identificador} value={u.uasg}>
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
                    'Importar Contratação'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/contratacoes')}
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
