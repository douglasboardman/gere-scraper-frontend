import { useState } from 'react'
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArrowLeft, Pencil, X, Check, ExternalLink } from "lucide-react";
import { atasApi } from "@/api/atas.api";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCNPJ } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  );
}

export function AtaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [editMode, setEditMode] = useState(false);
  const [editIniVigencia, setEditIniVigencia] = useState('');
  const [editFimVigencia, setEditFimVigencia] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const { data: ata, isLoading } = useQuery({
    queryKey: ["ata", id],
    queryFn: () => atasApi.obter(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) => atasApi.atualizar(id!, data as any),
    onSuccess: () => {
      toast.success("Ata atualizada com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["ata", id] });
      queryClient.invalidateQueries({ queryKey: ["atas"] });
      setEditMode(false);
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Erro ao atualizar ata.";
      toast.error(msg);
    },
  });

  const handleEdit = () => {
    setEditIniVigencia(ata?.iniVigencia ? ata.iniVigencia.slice(0, 10) : '');
    setEditFimVigencia(ata?.fimVigencia ? ata.fimVigencia.slice(0, 10) : '');
    setEditStatus(ata?.status ?? '');
    setEditMode(true);
  };

  const handleSave = () => {
    const payload: Record<string, string> = {};
    if (editIniVigencia) payload.iniVigencia = editIniVigencia;
    if (editFimVigencia) payload.fimVigencia = editFimVigencia;
    if (editStatus) payload.status = editStatus;
    updateMutation.mutate(payload);
  };

  const formatDate = (d?: string) =>
    d ? format(new Date(d), "dd/MM/yyyy", { locale: ptBR }) : "—";

  const anoAta = () => {
    if (ata?.identContratacao) {
      return (ata?.identContratacao as string).slice(12, 16);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!ata)
    return <div className="text-muted-foreground">Ata não encontrada.</div>;

  const canEdit = can("edit:atas") && ata.status === "Processada";

  return (
    <div>
      <PageHeader
        title={`Ata Nº ${ata.numAta}/${anoAta()}`}
        subtitle={`Contratação: ${ata.identContratacao}`}
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
                  {updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </>
            ) : (
              <>
                {canEdit && (
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
            <Field label="Nº Ata">
              <span className="font-mono">{ata.numAta}</span>
            </Field>
            <Field label="ID Contratação">
              {typeof ata.identContratacao === "string" ? (
                <Link
                  to={`/contratacoes/${ata.identContratacao}`}
                  className="font-mono text-primary hover:underline"
                >
                  {ata.identContratacao}
                </Link>
              ) : (
                <Link
                  to={`/contratacoes/${ata.identContratacao.identificador}`}
                  className="font-mono text-primary hover:underline"
                >
                  {ata.identContratacao.identificador}
                </Link>
              )}
            </Field>
            <Field label="CNPJ Fornecedor">
              {ata.cnpjFornecedor ? (
                <span className="font-mono">{formatCNPJ(ata.cnpjFornecedor)}</span>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Fornecedor">{ata.nomeFornecedor || "—"}</Field>
            <Field label="Vigência Início">
              {editMode ? (
                <Input
                  type="date"
                  value={editIniVigencia}
                  onChange={(e) => setEditIniVigencia(e.target.value)}
                  className="w-40"
                />
              ) : (
                formatDate(ata.iniVigencia)
              )}
            </Field>
            <Field label="Vigência Fim">
              {editMode ? (
                <Input
                  type="date"
                  value={editFimVigencia}
                  onChange={(e) => setEditFimVigencia(e.target.value)}
                  className="w-40"
                />
              ) : (
                formatDate(ata.fimVigencia)
              )}
            </Field>
            <Field label="Status">
              {editMode ? (
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Processada">Processada</SelectItem>
                    <SelectItem value="Disponivel">Disponível</SelectItem>
                    <SelectItem value="Encerrada">Encerrada</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <StatusBadge status={ata.status} />
              )}
            </Field>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Atualizado em{" "}
            {format(new Date(ata.updatedAt), "dd/MM/yyyy HH:mm", {
              locale: ptBR,
            })}
          </p>
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" asChild>
        <Link to={`/itens?identAta=${ata.identificador}`}>
          <ExternalLink className="h-4 w-4" />
          Ver Itens desta Ata
        </Link>
      </Button>
    </div>
  );
}
