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
import { formatCurrency, formatCNPJ } from "@/lib/utils";
import type { IFornecimento, IItem } from "@/types";

export function FornecimentosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idItemParam = searchParams.get("identItem") ?? undefined;
  const idFornecedorParam = searchParams.get("identFornecedor") ?? undefined;
  const statusParam = searchParams.get("status") ?? undefined;
  const [uasgFilter, setUasgFilter] = useState("");
  const [contratacaoFilter, setContratacaoFilter] = useState("");
  const [fornecedorNameFilter, setFornecedorNameFilter] = useState("");
  const [itemDescFilter, setItemDescFilter] = useState("");

  const { data: fornecimentos = [], isLoading } = useQuery({
    queryKey: ["fornecimentos", idItemParam, idFornecedorParam, statusParam],
    queryFn: () =>
      fornecimentosApi.listar({
        ...(idItemParam ? { identItem: idItemParam } : {}),
        ...(idFornecedorParam ? { identFornecedor: idFornecedorParam } : {}),
        ...(statusParam ? { status: statusParam } : {}),
      }),
  });

  const handleContratacaoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
    setContratacaoFilter(digits.length <= 5 ? digits : `${digits.slice(0, 5)}/${digits.slice(5)}`);
  };

  const getItemDesc = (identItem: string | IItem): string => {
    if (typeof identItem === "string") return identItem;
    return identItem.descBreve ?? identItem.descricaoBreve ?? identItem.numItem ?? "—";
  };

  const getAtaInfo = (identItem: string | IItem) => {
    if (typeof identItem === "string") return null;
    const identAta = identItem.identAta;
    if (!identAta || typeof identAta === "string") return null;
    const identContratacao = identAta.identContratacao;
    if (!identContratacao || typeof identContratacao === "string") return null;
    return {
      numAta: identAta.numAta,
      numContratacao: identContratacao.numContratacao,
      anoContratacao: identContratacao.anoContratacao,
    };
  };

  const fornecimentosFiltrados = fornecimentos
    .filter((f) => {
      if (uasgFilter.trim() && !f.uasgUnParticipante.includes(uasgFilter.trim())) return false;
      if (contratacaoFilter) {
        const ata = getAtaInfo(f.identItem);
        if (!ata) return false;
        const full = `${ata.numContratacao}/${ata.anoContratacao}`;
        if (!full.startsWith(contratacaoFilter)) return false;
      }
      if (fornecedorNameFilter.trim()) {
        if (!(f.nomeFornecedor ?? "").toLowerCase().includes(fornecedorNameFilter.toLowerCase())) return false;
      }
      if (itemDescFilter.trim()) {
        if (!getItemDesc(f.identItem).toLowerCase().includes(itemDescFilter.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const ataA = getAtaInfo(a.identItem);
      const ataB = getAtaInfo(b.identItem);
      const anoA = ataA ? Number(ataA.anoContratacao) : 0;
      const anoB = ataB ? Number(ataB.anoContratacao) : 0;
      if (anoA !== anoB) return anoA - anoB;
      const numCA = ataA ? Number(ataA.numContratacao) : 0;
      const numCB = ataB ? Number(ataB.numContratacao) : 0;
      if (numCA !== numCB) return numCA - numCB;
      const numAtaA = ataA?.numAta ?? "";
      const numAtaB = ataB?.numAta ?? "";
      if (numAtaA !== numAtaB) return numAtaA.localeCompare(numAtaB, undefined, { numeric: true });
      const seqA = typeof a.identItem !== "string" ? Number(a.identItem.sequencialItemPregao ?? 0) : 0;
      const seqB = typeof b.identItem !== "string" ? Number(b.identItem.sequencialItemPregao ?? 0) : 0;
      return seqA - seqB;
    });

  const columns: ColumnDef<IFornecimento, unknown>[] = [
    {
      id: "ata",
      header: "Ata",
      cell: ({ row }) => {
        const ata = getAtaInfo(row.original.identItem);
        if (!ata) return <span className="text-muted-foreground">—</span>;
        return (
          <div>
            <p className="font-mono text-xs text-muted-foreground whitespace-nowrap">
              C {ata.numContratacao}/{ata.anoContratacao}
            </p>
            <p className="text-sm whitespace-nowrap">Ata {ata.numAta}</p>
          </div>
        );
      },
    },
    {
      id: "item",
      header: "Item",
      cell: ({ row }) => {
        const seq = typeof row.original.identItem !== "string"
          ? row.original.identItem.sequencialItemPregao
          : null;
        return (
          <div>
            {seq && (
              <p className="font-mono text-xs text-muted-foreground">{seq}</p>
            )}
            <p className="text-sm">{getItemDesc(row.original.identItem)}</p>
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
          <p className="text-sm">{row.original.nomeFornecedor ?? row.original.identFornecedor}</p>
        </div>
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
      id: "qtdAutorizada",
      header: "Qtd. Autorizada",
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {row.original.qtdAutorizada != null ? row.original.qtdAutorizada : "—"}
        </span>
      ),
    },
    {
      id: "saldo",
      header: "Qtd. Disp.",
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

      <div className="mb-4 rounded-lg border bg-muted/40 p-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Filtrar por:</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="UASG..."
              value={uasgFilter}
              onChange={(e) => setUasgFilter(e.target.value)}
              className="pl-8 bg-background"
            />
          </div>
          <Input
            placeholder="Contratação (ex: 90019/2025)"
            value={contratacaoFilter}
            onChange={handleContratacaoInput}
            className="bg-background"
          />
          <Input
            placeholder="Nome do fornecedor..."
            value={fornecedorNameFilter}
            onChange={(e) => setFornecedorNameFilter(e.target.value)}
            className="bg-background"
          />
          <Input
            placeholder="Descrição do item..."
            value={itemDescFilter}
            onChange={(e) => setItemDescFilter(e.target.value)}
            className="bg-background"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={fornecimentosFiltrados}
        isLoading={isLoading}
        searchable={false}
        emptyMessage="Nenhum fornecimento encontrado."
      />
    </div>
  );
}
