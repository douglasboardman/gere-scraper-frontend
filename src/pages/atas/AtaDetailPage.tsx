import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { atasApi } from "@/api/atas.api";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCNPJ } from "@/lib/utils";

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

  const { data: ata, isLoading } = useQuery({
    queryKey: ["ata", id],
    queryFn: () => atasApi.obter(id!),
    enabled: !!id,
  });

  const formatDate = (d?: string) =>
    d ? format(new Date(d), "dd/MM/yyyy", { locale: ptBR }) : "—";

  const anoAta = () => {
    if (ata?.idContratacao) {
      return (ata?.idContratacao as string).slice(12, 16);
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

  return (
    <div>
      <PageHeader
        title={`Ata Nº ${ata.numAta}/${anoAta()}`}
        subtitle={`Contratação: ${ata.idContratacao}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
            <Field label="Nº Ata">
              <span className="font-mono">{ata.numAta}</span>
            </Field>
            <Field label="ID Contratação">
              {typeof ata.idContratacao === "string" ? (
                <Link
                  to={`/contratacoes/${ata.idContratacao}`}
                  className="font-mono text-primary hover:underline"
                >
                  {ata.idContratacao}
                </Link>
              ) : (
                <Link
                  to={`/contratacoes/${ata.idContratacao.identificador}`}
                  className="font-mono text-primary hover:underline"
                >
                  {ata.idContratacao.identificador}
                </Link>
              )}
            </Field>
            <Field label="CNPJ Fornecedor">
              {ata.cnpjFornecedor ? (
                <span className="font-mono">
                  {formatCNPJ(ata.cnpjFornecedor)}
                </span>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Fornecedor">{ata.nomeFornecedor || "—"}</Field>
            <Field label="Vigência Início">{formatDate(ata.iniVigencia)}</Field>
            <Field label="Vigência Fim">{formatDate(ata.fimVigencia)}</Field>
            <Field label="Status">
              <StatusBadge status={ata.status} />
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
        <Link to={`/itens?idAta=${ata.identificador}`}>
          <ExternalLink className="h-4 w-4" />
          Ver Itens desta Ata
        </Link>
      </Button>
    </div>
  );
}
