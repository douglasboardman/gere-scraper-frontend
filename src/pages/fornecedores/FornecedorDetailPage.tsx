import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, X, Check, ShieldAlert, Loader2, List } from 'lucide-react'
import { fornecedoresApi } from '@/api/fornecedores.api'
import { SancoesDialog, useSancoesDialog } from '@/components/shared/SancoesDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCNPJ } from '@/lib/utils'

function formatTelefone(tel: string | null | undefined): string {
  if (!tel) return '—'
  // Espera formato "DD NÚMERO" onde DD são 2 dígitos
  const match = tel.trim().match(/^(\d{2})\s+(\d+)$/)
  if (!match) return tel
  const [, ddd, numero] = match
  const parte1 = numero.slice(0, -4)
  const parte2 = numero.slice(-4)
  return `(${ddd}) ${parte1}-${parte2}`
}
import { usePermission } from '@/hooks/usePermission'
import type { IFornecedor } from '@/types'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  )
}

export function FornecedorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermission()
  const [editMode, setEditMode] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editEmail2, setEditEmail2] = useState('')
  const [editTelefone, setEditTelefone] = useState('')
  const [editTelefone2, setEditTelefone2] = useState('')
  const [editEndereco, setEditEndereco] = useState('')

  const { data: fornecedor, isLoading } = useQuery({
    queryKey: ['fornecedor', id],
    queryFn: () => fornecedoresApi.obter(id!),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<IFornecedor>) => fornecedoresApi.atualizar(fornecedor!.identificador, data),
    onSuccess: () => {
      toast.success('Fornecedor atualizado com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['fornecedor', id] })
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] })
      setEditMode(false)
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao atualizar fornecedor.'
      toast.error(msg)
    },
  })

  const handleEdit = () => {
    setEditNome(fornecedor?.nome ?? '')
    setEditEmail(fornecedor?.email1 ?? fornecedor?.email ?? '')
    setEditEmail2(fornecedor?.email2 ?? '')
    setEditTelefone(fornecedor?.telefone1 ?? fornecedor?.telefone ?? '')
    setEditTelefone2(fornecedor?.telefone2 ?? '')
    setEditEndereco(fornecedor?.endereco ?? '')
    setEditMode(true)
  }

  const handleSave = () => {
    updateMutation.mutate({
      nome: editNome || undefined,
      email1: editEmail || undefined,
      email2: editEmail2 || undefined,
      telefone1: editTelefone || undefined,
      telefone2: editTelefone2 || undefined,
      endereco: editEndereco || undefined,
    })
  }

  const sancoesDialog = useSancoesDialog()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!fornecedor) return <div className="text-muted-foreground">Fornecedor não encontrado.</div>

  // Backend may return: email1, telefone1 or the compat fields email, telefone
  const email = fornecedor.email1 ?? fornecedor.email
  const email2 = fornecedor.email2
  const telefone = fornecedor.telefone1 ?? fornecedor.telefone
  const telefone2 = fornecedor.telefone2

  return (
    <div>
      <PageHeader
        title={fornecedor.nome ?? fornecedor.razaoSocial ?? 'Fornecedor'}
        subtitle={`CNPJ: ${formatCNPJ(fornecedor.cnpj)}`}
        actions={
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                  <Check className="h-4 w-4" />
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sancoesDialog.loading}
                  onClick={() =>
                    sancoesDialog.consultar(
                      fornecedor.cnpj,
                      fornecedor.nome ?? fornecedor.razaoSocial ?? 'Fornecedor'
                    )
                  }
                >
                  {sancoesDialog.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldAlert className="h-4 w-4" />
                  )}
                  Consultar Sanções
                </Button>
                {can('edit:fornecedores') && (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
            <Field label="CNPJ">
              <span className="font-mono">{formatCNPJ(fornecedor.cnpj)}</span>
            </Field>
            <Field label="Identificador">
              <span className="font-mono text-xs">{fornecedor.identificador}</span>
            </Field>
            <Field label="Nome / Fantasia">
              {editMode ? (
                <Input
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  placeholder="Nome do fornecedor"
                />
              ) : (
                fornecedor.nome || '—'
              )}
            </Field>
            <Field label="E-mail">
              {editMode ? (
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              ) : (
                email || '—'
              )}
            </Field>
            <Field label="E-mail 2">
              {editMode ? (
                <Input
                  type="email"
                  value={editEmail2}
                  onChange={(e) => setEditEmail2(e.target.value)}
                  placeholder="email2@exemplo.com"
                />
              ) : (
                email2 || '—'
              )}
            </Field>
            <Field label="Telefone">
              {editMode ? (
                <Input
                  value={editTelefone}
                  onChange={(e) => setEditTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-44"
                />
              ) : (
                formatTelefone(telefone)
              )}
            </Field>
            <Field label="Telefone 2">
              {editMode ? (
                <Input
                  value={editTelefone2}
                  onChange={(e) => setEditTelefone2(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-44"
                />
              ) : (
                formatTelefone(telefone2)
              )}
            </Field>
            <div className="col-span-2 md:col-span-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Endereço</span>
              {editMode ? (
                <Input
                  className="mt-1"
                  value={editEndereco}
                  onChange={(e) => setEditEndereco(e.target.value)}
                  placeholder="Endereço do fornecedor"
                />
              ) : (
                <p className="mt-1 text-sm">{fornecedor.endereco || '—'}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Atualizado em {format(new Date(fornecedor.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </p>
        </CardContent>
      </Card>

      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(`/fornecimentos?identFornecedor=${fornecedor.identificador}&status=Disponivel`)}
        >
          <List className="h-4 w-4" />
          Listar Fornecimentos Válidos
        </Button>
      </div>

      <SancoesDialog
        open={sancoesDialog.open}
        onClose={sancoesDialog.fechar}
        nomeFornecedor={sancoesDialog.nomeFornecedor}
        sancoes={sancoesDialog.sancoes}
      />
    </div>
  )
}
