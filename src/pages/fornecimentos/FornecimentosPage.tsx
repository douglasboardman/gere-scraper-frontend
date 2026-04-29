import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye, PlusCircle, Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { fornecimentosApi } from "@/api/fornecimentos.api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatCNPJ, ENTITY } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";
import type { IFornecimento, IItem, IAtaRegPrecos, IContratacao, IContrato } from "@/types";

export function FornecimentosPage() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const [searchParams] = useSearchParams();
  const idItemParam = searchParams.get("identItem") ?? undefined;
  const idFornecedorParam = searchParams.get("identFornecedor") ?? undefined;
  const statusParam = searchParams.get("status") ?? undefined;
  const [uasgFilter, setUasgFilter] = useState("");
  const [contratacaoFilter, setContratacaoFilter] = useState("");
  const [contratoFilter, setContratoFilter] = useState("");
  const [deContratoOnly, setDeContratoOnly] = useState(false);
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

  const getContratacaoFromItem = (identItem: string | IItem): IContratacao | null => {
    if (typeof identItem === "string") return null;
    // 14133 path: via ata
    if (identItem.identAta && typeof identItem.identAta !== "string") {
      const ata = identItem.identAta as IAtaRegPrecos;
      if (ata.identContratacao && typeof ata.identContratacao !== "string") {
        return ata.identContratacao as IContratacao;
      }
    }
    // legado path: direct on item
    if (!identItem.identAta && identItem.identContratacao && typeof identItem.identContratacao !== "string") {
      return identItem.identContratacao as IContratacao;
    }
    return null;
  };

  const getAtaFromItem = (identItem: string | IItem): IAtaRegPrecos | null => {
    if (typeof identItem === "string") return null;
    if (!identItem.identAta || typeof identItem.identAta === "string") return null;
    return identItem.identAta as IAtaRegPrecos;
  };

  const fornecimentosFiltrados = fornecimentos
    .filter((f) => {
      if (uasgFilter.trim() && !f.uasgUnParticipante.includes(uasgFilter.trim())) return false;
      if (contratacaoFilter) {
        const c = getContratacaoFromItem(f.identItem);
        if (!c) return false;
        const full = `${c.numContratacao}/${c.anoContratacao}`;
        if (!full.startsWith(contratacaoFilter)) return false;
      }
      if (deContratoOnly && !f.identContrato) return false;
      if (contratoFilter.trim()) {
        if (!f.identContrato) return false;
        const numContrato = typeof f.identContrato !== "string"
          ? (f.identContrato as IContrato).numContrato
          : f.identContrato;
        if (!numContrato.toLowerCase().includes(contratoFilter.toLowerCase())) return false;
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
      const cA = getContratacaoFromItem(a.identItem);
      const cB = getContratacaoFromItem(b.identItem);
      const anoA = cA ? Number(cA.anoContratacao) : 0;
      const anoB = cB ? Number(cB.anoContratacao) : 0;
      if (anoA !== anoB) return anoA - anoB;
      const numCA = cA ? Number(cA.numContratacao) : 0;
      const numCB = cB ? Number(cB.numContratacao) : 0;
      if (numCA !== numCB) return numCA - numCB;
      const ataA = getAtaFromItem(a.identItem);
      const ataB = getAtaFromItem(b.identItem);
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
      header: "Ata/Contrato",
      cell: ({ row }) => {
        const f = row.original;
        const contratacao = getContratacaoFromItem(f.identItem);
        const ata = getAtaFromItem(f.identItem);
        const contrato = f.identContrato && typeof f.identContrato !== "string"
          ? f.identContrato as IContrato
          : null;
        const hasRef = contrato || ata;
        return (
          <div className="flex items-center gap-3">
            {hasRef && (
              <span className={`inline-flex items-center justify-center h-7 w-7 shrink-0 rounded-md ${contrato ? ENTITY.contrato.bg : ENTITY.ata.bgAlt}`}>
                {contrato
                  ? <ENTITY.contrato.icon className="h-3.5 w-3.5 text-gray-600" />
                  : <ENTITY.ata.icon className="h-3.5 w-3.5 text-gray-600" />
                }
              </span>
            )}
            <div>
              {contratacao && (
                <p className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {contratacao.numContratacao}/{contratacao.anoContratacao}
                </p>
              )}
              {contrato ? (
                <p className="text-sm whitespace-nowrap">C {contrato.numContrato}</p>
              ) : ata ? (
                <p className="text-sm whitespace-nowrap">A {ata.numAta}</p>
              ) : !contratacao ? (
                <span className="text-muted-foreground">—</span>
              ) : null}
            </div>
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
        entity={ENTITY.fornecimento}
        actions={
          can('create:fornecimentos') ? (
            <Button size="sm" onClick={() => navigate('/fornecimentos/novo')}>
              <PlusCircle className="h-4 w-4 mr-1" />
              Novo Fornecimento
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 rounded-lg border bg-muted/40 p-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Filtrar por:</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
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
            placeholder="Contrato (ex: 12/2024)"
            value={contratoFilter}
            onChange={(e) => setContratoFilter(e.target.value)}
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
          <label className="flex items-center gap-2 cursor-pointer select-none h-9 px-3 rounded-md border bg-background text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary cursor-pointer"
              checked={deContratoOnly}
              onChange={(e) => setDeContratoOnly(e.target.checked)}
            />
            De Contrato
          </label>
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
