import { useState, Fragment } from 'react'
import { useNavigate, Link } from "react-router-dom";
import { useIdParam } from "@/hooks/useIdParam";
import { extractAnoContratacao, displayContratacaoFull } from "@/lib/identifier-utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArrowLeft, Pencil, X, Check, Eye } from "lucide-react";
import { atasApi } from "@/api/atas.api";
import { qk } from "@/lib/query-keys";
import type { IAtaRegPrecos, StatusElemContratacaoAlt } from "@/types";
import { itensApi } from "@/api/itens.api";
import { useEditGuard } from "@/hooks/useEditGuard";
import { UnsavedChangesDialog } from "@/components/shared/UnsavedChangesDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  );
}

export function AtaDetailPage() {
  const id = useIdParam();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [editMode, setEditMode] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('informacoes');

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const { data: ata, isLoading } = useQuery({
    queryKey: qk.atas.detail(id!),
    queryFn: () => atasApi.obter(id!),
    enabled: !!id,
  });

  const { data: itens = [] } = useQuery({
    queryKey: qk.itens.byAtaId(id!),
    queryFn: () => itensApi.listar({ identAta: id! }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<IAtaRegPrecos>) => atasApi.atualizar(id!, data),
    onSuccess: () => {
      toast.success("Ata atualizada com sucesso.");
      queryClient.invalidateQueries({ queryKey: qk.atas.detail(id!) });
      queryClient.invalidateQueries({ queryKey: qk.atas.all });
      queryClient.invalidateQueries({ queryKey: qk.itens.all });
      queryClient.invalidateQueries({ queryKey: qk.fornecimentos.all });
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
    if (editStatus) updateMutation.mutate({ status: editStatus as StatusElemContratacaoAlt });
  };

  const formatDate = (d?: string) =>
    d ? format(new Date(d), "dd/MM/yyyy", { locale: ptBR }) : "—";

  const anoAta = () => {
    if (ata?.identContratacao) {
      return extractAnoContratacao(ata.identContratacao as string);
    }
  };

  const resetEditState = () => {
    setEditMode(false);
    setEditStatus(ata?.status ?? '');
  };

  const { isDialogOpen, handleNavigate, handleStay, guardTabChange } = useEditGuard(
    editMode,
    resetEditState,
  );

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

  const identContStr = typeof ata.identContratacao === 'string'
    ? ata.identContratacao
    : (ata.identContratacao as { identificador: string }).identificador
  const subtitleAta = displayContratacaoFull(identContStr)

  return (
    <div>
      <PageHeader
        title={`Ata Nº ${ata.numAta}/${anoAta()}`}
        subtitle={subtitleAta}
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
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={guardTabChange(setActiveTab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="informacoes">Informações</TabsTrigger>
          <TabsTrigger value="itens">
            Itens
            {itens.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                {itens.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA: Informações ─────────────────────────── */}
        <TabsContent value="informacoes">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
                <Field label="Nº Ata">
                  <span className="font-mono">{ata.numAta}</span>
                </Field>
                <Field label="ID Contratação">
                  {typeof ata.identContratacao === "string" ? (
                    <Link
                      to={`/contratacoes/detalhe?id=${ata.identContratacao}`}
                      className="font-mono text-primary hover:underline"
                    >
                      {ata.identContratacao}
                    </Link>
                  ) : (
                    <Link
                      to={`/contratacoes/detalhe?id=${ata.identContratacao.identificador}`}
                      className="font-mono text-primary hover:underline"
                    >
                      {ata.identContratacao.identificador}
                    </Link>
                  )}
                </Field>
                <Field label="CNPJ Fornecedor">
                  {ata.cnpjFornecedor ? (
                    <span className="font-mono">{formatCNPJ(ata.cnpjFornecedor)}</span>
                  ) : "—"}
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
              {canEdit && !editMode && (
                <div className="flex gap-3 flex-wrap mt-6 pt-5 border-t">
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-6">
                Atualizado em{" "}
                {format(new Date(ata.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA: Itens ───────────────────────────────── */}
        <TabsContent value="itens">
          <Card>
            <CardContent className="p-0">
              {itens.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Nenhum item vinculado a esta ata.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nº Item</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descrição</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qtd Homologada</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valor Unitário</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...itens].sort((a, b) => Number(a.sequencialItemPregao ?? a.numItem ?? 0) - Number(b.sequencialItemPregao ?? b.numItem ?? 0)).map((item) => (
                      <Fragment key={item.identificador}>
                        <TableRow className="hover:bg-muted/40 transition-colors duration-100">
                          <TableCell className="font-mono text-sm">
                            {item.sequencialItemPregao ?? item.numItem ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{item.descBreve ?? item.descricaoBreve ?? "—"}</span>
                              <Button
                                size="sm"
                                className="h-5 px-1.5 text-[10px] shrink-0 bg-background border border-input text-foreground hover:text-muted-foreground hover:bg-background"
                                onClick={() => toggleExpand(item.identificador)}
                              >
                                Desc. Detalhada
                              </Button>
                            </div>
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
                          <TableCell><StatusBadge status={item.statusParticipacao ?? item.status} /></TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Ver detalhes"
                              onClick={() => navigate(`/itens/detalhe?id=${encodeURIComponent(item.identificador)}`)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedIds.has(item.identificador) && (
                          <TableRow className="hover:bg-muted">
                            <TableCell colSpan={6} className="bg-muted py-3 px-4">
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {item.descDetalhada ?? item.descricaoDetalhada ?? "—"}
                              </p>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <UnsavedChangesDialog
        open={isDialogOpen}
        onNavigate={handleNavigate}
        onStay={handleStay}
      />
    </div>
  );
}
