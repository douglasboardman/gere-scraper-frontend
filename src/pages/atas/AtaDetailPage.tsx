import { useState } from 'react'
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArrowLeft, Pencil, X, Check, Eye } from "lucide-react";
import { atasApi } from "@/api/atas.api";
import { itensApi } from "@/api/itens.api";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCNPJ, formatCurrency } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [editStatus, setEditStatus] = useState('');

  const { data: ata, isLoading } = useQuery({
    queryKey: ["ata", id],
    queryFn: () => atasApi.obter(id!),
    enabled: !!id,
  });

  const { data: itens = [] } = useQuery({
    queryKey: ["itens", { identAta: id }],
    queryFn: () => itensApi.listar({ identAta: id! }),
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
      const data = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
      toast.error(data?.message ?? data?.error ?? "Erro ao atualizar ata.");
    },
  });

  const handleEdit = () => {
    setEditStatus(ata?.status ?? '');
    setEditMode(true);
  };

  const handleSave = () => {
    if (editStatus) updateMutation.mutate({ status: editStatus });
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

  const statusEditaveis = ["Processada", "Disponivel", "Encerrada"];
  const canEdit = can("edit:atas") && statusEditaveis.includes(ata.status);

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
            <Field label="Vigência Início">{formatDate(ata.iniVigencia)}</Field>
            <Field label="Vigência Fim">{formatDate(ata.fimVigencia)}</Field>
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

      {itens.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Itens ({itens.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Item</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Qtd Homologada</TableHead>
                  <TableHead>Valor Unitário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.identificador}>
                    <TableCell className="font-mono text-sm">
                      {item.sequencialItemPregao ?? item.numItem ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate" title={item.descBreve}>
                      {item.descBreve ?? item.descricaoBreve ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.qtdHomologada != null
                        ? `${item.qtdHomologada} ${item.unMedida ?? item.unidadeMedida ?? ""}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {(item.valUnitario ?? item.valorUnitario) != null
                        ? formatCurrency(item.valUnitario ?? item.valorUnitario ?? 0)
                        : "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={item.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Ver detalhes"
                        onClick={() => navigate(`/itens/${item.identificador}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
