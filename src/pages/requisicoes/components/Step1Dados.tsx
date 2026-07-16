import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Pencil } from 'lucide-react'
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
import { destDespesaLabel } from '@/lib/utils'
import { step1Schema, type Step1Data } from '../utils/requisicaoUtils'

export type { Step1Data }

export function Step1Dados({
  initialData,
  onComplete,
}: {
  initialData?: Step1Data
  onComplete: (data: Step1Data) => void
}) {
  const [editing, setEditing] = useState(!initialData)

  const form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      destDespesa: initialData?.destDespesa ?? undefined,
      justificativa: initialData?.justificativa ?? '',
      observacoes: initialData?.observacoes ?? '',
    },
  })

  if (!editing && initialData) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Dados da Requisição</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3 mr-1.5" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Tipo</p>
            <p className="text-sm font-medium">{destDespesaLabel(initialData.destDespesa)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Justificativa</p>
            <p className="text-sm whitespace-pre-wrap">{initialData.justificativa}</p>
          </div>
          {initialData.observacoes && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Observações</p>
              <p className="text-sm whitespace-pre-wrap">{initialData.observacoes}</p>
            </div>
          )}
          <div className="flex justify-end pt-1">
            <Button onClick={() => onComplete(initialData)}>
              Avançar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-base">Dados da Requisição</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) => { setEditing(false); onComplete(d) })}
            className="space-y-5"
          >
            <FormField
              control={form.control}
              name="destDespesa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destinação de Despesa *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Material">Material</SelectItem>
                      <SelectItem value="Servico">Serviço</SelectItem>
                      <SelectItem value="Outras_Obrigacoes">Outras Obrigações</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="justificativa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Justificativa *{' '}
                    <span className="text-muted-foreground font-normal text-xs">
                      (mín. 30 caracteres)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="Descreva a necessidade e justificativa da requisição..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Observações{' '}
                    <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Informações adicionais..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-1">
              {initialData && (
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                  Cancelar edição
                </Button>
              )}
              <Button type="submit" className="ml-auto">
                Avançar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
