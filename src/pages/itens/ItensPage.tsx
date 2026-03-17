import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { ManageSearchIcon } from "@/components/icons/ManageSearchIcon";
import type { ColumnDef } from "@tanstack/react-table";
import { itensApi } from "@/api/itens.api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatCurrency, truncate } from "@/lib/utils";
import type { IItem } from "@/types";

export function ItensPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const idAta = searchParams.get("idAta") ?? undefined;
  const idCompra = searchParams.get("idCompra") ?? undefined;

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["itens", idAta, idCompra],
    queryFn: () => itensApi.listar({ idAta, idCompra }),
  });

  const columns: ColumnDef<IItem, unknown>[] = [
    {
      id: "numItem",
      header: "Nº Item",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">
          {row.original.sequencialItemPregao ?? row.original.numItem ?? "—"}
        </span>
      ),
    },
    {
      id: "descBreve",
      header: "Descrição Breve",
      cell: ({ row }) => {
        const desc = row.original.descBreve ?? row.original.descricaoBreve;
        return <span className="text-sm font-medium">{desc ?? "—"}</span>;
      },
    },
    {
      id: "descDetalhada",
      header: "Descrição Detalhada",
      cell: ({ row }) => {
        const desc =
          row.original.descDetalhada ?? row.original.descricaoDetalhada;
        return (
          <span className="text-sm text-muted-foreground" title={desc}>
            {desc ? truncate(desc, 80) : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "qtdHomologada",
      header: "Qtd Homologada",
      cell: ({ row }) => {
        const unidade = row.original.unMedida ?? row.original.unidadeMedida;
        return (
          <span className="text-sm">
            {row.original.qtdHomologada != null
              ? `${row.original.qtdHomologada} ${unidade ?? ""}`
              : "—"}
          </span>
        );
      },
    },
    {
      id: "valorUnitario",
      header: "Valor Unitário",
      cell: ({ row }) => {
        const val = row.original.valUnitario ?? row.original.valorUnitario;
        return (
          <span className="text-sm font-medium">
            {val != null ? formatCurrency(val) : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.tipo ?? "—"}</span>
      ),
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
            onClick={() => navigate(`/itens/${row.original.identificador}`)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Ver Fornecimentos"
            onClick={() =>
              navigate(`/fornecimentos?idItem=${row.original._id}`)
            }
          >
            <ManageSearchIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const subtitle = idAta
    ? `Filtrando por Ata: ${idAta}`
    : idCompra
      ? `Filtrando por Compra: ${idCompra}`
      : "Todos os itens registrados no sistema";

  return (
    <div>
      <PageHeader title="Itens" subtitle={subtitle} />

      <DataTable
        columns={columns}
        data={itens}
        isLoading={isLoading}
        searchPlaceholder="Buscar por descrição..."
        emptyMessage="Nenhum item encontrado."
      />
    </div>
  );
}
