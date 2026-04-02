import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye, Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { fornecimentosApi } from "@/api/fornecimentos.api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { IFornecimento, IItem, IFornecedor } from "@/types";

export function FornecimentosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idItemParam = searchParams.get("identItem") ?? undefined;
  const idFornecedorParam = searchParams.get("identFornecedor") ?? undefined;
  const statusParam = searchParams.get("status") ?? undefined;
  const [uasgFilter, setUasgFilter] = useState("");
  const [appliedUasg, setAppliedUasg] = useState<string | undefined>(undefined);

  const { data: fornecimentos = [], isLoading } = useQuery({
    queryKey: ["fornecimentos", appliedUasg, idItemParam, idFornecedorParam, statusParam],
    queryFn: () =>
      fornecimentosApi.listar({
        ...(idItemParam ? { identItem: idItemParam } : {}),
        ...(appliedUasg ? { uasgUnParticipante: appliedUasg } : {}),
        ...(idFornecedorParam ? { identFornecedor: idFornecedorParam } : {}),
        ...(statusParam ? { status: statusParam } : {}),
      }),
  });

  const getItemDesc = (identItem: string | IItem): string => {
    if (typeof identItem === "string") return identItem;
    return identItem.descBreve ?? identItem.descricaoBreve ?? identItem.numItem ?? "—";
  };

  const getFornecedorName = (identFornecedor: string | IFornecedor): string => {
    if (typeof identFornecedor === "string") return identFornecedor;
    return identFornecedor.nome ?? identFornecedor.razaoSocial ?? "—";
  };

  const columns: ColumnDef<IFornecimento, unknown>[] = [
    {
      accessorKey: "identificador",
      header: "Identificador",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">
          {row.original.identificador}
        </span>
      ),
    },
    {
      id: "item",
      header: "Item",
      cell: ({ row }) => (
        <span className="text-sm">{getItemDesc(row.original.identItem)}</span>
      ),
    },
    {
      id: "fornecedor",
      header: "Fornecedor",
      cell: ({ row }) => (
        <span className="text-sm">
          {getFornecedorName(row.original.identFornecedor)}
        </span>
      ),
    },
    {
      id: "unidade",
      header: "Unidade Part.",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.nomeUnParticipante || row.original.uasgUnParticipante}
        </span>
      ),
    },
    {
      id: "saldo",
      header: "Qtd. Disponível",
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {row.original.saldoDisponivel != null
            ? row.original.saldoDisponivel
            : "—"}
        </span>
      ),
    },
    {
      accessorKey: "valUnitHomologado",
      header: "Valor Unit.",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.valUnitHomologado != null
            ? formatCurrency(row.original.valUnitHomologado)
            : "—"}
        </span>
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
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Ver detalhes"
          onClick={() =>
            navigate(`/fornecimentos/${row.original.identificador}`)
          }
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fornecimentos"
        subtitle="Quantitativos de fornecimentos por unidade participante"
      />

      <div className="mb-4 flex gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por UASG..."
            value={uasgFilter}
            onChange={(e) => setUasgFilter(e.target.value)}
            className="pl-8 w-48"
            onKeyDown={(e) =>
              e.key === "Enter" && setAppliedUasg(uasgFilter || undefined)
            }
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setAppliedUasg(uasgFilter || undefined)}
        >
          Filtrar
        </Button>
        {appliedUasg && (
          <Button
            variant="ghost"
            onClick={() => {
              setUasgFilter("");
              setAppliedUasg(undefined);
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={fornecimentos}
        isLoading={isLoading}
        searchPlaceholder="Buscar fornecimentos..."
        emptyMessage="Nenhum fornecimento encontrado."
      />
    </div>
  );
}
