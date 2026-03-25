import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { formatCNPJ } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { Eye } from "lucide-react";
import { ManageSearchIcon } from "@/components/icons/ManageSearchIcon";
import type { ColumnDef } from "@tanstack/react-table";
import { atasApi } from "@/api/atas.api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import type { IAtaRegPrecos } from "@/types";

export function AtasPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const identContratacao = searchParams.get("identContratacao") ?? undefined;

  const { data: atas = [], isLoading } = useQuery({
    queryKey: ["atas", identContratacao],
    queryFn: () => atasApi.listar(identContratacao),
  });

  const columns: ColumnDef<IAtaRegPrecos, unknown>[] = [
    {
      accessorKey: "numAta",
      header: "Nº Ata",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">
          {row.original.numAta}
        </span>
      ),
    },
    {
      accessorKey: "identContratacao",
      header: "ID Contratação",
      cell: ({ row }) => {
        const identContratacao = row.original.identContratacao;
        return (
          <span className="text-sm">
            {typeof identContratacao === "string"
              ? identContratacao
              : (identContratacao?.identificador ?? "—")}
          </span>
        );
      },
    },
    {
      id: "fornecedor",
      header: "Fornecedor",
      cell: ({ row }) => (
        <div>
          {row.original.cnpjFornecedor && (
            <p className="font-mono text-xs text-muted-foreground">
              {formatCNPJ(row.original.cnpjFornecedor)}
            </p>
          )}
          <p className="text-sm">{row.original.nomeFornecedor ?? "—"}</p>
        </div>
      ),
    },
    {
      id: "vigencia",
      header: "Vigência",
      cell: ({ row }) => {
        const ini = row.original.iniVigencia;
        const fim = row.original.fimVigencia;
        if (!ini && !fim)
          return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-sm whitespace-nowrap">
            {ini ? format(new Date(ini), "dd/MM/yyyy", { locale: ptBR }) : "?"}
            {" → "}
            {fim ? format(new Date(fim), "dd/MM/yyyy", { locale: ptBR }) : "?"}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Ver detalhes"
            onClick={() => navigate(`/atas/${row.original.identificador}`)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Ver Itens"
            onClick={() =>
              navigate(`/itens?identAta=${row.original.identificador}`)
            }
          >
            <ManageSearchIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Atas de Registro de Preços"
        subtitle={
          identContratacao
            ? `Filtrando por contratação: ${identContratacao}`
            : "Todas as atas registradas no sistema"
        }
      />

      <DataTable
        columns={columns}
        data={atas}
        isLoading={isLoading}
        searchPlaceholder="Buscar por fornecedor ou Nº Ata..."
        emptyMessage="Nenhuma ata encontrada."
      />
    </div>
  );
}
