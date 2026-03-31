import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArrowLeft, Pencil, X, Check, ExternalLink, CheckCircle2, PauseCircle } from "lucide-react";
import { contratacoesApi } from "@/api/contratacoes.api";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { usePermission } from "@/hooks/usePermission";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IContratacao } from "@/types";

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

export function ContratacaoDetailPage() {
  const { identificador } = useParams<{ identificador: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [editMode, setEditMode] = useState(false);
  const [editObjeto, setEditObjeto] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const { data: contratacao, isLoading } = useQuery({
    queryKey: ["contratacao", identificador],
    queryFn: () => contratacoesApi.obter(identificador!),
    enabled: !!identificador,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<IContratacao>) =>
      contratacoesApi.atualizar(identificador!, data),
    onSuccess: () => {
      toast.success("Contratação atualizada com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["contratacao", identificador] });
      queryClient.invalidateQueries({ queryKey: ["contratacoes"] });
      setEditMode(false);
    },
    onError: (error: unknown) => {
      const data = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
      toast.error(data?.message ?? data?.error ?? "Erro ao atualizar contratação.");
    },
  });

  const handleEdit = () => {
    setEditObjeto(contratacao?.objeto ?? "");
    setEditStatus(contratacao?.status ?? "");
    setEditMode(true);
  };

  const handleSave = () => {
    const payload: Partial<IContratacao> = {};
    if (contratacao?.status === "Processada") payload.objeto = editObjeto;
    if (editStatus) payload.status = editStatus as IContratacao["status"];
    updateMutation.mutate(payload);
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

  if (!contratacao)
    return <div className="text-muted-foreground">Contratação não encontrada.</div>;

  return (
    <div>
      <PageHeader
        title={`Contratação ${contratacao.numContratacao}/${contratacao.anoContratacao}`}
        subtitle={
          contratacao.objeto
            ? contratacao.objeto.slice(0, 80) +
              (contratacao.objeto.length > 80 ? "…" : "")
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
                {can("edit:contratacoes") && ["Processada", "Disponivel", "Encerrada"].includes(contratacao.status) && (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/contratacoes")}
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
              <span className="font-mono">{contratacao.identificador}</span>
            </Field>
            <Field label="Nº Contratação">{contratacao.numContratacao || "—"}</Field>
            <Field label="Ano">{contratacao.anoContratacao || "—"}</Field>
            <Field label="UASG Gestora">{contratacao.uasgUnGestora || "—"}</Field>
            <Field label="Nome UN Gestora">{contratacao.nomeUnGestora || "—"}</Field>
            <Field label="Cód. UN Gestora">{contratacao.codUnGestora || "—"}</Field>
            <Field label="Modalidade">
              {contratacao.modContratacao || "—"}
            </Field>
            <Field label="Nº Edital">{contratacao.numEdital || "—"}</Field>
            <Field label="Vigência Início">
              {formatDate(contratacao.iniVigencia)}
            </Field>
            <Field label="Vigência Fim">{formatDate(contratacao.fimVigencia)}</Field>
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
                <StatusBadge status={contratacao.status} />
              )}
            </Field>
            <div className="col-span-2 md:col-span-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Objeto
              </span>
              {editMode && contratacao.status === "Processada" ? (
                <Textarea
                  className="mt-1"
                  rows={4}
                  value={editObjeto}
                  onChange={(e) => setEditObjeto(e.target.value)}
                />
              ) : (
                <p className="mt-1 text-sm leading-relaxed">{contratacao.objeto || "—"}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Atualizado em{" "}
            {format(new Date(contratacao.updatedAt), "dd/MM/yyyy HH:mm", {
              locale: ptBR,
            })}
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/atas?identContratacao=${contratacao.identificador}`}>
            <ExternalLink className="h-4 w-4" />
            Ver Atas desta Contratação
          </Link>
        </Button>
        {can("edit:contratacoes") && contratacao.status === "Processada" && (
          <Button
            size="sm"
            className="bg-green-700 hover:bg-green-800 text-white"
            onClick={() => updateMutation.mutate({ status: "Disponivel" } as any)}
            disabled={updateMutation.isPending}
          >
            <CheckCircle2 className="h-4 w-4" />
            Disponibilizar para Requisições
          </Button>
        )}
        {can("edit:contratacoes") && contratacao.status === "Disponivel" && (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => updateMutation.mutate({ status: "Processada" } as any)}
            disabled={updateMutation.isPending}
          >
            <PauseCircle className="h-4 w-4" />
            Suspender Disponibilidade
          </Button>
        )}
      </div>
    </div>
  );
}
