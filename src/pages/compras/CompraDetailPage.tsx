import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArrowLeft, Pencil, X, Check, ExternalLink } from "lucide-react";
import { comprasApi } from "@/api/compras.api";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermission } from "@/hooks/usePermission";
import type { ICompra, StatusCompra } from "@/types";

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

export function CompraDetailPage() {
  const { identificador } = useParams<{ identificador: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [editMode, setEditMode] = useState(false);
  const [editStatus, setEditStatus] = useState<StatusCompra | "">("");

  const { data: compra, isLoading } = useQuery({
    queryKey: ["compra", identificador],
    queryFn: () => comprasApi.obter(identificador!),
    enabled: !!identificador,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ICompra>) =>
      comprasApi.atualizar(identificador!, data),
    onSuccess: () => {
      toast.success("Compra atualizada com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["compra", identificador] });
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      setEditMode(false);
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Erro ao atualizar compra.";
      toast.error(msg);
    },
  });

  const handleEdit = () => {
    setEditStatus(compra?.status ?? "");
    setEditMode(true);
  };

  const handleSave = () => {
    if (!editStatus) return;
    updateMutation.mutate({ status: editStatus as StatusCompra });
  };

  const formatDate = (d?: string) =>
    d ? format(new Date(d), "dd/MM/yyyy", { locale: ptBR }) : "—";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!compra)
    return <div className="text-muted-foreground">Compra não encontrada.</div>;

  return (
    <div>
      <PageHeader
        title={`Compra ${compra.numCompra}/${compra.anoCompra}`}
        subtitle={
          compra.objeto
            ? compra.objeto.slice(0, 80) +
              (compra.objeto.length > 80 ? "…" : "")
            : "Sem objeto definido"
        }
        actions={
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(false)}
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                  {updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </>
            ) : (
              <>
                {can("manage:compras") && (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/compras")}
                >
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
            <Field label="Identificador">
              <span className="font-mono">{compra.identificador}</span>
            </Field>
            <Field label="Nº Compra">{compra.numCompra || "—"}</Field>
            <Field label="Ano">{compra.anoCompra || "—"}</Field>
            <Field label="UASG Gestora">{compra.uasgUnGestora || "—"}</Field>
            <Field label="Nome UN Gestora">{compra.nomeUnGestora || "—"}</Field>
            <Field label="Cód. UN Gestora">{compra.codUnGestora || "—"}</Field>
            <Field label="Modalidade">
              {compra.modContratacao || "—"}
            </Field>
            <Field label="Nº Edital">{compra.numEdital || "—"}</Field>
            <Field label="Vigência Início">
              {formatDate(compra.iniVigencia)}
            </Field>
            <Field label="Vigência Fim">{formatDate(compra.fimVigencia)}</Field>
            <Field label="Status">
              {editMode ? (
                <Select
                  value={editStatus}
                  onValueChange={(v) => setEditStatus(v as StatusCompra)}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em Processamento">
                      Em Processamento
                    </SelectItem>
                    <SelectItem value="Processada">Processada</SelectItem>
                    <SelectItem value="Inconsistente">Inconsistente</SelectItem>
                    <SelectItem value="Aguardando">Aguardando</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <StatusBadge status={compra.status} />
              )}
            </Field>
            {compra.objeto && (
              <div className="col-span-2 md:col-span-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Objeto
                </span>
                <p className="mt-1 text-sm leading-relaxed">{compra.objeto}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Atualizado em{" "}
            {format(new Date(compra.updatedAt), "dd/MM/yyyy HH:mm", {
              locale: ptBR,
            })}
          </p>
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" asChild>
        <Link to={`/atas?idCompra=${compra.identificador}`}>
          <ExternalLink className="h-4 w-4" />
          Ver Atas desta Compra
        </Link>
      </Button>
    </div>
  );
}
