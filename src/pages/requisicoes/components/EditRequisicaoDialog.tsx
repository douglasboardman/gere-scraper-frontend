import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { requisicoesApi } from '@/api/requisicoes.api'
import { getApiErrorMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { destDespesaLabel } from '@/lib/utils'
import type { IRequisicao } from '@/types'

const editReqSchema = z.object({
  justificativa: z.string().min(30, 'A justificativa deve ter pelo menos 30 caracteres'),
  observacoes: z.string().optional(),
})
type EditReqData = z.infer<typeof editReqSchema>

interface EditRequisicaoDialogProps {
  requisicao: IRequisicao
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}

export function EditRequisicaoDialog({
  requisicao,
  open,
  onOpenChange,
  onSaved,
}: EditRequisicaoDialogProps) {
  const form = useForm<EditReqData>({
    resolver: zodResolver(editReqSchema),
    defaultValues: {
      justificativa: requisicao.justificativa ?? '',
      observacoes: (requisicao.observacoes ?? requisicao.observacao) ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: EditReqData) => requisicoesApi.atualizar(requisicao.identificador, data),
    onSuccess: () => {
      toast.success('Requisição atualizada.')
      onSaved()
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error))
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Dados da Requisição</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo</Label>
              <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                {destDespesaLabel(requisicao.destDespesa)}
              </div>
              <p className="text-xs text-muted-foreground">
                O tipo da requisição não pode ser alterado.
              </p>
            </div>

            <FormField
              control={form.control}
              name="justificativa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Justificativa *{' '}
                    <span className="text-muted-foreground font-normal text-xs">(mín. 30 caracteres)</span>
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

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
