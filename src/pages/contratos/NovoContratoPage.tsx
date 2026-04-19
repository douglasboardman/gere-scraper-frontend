import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { contratosApi } from '@/api/contratos.api'
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
  identContratacao: z.string().min(1, 'Identificador da contratação é obrigatório'),
  numContrato: z.string().min(1, 'Número do contrato é obrigatório'),
  uasgContratante: z.string().min(1, 'UASG contratante é obrigatória'),
  unGestoraOrigemContrato: z.string().optional(),
  cnpjContratado: z.string().min(14, 'CNPJ inválido'),
  objeto: z.string().optional(),
  iniVigencia: z.string().min(1, 'Data de início é obrigatória'),
  fimVigencia: z.string().optional(),
  valorGlobal: z.coerce.number().positive('Valor global deve ser positivo'),
  numParcelas: z.coerce.number().int().positive().optional().or(z.literal('')),
  valorParcelas: z.coerce.number().positive().optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export function NovoContratoPage() {
  const navigate = useNavigate()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      identContratacao: '',
      numContrato: '',
      uasgContratante: '',
      unGestoraOrigemContrato: '',
      cnpjContratado: '',
      objeto: '',
      iniVigencia: '',
      fimVigencia: '',
      valorGlobal: 0,
      numParcelas: '',
      valorParcelas: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      contratosApi.criar({
        identContratacao: data.identContratacao,
        numContrato: data.numContrato,
        uasgContratante: data.uasgContratante,
        unGestoraOrigemContrato: data.unGestoraOrigemContrato || undefined,
        cnpjContratado: data.cnpjContratado.replace(/\D/g, ''),
        objeto: data.objeto || undefined,
        iniVigencia: data.iniVigencia,
        fimVigencia: data.fimVigencia || undefined,
        valorGlobal: data.valorGlobal,
        numParcelas: data.numParcelas ? Number(data.numParcelas) : undefined,
        valorParcelas: data.valorParcelas ? Number(data.valorParcelas) : undefined,
      }),
    onSuccess: (contrato) => {
      toast.success('Contrato criado com sucesso.')
      navigate(`/contratos/${contrato.identificador}`)
    },
    onError: (error: unknown) => {
      const d = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data
      toast.error(d?.message ?? d?.error ?? 'Erro ao criar contrato.')
    },
  })

  const onSubmit = (data: FormData) => createMutation.mutate(data)

  return (
    <div>
      <PageHeader
        title="Novo Contrato"
        subtitle="Cadastrar contrato administrativo manualmente"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="identContratacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Identificador da Contratação *</FormLabel>
                      <FormControl><Input placeholder="Ex: 15842620252019" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numContrato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do Contrato *</FormLabel>
                      <FormControl><Input placeholder="Ex: 001/2025" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="uasgContratante"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UASG Contratante *</FormLabel>
                      <FormControl><Input placeholder="Ex: 158426" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unGestoraOrigemContrato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UN Gestora Origem</FormLabel>
                      <FormControl><Input placeholder="Nome da unidade gestora" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cnpjContratado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ Contratado *</FormLabel>
                      <FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="objeto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objeto</FormLabel>
                      <FormControl><Input placeholder="Descrição do objeto contratual" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="iniVigencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início Vigência *</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fimVigencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fim Vigência</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="valorGlobal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Global (R$) *</FormLabel>
                      <FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numParcelas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº Parcelas</FormLabel>
                      <FormControl><Input type="number" min={1} placeholder="Opcional" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="valorParcelas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor das Parcelas (R$)</FormLabel>
                      <FormControl><Input type="number" step="0.01" min={0} placeholder="Opcional" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Salvando...' : 'Criar Contrato'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
