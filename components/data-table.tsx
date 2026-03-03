'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  className?: string
  /** When true, this column spans the full width in mobile card view */
  fullRow?: boolean
  /** When true, this column is hidden in mobile card view (used for actions column) */
  hideOnMobile?: boolean
  render: (row: T) => React.ReactNode
}

export interface CardAction<T> {
  type: 'edit' | 'delete'
  onClick: (row: T) => void
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onRowClick?: (row: T) => void
  emptyMessage?: string
  /** Actions to show in mobile card footer */
  cardActions?: CardAction<T>[]
  /** Custom mobile card renderer for app-like experience */
  mobileCard?: (row: T, actions?: CardAction<T>[]) => React.ReactNode
}

export function DataTable<T>({
  columns,
  data,
  page,
  totalPages,
  onPageChange,
  onRowClick,
  emptyMessage = 'No data found.',
  cardActions,
  mobileCard,
}: DataTableProps<T>) {
  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="bg-card hidden overflow-x-auto rounded-lg border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.className,
                    col.key === 'actions' && 'bg-card sticky right-0'
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow
                  key={i}
                  className={onRowClick ? 'hover:bg-muted/50 cursor-pointer' : ''}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        col.className,
                        col.key === 'actions' && 'bg-card sticky right-0'
                      )}
                    >
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-muted/50 mb-3 rounded-full p-4">
              <ChevronRight className="text-muted-foreground size-6" />
            </div>
            <p className="text-muted-foreground text-sm">{emptyMessage}</p>
          </div>
        ) : mobileCard ? (
          data.map((row, i) => (
            <div
              key={i}
              className={cn(
                'transition-transform duration-150 active:scale-[0.98]',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {mobileCard(row, cardActions)}
            </div>
          ))
        ) : (
          // Fallback to default card layout
          data.map((row, i) => {
            const gridCols = columns.filter((c) => !c.fullRow && !c.hideOnMobile)
            const fullRowCols = columns.filter((c) => c.fullRow && !c.hideOnMobile)
            return (
              <div
                key={i}
                className={cn(
                  'bg-card ring-border/50 rounded-xl p-4 shadow-sm ring-1 transition-all duration-150',
                  onRowClick && 'cursor-pointer active:scale-[0.98]'
                )}
                onClick={() => onRowClick?.(row)}
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {gridCols.map((col) => (
                    <div key={col.key} className="min-w-0">
                      <p className="text-muted-foreground mb-0.5 text-[11px] font-medium uppercase tracking-wide">
                        {col.header}
                      </p>
                      <div className="truncate text-sm">{col.render(row)}</div>
                    </div>
                  ))}
                </div>
                {fullRowCols.length > 0 && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    {fullRowCols.map((col) => (
                      <div key={col.key}>
                        <p className="text-muted-foreground mb-0.5 text-[11px] font-medium uppercase tracking-wide">
                          {col.header}
                        </p>
                        <div className="text-sm">{col.render(row)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 1) onPageChange(page - 1)
                }}
                className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={p === page}
                  onClick={(e) => {
                    e.preventDefault()
                    onPageChange(p)
                  }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page < totalPages) onPageChange(page + 1)
                }}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
