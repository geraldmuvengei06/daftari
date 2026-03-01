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
import { Card, CardContent } from '@/components/ui/card'

export interface Column<T> {
  key: string
  header: string
  className?: string
  /** When true, this column spans the full width in mobile card view */
  fullRow?: boolean
  render: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export function DataTable<T>({
  columns,
  data,
  page,
  totalPages,
  onPageChange,
  onRowClick,
  emptyMessage = 'No data found.',
}: DataTableProps<T>) {
  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
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
                    <TableCell key={col.key} className={col.className}>
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
      <div className="flex flex-col gap-2 sm:hidden">
        {data.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{emptyMessage}</p>
        ) : (
          data.map((row, i) => {
            const gridCols = columns.filter((c) => !c.fullRow)
            const fullRowCols = columns.filter((c) => c.fullRow)
            return (
              <Card
                key={i}
                className={
                  onRowClick ? 'cursor-pointer transition-transform active:scale-[0.98]' : ''
                }
                onClick={() => onRowClick?.(row)}
              >
                <CardContent className="space-y-1.5 px-3 py-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {gridCols.map((col) => (
                      <div key={col.key} className="min-w-0">
                        <p className="text-muted-foreground text-[10px] leading-tight">
                          {col.header}
                        </p>
                        <div className="truncate text-sm font-medium">{col.render(row)}</div>
                      </div>
                    ))}
                  </div>
                  {fullRowCols.map((col) => (
                    <div key={col.key} className="border-t pt-1.5">
                      <p className="text-muted-foreground text-[10px] leading-tight">
                        {col.header}
                      </p>
                      <div className="text-sm">{col.render(row)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
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
