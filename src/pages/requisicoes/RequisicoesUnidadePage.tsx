import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Filter, X } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { tipoRequisicaoLabel } from '@/lib/utils'
import { requisicoesApi } from '@/api/requisicoes.api'
import { unidadesApi } from '@/api/unidades.api'
import { usuariosApi } from '@/api/usuarios.api'
import { contratacoesApi } from '@/api/contratacoes.api'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/store/auth.store'
import { usePermission } from '@/hooks/usePermission'
import type { IRequisicao, IUsuario, IUnidade } from '@/types'

interface Filtros {
  unidadeId: string
  requisitanteId: string
  tipo: string
  contratacaoId: string
  status: string
  dataInicio: string
  dataFim: string
}

const FILTROS_INICIAIS: Filtros = {
  unidadeId: '',
  requisitanteId: '',
  tipo: '',
  contratacaoId: '',
  status: '',
  dataInicio: '',
  dataFim: '',
}

export function RequisicoesUnidadePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { isAdmin, isGestor } = usePermission()
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [pendingFilters, setPendingFilters] = useState<Filtros>(FILTROS_INICIAIS)
  const [appliedFilters, setAppliedFilters] = useState<Filtros>(FILTROS_INICIAIS)

  const { data: requisicoes = [], isLoading } = useQuery({
    queryKey: ['requisicoes-unidade', appliedFilters.contratacaoId],
    queryFn: () => requisicoesApi.listar(appliedFilters.contratacaoId || undefined),
  })

  // Dados para o modal de filtro
  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadesApi.listar,
    enabled: isAdmin,
  })

  const { data: todosUsuarios = [] } = useQuery({
    queryKey: ['usuarios-todos'],
    queryFn: usuariosApi.listarTodos,
    enabled: filterModalOpen && isAdmin,
  })

  const { data: usuariosUnidade = [] } = useQuery({
    queryKey: ['usuarios-unidade'],
    queryFn: usuariosApi.listar,
    enabled: filterModalOpen && !isAdmin,
  })

  // Determina a UASG usada para buscar contratações no modal
  const uasgParaContratacoes = useMemo(() => {
    if (isAdmin && pendingFilters.unidadeId) {
      return unidades.find((u) => u.identificador === pendingFilters.unidadeId)?.uasg ?? ''
    }
    return user?.unidade?.uasg ?? ''
  }, [isAdmin, pendingFilters.unidadeId, unidades, user?.unidade?.uasg])

  const { data: contratacoes = [] } = useQuery({
    queryKey: ['contratacoes-filtro', uasgParaContratacoes],
    queryFn: () => contratacoesApi.listarPorUasg(uasgParaContratacoes),
    enabled: filterModalOpen && !!pendingFilters.tipo && !!uasgParaContratacoes,
  })

  // Usuários disponíveis para o filtro de requisitante
  const usuariosFiltrados = useMemo(() => {
    if (isAdmin) {
      if (pendingFilters.unidadeId) {
        return todosUsuarios.filter(
          (u) => u.unidade?.identificador === pendingFilters.unidadeId
        )
      }
      return todosUsuarios
    }
    return usuariosUnidade
  }, [isAdmin, pendingFilters.unidadeId, todosUsuarios, usuariosUnidade])

  // Filtros aplicados client-side (Rascunho nunca exibido nesta página)
  const requisicoesFiltradas = useMemo(() => {
    return requisicoes.filter((req) => {
      if (req.status === 'Rascunho') return false
      if (appliedFilters.tipo && req.tipo !== appliedFilters.tipo) return false

      if (appliedFilters.status && req.status !== appliedFilters.status) return false

      if (appliedFilters.requisitanteId && req.requisitanteId !== appliedFilters.requisitanteId)
        return false

      if (appliedFilters.unidadeId) {
        const unidadeId =
          typeof req.identUnidade === 'string'
            ? req.identUnidade
            : (req.identUnidade as IUnidade)?.identificador ?? ''
        const unidadeUasg =
          typeof req.identUnidade !== 'string'
            ? (req.identUnidade as IUnidade)?.uasg ?? ''
            : ''
        const selectedUnidade = unidades.find((u) => u.identificador === appliedFilters.unidadeId)
        if (
          unidadeId !== appliedFilters.unidadeId &&
          unidadeUasg !== selectedUnidade?.uasg
        )
          return false
      }

      if (appliedFilters.dataInicio) {
        const inicio = new Date(appliedFilters.dataInicio + 'T00:00:00')
        if (new Date(req.createdAt) < inicio) return false
      }

      if (appliedFilters.dataFim) {
        const fim = new Date(appliedFilters.dataFim + 'T23:59:59')
        if (new Date(req.createdAt) > fim) return false
      }

      if (appliedFilters.contratacaoId && req.identContratacao !== appliedFilters.contratacaoId)
        return false

      return true
    })
  }, [requisicoes, appliedFilters, unidades])

  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length

  const handleAplicarFiltros = () => {
    setAppliedFilters(pendingFilters)
    setFilterModalOpen(false)
  }

  const handleLimparFiltros = () => {
    setPendingFilters(FILTROS_INICIAIS)
    setAppliedFilters(FILTROS_INICIAIS)
    setFilterModalOpen(false)
  }

  const handleAbrirModal = () => {
    setPendingFilters(appliedFilters)
    setFilterModalOpen(true)
  }

  const columns: ColumnDef<IRequisicao, unknown>[] = [
    {
      accessorKey: 'identificador',
      header: 'Identificador',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.original.identificador}</span>
      ),
    },
    {
      id: 'requisitante',
      header: 'Requisitante',
      cell: ({ row }) => {
        const r = row.original.requisitante
        return (
          <span className="text-sm">
            {typeof r === 'string' ? r : (r as IUsuario)?.nome ?? '—'}
          </span>
        )
      },
    },
    {
      id: 'unidade',
      header: 'Unidade',
      cell: ({ row }) => {
        const u = row.original.identUnidade
        return (
          <span className="text-sm">
            {typeof u === 'string'
              ? u
              : (u as IUnidade)?.nomeAbrev ?? (u as IUnidade)?.nome ?? '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => (
        <span className="text-sm">{tipoRequisicaoLabel(row.original.tipo)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'dataCriacao',
      header: 'Data Criação',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      ),
    },
    {
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => {
        const req = row.original
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            title="Visualizar"
            onClick={() => navigate(`/requisicoes/${req.identificador}/visualizar`)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Visualizar
          </Button>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title="Requisições da Unidade"
        subtitle="Todas as requisições da unidade"
      />

      {/* Barra de filtros */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} ativo
                {activeFilterCount > 1 ? 's' : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleLimparFiltros}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar
              </Button>
            </>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleAbrirModal}>
          <Filter className="h-4 w-4 mr-2" />
          Filtrar
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={requisicoesFiltradas}
        isLoading={isLoading}
        emptyMessage="Nenhuma requisição encontrada."
      />

      {/* Modal de filtros */}
      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filtrar Requisições</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Unidade — somente para Administrador */}
            {isAdmin && (
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select
                  value={pendingFilters.unidadeId || '__all__'}
                  onValueChange={(val) =>
                    setPendingFilters((prev) => ({
                      ...prev,
                      unidadeId: val === '__all__' ? '' : val,
                      requisitanteId: '',
                      contratacaoId: '',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as unidades</SelectItem>
                    {unidades.map((u) => (
                      <SelectItem key={u.identificador} value={u.identificador}>
                        {u.nomeAbrev ?? u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Requisitante */}
            <div className="space-y-1.5">
              <Label>Requisitante</Label>
              <Select
                value={pendingFilters.requisitanteId || '__all__'}
                onValueChange={(val) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    requisitanteId: val === '__all__' ? '' : val,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os requisitantes</SelectItem>
                  {usuariosFiltrados.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={pendingFilters.tipo || '__all__'}
                onValueChange={(val) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    tipo: val === '__all__' ? '' : val,
                    contratacaoId: '',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os tipos</SelectItem>
                  <SelectItem value="Material">Material</SelectItem>
                  <SelectItem value="Servico">Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contratação — habilitado apenas após selecionar tipo */}
            <div className="space-y-1.5">
              <Label className={!pendingFilters.tipo ? 'text-muted-foreground' : ''}>
                Contratação
              </Label>
              <Select
                value={pendingFilters.contratacaoId || '__all__'}
                onValueChange={(val) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    contratacaoId: val === '__all__' ? '' : val,
                  }))
                }
                disabled={!pendingFilters.tipo}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !pendingFilters.tipo
                        ? 'Selecione um tipo primeiro'
                        : 'Todas as contratações'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as contratações</SelectItem>
                  {contratacoes.map((c) => (
                    <SelectItem key={c.identificador} value={c.identificador}>
                      {c.numContratacao}/{c.anoContratacao}
                      {c.nomeUnGestora ? ` — ${c.nomeUnGestora}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!pendingFilters.tipo && (
                <p className="text-xs text-muted-foreground">
                  Selecione um tipo para habilitar este filtro.
                </p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={pendingFilters.status || '__all__'}
                onValueChange={(val) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    status: val === '__all__' ? '' : val,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os status</SelectItem>
                  <SelectItem value="Enviada">Enviada</SelectItem>
                  <SelectItem value="Aprovada">Aprovada</SelectItem>
                  <SelectItem value="Empenhada">Empenhada</SelectItem>
                  {(isAdmin || isGestor) && (
                    <SelectItem value="Rejeitada">Rejeitada</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Data de criação */}
            <div className="space-y-1.5">
              <Label>Data de Criação</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={pendingFilters.dataInicio}
                  onChange={(e) =>
                    setPendingFilters((prev) => ({ ...prev, dataInicio: e.target.value }))
                  }
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground shrink-0">até</span>
                <Input
                  type="date"
                  value={pendingFilters.dataFim}
                  onChange={(e) =>
                    setPendingFilters((prev) => ({ ...prev, dataFim: e.target.value }))
                  }
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleLimparFiltros}>
              Limpar Filtros
            </Button>
            <Button onClick={handleAplicarFiltros}>Aplicar Filtros</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
