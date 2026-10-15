import { useMemo, useEffect, Fragment } from 'react'
import { useListState } from '@/hooks/useListState'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type FilterFn,
  type Row,
  type PaginationState,
  type Updater,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  isLoading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  globalFilterFn?: FilterFn<TData>
  renderExpandedRow?: (row: Row<TData>, colSpan: number) => React.ReactNode
  pageResetKey?: unknown
  persistenceKey?: string
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum registro encontrado.',
  globalFilterFn,
  renderExpandedRow,
  pageResetKey,
  persistenceKey = 'main',
}: DataTableProps<TData>) {
  const resetKey = JSON.stringify(pageResetKey ?? null)
  const [view, setView] = useListState(`table:${persistenceKey}`, {
    globalFilter: '',
    pagination: { pageIndex: 0, pageSize: 10 },
    resetKey,
  })
  const { globalFilter, pagination } = view
  const setGlobalFilter = (update: Updater<string>) => setView((previous) => ({
    ...previous,
    globalFilter: typeof update === 'function' ? update(previous.globalFilter) : update,
    pagination: { ...previous.pagination, pageIndex: 0 },
  }))
  const setPagination = (update: Updater<PaginationState>) => setView((previous) => ({
    ...previous,
    pagination: typeof update === 'function' ? update(previous.pagination) : update,
  }))

  const tableData = useMemo(() => data, [data])

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      globalFilter,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn: globalFilterFn ?? 'auto',
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  useEffect(() => {
    if (view.resetKey !== resetKey) {
      setView((previous) => ({ ...previous, resetKey, pagination: { ...previous.pagination, pageIndex: 0 } }))
    }
  }, [resetKey, view.resetKey, setView])

  const pageCount = table.getPageCount()
  useEffect(() => {
    // Uma exclusão ou atualização pode reduzir o número de páginas da pesquisa.
    if (!isLoading && view.resetKey === resetKey && pagination.pageIndex >= Math.max(1, pageCount)) {
      setView((previous) => ({ ...previous, pagination: { ...previous.pagination, pageIndex: Math.max(0, pageCount - 1) } }))
    }
  }, [isLoading, pageCount, pagination.pageIndex, setView, view.resetKey, resetKey])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {searchable && <Skeleton className="h-10 w-64" />}
        <div className="rounded-md border">
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="flex items-center gap-2">
          <div className="relative max-w-sm w-full group">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground transition-colors duration-150 group-focus-within:text-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 transition-shadow duration-150 focus:shadow-xs"
            />
          </div>
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="animate-fade-in">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() && 'selected'}
                    className="hover:bg-muted/40 transition-colors duration-100 cursor-default"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {renderExpandedRow?.(row, columns.length)}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Linhas por página:</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Página anterior"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Próxima página"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
