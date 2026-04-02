import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye, Search } from "lucide-react";
import { ManageSearchIcon } from "@/components/icons/ManageSearchIcon";
import type { ColumnDef } from "@tanstack/react-table";
import { itensApi } from "@/api/itens.api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, truncate } from "@/lib/utils";
import type { IItem, IAtaRegPrecos, IContratacao } from "@/types";

export function ItensPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const identAta = searchParams.get("identAta") ?? undefined;
  const identContratacao = searchParams.get("identContratacao") ?? undefined;

  const [descFilter, setDescFilter] = useState("");
  const [contratacaoFilter, setContratacaoFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState("all");

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["itens", identAta, identContratacao],
    queryFn: () => itensApi.listar({ identAta, identContratacao }),
  });

  const handleContratacaoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
    setContratacaoFilter(digits.length <= 5 ? digits : `${digits.slice(0, 5)}/${digits.slice(5)}`);
  };

  const getContratacaoInfo = (item: IItem) => {
    const identAta = item.identAta;
    if (!identAta || typeof identAta === "string") return null;
    const identContratacao = (identAta as IAtaRegPrecos).identContratacao;
    if (!identContratacao || typeof identContratacao === "string") return null;
    const c = identContratacao as IContratacao;
    return { numContratacao: c.numContratacao, anoContratacao: c.anoContratacao };
  };

  const itensFiltrados = itens.filter((item) => {
    if (descFilter.trim()) {
      const desc = (item.descDetalhada ?? item.descricaoDetalhada ?? "").toLowerCase();
      if (!desc.includes(descFilter.toLowerCase())) return false;
    }
    if (contratacaoFilter) {
      const c = getContratacaoInfo(item);
      if (!c) return false;
      const full = `${c.numContratacao}/${c.anoContratacao}`;
      if (!full.startsWith(contratacaoFilter)) return false;
    }
    if (tipoFilter !== "all") {
      if ((item.tipo ?? "") !== tipoFilter) return false;
    }
    return true;
  }).sort((a, b) => {
    const cA = getContratacaoInfo(a);
    const cB = getContratacaoInfo(b);
    const anoA = cA ? Number(cA.anoContratacao) : 0;
    const anoB = cB ? Number(cB.anoContratacao) : 0;
    if (anoA !== anoB) return anoA - anoB;
    const numA = cA ? Number(cA.numContratacao) : 0;
    const numB = cB ? Number(cB.numContratacao) : 0;
    if (numA !== numB) return numA - numB;
    const seqA = Number(a.sequencialItemPregao ?? 0);
    const seqB = Number(b.sequencialItemPregao ?? 0);
    return seqA - seqB;
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
      id: "contratacao",
      header: "Contratação",
      cell: ({ row }) => {
        const c = getContratacaoInfo(row.original);
        if (!c) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="font-mono text-sm whitespace-nowrap">
            {c.numContratacao}/{c.anoContratacao}
          </span>
        );
      },
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
              navigate(`/fornecimentos?identItem=${row.original.identificador}`)
            }
          >
            <ManageSearchIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const subtitle = identAta
    ? `Filtrando por Ata: ${identAta}`
    : identContratacao
      ? `Filtrando por Contratação: ${identContratacao}`
      : "Todos os itens registrados no sistema";

  return (
    <div>
      <PageHeader title="Itens" subtitle={subtitle} />

      <div className="mb-4 rounded-lg border bg-muted/40 p-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Filtrar por:</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Descrição detalhada..."
              value={descFilter}
              onChange={(e) => setDescFilter(e.target.value)}
              className="pl-8 bg-background"
            />
          </div>
          <Input
            placeholder="Contratação (ex: 90019/2025)"
            value={contratacaoFilter}
            onChange={handleContratacaoInput}
            className="bg-background"
          />
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="Material">Material</SelectItem>
              <SelectItem value="Servico">Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={itensFiltrados}
        isLoading={isLoading}
        searchable={false}
        emptyMessage="Nenhum item encontrado."
      />
    </div>
  );
}
