import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { formatCNPJ, ENTITY } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { Eye, Search } from "lucide-react";
import { ManageSearchIcon } from "@/components/icons/ManageSearchIcon";
import type { ColumnDef } from "@tanstack/react-table";
import { atasApi } from "@/api/atas.api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IAtaRegPrecos } from "@/types";

export function AtasPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const identContratacao = searchParams.get("identContratacao") ?? undefined;
  const [fornecedorFilter, setFornecedorFilter] = useState("");

  const { data: atas = [], isLoading } = useQuery({
    queryKey: ["atas", identContratacao],
    queryFn: () => atasApi.listar(identContratacao),
  });

  const atasFiltradas = fornecedorFilter.trim()
    ? atas.filter((a) =>
        (a.nomeFornecedor ?? "").toLowerCase().includes(fornecedorFilter.toLowerCase())
      )
    : atas;

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
      header: "Contratação",
      cell: ({ row }) => {
        const ic = row.original.identContratacao;
        const identificador = typeof ic === "string" ? ic : ic?.identificador;
        const numCompra = (() => {
          if (!identificador?.startsWith("C")) return null;
          const body = identificador.slice(1);
          if (body.length < 11) return null;
          return `${body.slice(6, -4)}/${body.slice(-4)}`;
        })();
        return (
          <div>
            {identificador && (
              <p className="font-mono text-xs text-muted-foreground">{identificador}</p>
            )}
            <p className="text-sm">{numCompra ?? identificador ?? "—"}</p>
          </div>
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
        entity={ENTITY.ata}
      />

      <div className="relative max-w-sm w-full mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por fornecedor..."
          value={fornecedorFilter}
          onChange={(e) => setFornecedorFilter(e.target.value)}
          className="pl-8"
        />
      </div>

      <DataTable
        columns={columns}
        data={atasFiltradas}
        isLoading={isLoading}
        searchable={false}
        emptyMessage="Nenhuma ata encontrada."
      />
    </div>
  );
}
