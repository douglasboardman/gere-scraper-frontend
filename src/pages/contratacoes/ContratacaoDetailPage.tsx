import { useState, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArrowLeft, Pencil, X, Check, CheckCircle2, PauseCircle, Eye } from "lucide-react";
import { contratacoesApi } from "@/api/contratacoes.api";
import { atasApi } from "@/api/atas.api";
import { contratosApi } from "@/api/contratos.api";
import { itensApi } from "@/api/itens.api";
import { useEditGuard } from "@/hooks/useEditGuard";
import { UnsavedChangesDialog } from "@/components/shared/UnsavedChangesDialog";
import { MODALIDADE_LABEL } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/hooks/usePermission";
import { useAuthStore } from "@/store/auth.store";
import { formatCNPJ, formatCurrency } from "@/lib/utils";
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
import type { IContratacao, IAtaRegPrecos, IContrato, IItem } from "@/types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  );
}

export function ContratacaoDetailPage() {
  const { identificador } = useParams<{ identificador: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can, isAdmin } = usePermission();
  const usuario = useAuthStore((s) => s.user);
  const [editMode, setEditMode] = useState(false);
  const [editObjeto, setEditObjeto] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('informacoes');

  const resetEditState = () => {
    setEditMode(false);
    setEditObjeto(contratacao?.objeto ?? '');
    setEditStatus(contratacao?.status ?? '');
  };

  const { isDialogOpen, handleNavigate, handleStay, guardTabChange } = useEditGuard(
    editMode,
    resetEditState,
  );

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const { data: contratacao, isLoading } = useQuery({
    queryKey: ["contratacao", identificador],
    queryFn: () => contratacoesApi.obter(identificador!),
    enabled: !!identificador,
  });

  const { data: atas = [] } = useQuery<IAtaRegPrecos[]>({
    queryKey: ["atas", { identContratacao: identificador }],
    queryFn: () => atasApi.listar(identificador!),
    enabled: !!identificador,
  });

  const { data: todosContratos = [] } = useQuery<IContrato[]>({
    queryKey: ["contratos", "contratacao", identificador],
    queryFn: () => contratosApi.listarPorContratacao(identificador!),
    enabled: !!identificador,
  });

  const { data: itens = [] } = useQuery<IItem[]>({
    queryKey: ["itens", { identContratacao: identificador }],
    queryFn: () => itensApi.listar({ identContratacao: identificador! }),
    enabled: !!identificador,
  });

  const contratos = isAdmin
    ? todosContratos
    : todosContratos.filter((ct) => ct.uasgContratante === usuario?.unidade?.uasg);

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
            ? contratacao.objeto.slice(0, 80) + (contratacao.objeto.length > 80 ? "…" : "")
            : "Sem objeto definido"
        }
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
              <Button variant="outline" size="sm" onClick={() => navigate("/contratacoes")}>
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
          <TabsTrigger value="atas">
            Atas
            {atas.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                {atas.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="contratos">
            Contratos
            {contratos.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                {contratos.length}
              </span>
            )}
          </TabsTrigger>
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
                <Field label="Identificador">
                  <span className="font-mono">{contratacao.identificador}</span>
                </Field>
                <Field label="Nº Contratação">{contratacao.numContratacao || "—"}</Field>
                <Field label="Ano">{contratacao.anoContratacao || "—"}</Field>
                <Field label="UASG Gestora">{contratacao.uasgUnGestora || "—"}</Field>
                <Field label="Nome UN Gestora">{contratacao.nomeUnGestora || "—"}</Field>
                <Field label="Cód. UN Gestora">{contratacao.codUnGestora || "—"}</Field>
                <Field label="Modalidade">
                  {MODALIDADE_LABEL[contratacao.modContratacao ?? ""] ?? contratacao.modContratacao ?? "—"}
                </Field>
                <Field label="Nº Edital">{contratacao.numEdital || "—"}</Field>
                <Field label="Vigência Início">{formatDate(contratacao.iniVigencia)}</Field>
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
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Objeto</span>
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

              {/* Status actions */}
              {can("edit:contratacoes") && (contratacao.status === "Processada" || contratacao.status === "Disponivel") && !editMode && (
                <div className="flex gap-3 flex-wrap mt-6 pt-5 border-t">
                  {contratacao.status === "Processada" && (
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
                  {contratacao.status === "Disponivel" && (
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    disabled={contratacao.status !== "Processada"}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-6">
                Atualizado em {format(new Date(contratacao.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA: Atas ────────────────────────────────── */}
        <TabsContent value="atas">
          <Card>
            <CardContent className="p-0">
              {atas.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Nenhuma ata vinculada a esta contratação.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nº Ata</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fornecedor</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vigência</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {atas.map((ata) => (
                      <TableRow key={ata.identificador} className="hover:bg-muted/40 transition-colors duration-100">
                        <TableCell className="font-mono text-sm">{ata.numAta}</TableCell>
                        <TableCell>
                          {ata.cnpjFornecedor && (
                            <p className="font-mono text-xs text-muted-foreground">{formatCNPJ(ata.cnpjFornecedor)}</p>
                          )}
                          <p className="text-sm">{ata.nomeFornecedor ?? "—"}</p>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {ata.iniVigencia ? formatDate(ata.iniVigencia) : "—"}
                          {" → "}
                          {ata.fimVigencia ? formatDate(ata.fimVigencia) : "—"}
                        </TableCell>
                        <TableCell><StatusBadge status={ata.status} /></TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Ver detalhes"
                            onClick={() => navigate(`/atas/${ata.identificador}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA: Contratos ───────────────────────────── */}
        <TabsContent value="contratos">
          <Card>
            <CardContent className="p-0">
              {contratos.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Nenhum contrato vinculado a esta contratação.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nº Contrato</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CNPJ Contratado</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">UASG Contratante</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vigência</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valor Global</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contratos.map((ct) => (
                      <TableRow key={ct.identificador} className="hover:bg-muted/40 transition-colors duration-100">
                        <TableCell>
                          <p className="font-mono text-xs text-muted-foreground">{ct.tipoContrato ?? 'Contrato'}</p>
                          <span className="font-mono text-sm">{ct.numContrato}</span>
                        </TableCell>
                        <TableCell>
                          <p className="font-mono text-xs text-muted-foreground">{formatCNPJ(ct.fornecedor?.cnpj ?? '')}</p>
                          {ct.fornecedor?.nome && <p className="text-sm">{ct.fornecedor.nome}</p>}
                        </TableCell>
                        <TableCell className="text-sm">{ct.uasgContratante}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDate(ct.iniVigencia)}
                          {" → "}
                          {ct.fimVigencia ? formatDate(ct.fimVigencia) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{formatCurrency(ct.valorGlobal)}</TableCell>
                        <TableCell><StatusBadge status={ct.status} /></TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Ver detalhes"
                            onClick={() => navigate(`/contratos/${ct.identificador}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* ─── ABA: Itens ───────────────────────────────── */}
        <TabsContent value="itens">
          <Card>
            <CardContent className="p-0">
              {itens.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Nenhum item vinculado a esta contratação.
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
