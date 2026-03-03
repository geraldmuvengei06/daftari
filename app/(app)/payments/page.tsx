'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/page-header'
import { DataTable, type Column, type CardAction } from '@/components/data-table'
import { RecordPaymentModal } from '@/components/record-payment-modal'
import { EditPaymentModal } from '@/components/edit-payment-modal'
import { DeleteConfirmModal } from '@/components/delete-confirm-modal'
import { SearchInput } from '@/components/search-input'
import { TruncatedText } from '@/components/truncated-text'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getTransactions, deleteTransaction } from '@/lib/actions'
import type { TransactionWithCustomer, Transaction } from '@/lib/types'
import { useRealtimeInserts } from '@/lib/use-realtime'
import { TableSkeleton } from '@/components/skeletons'
import {
  CreditCard,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Calendar,
} from 'lucide-react'

const PER_PAGE = 20

function paginate<T>(items: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage
  return {
    data: items.slice(start, start + perPage),
    totalPages: Math.ceil(items.length / perPage),
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function PaymentMobileCard(
  row: TransactionWithCustomer,
  actions?: CardAction<TransactionWithCustomer>[]
) {
  const isCredit = row.type === 'credit'

  return (
    <div className="bg-card overflow-hidden rounded-xl shadow-sm">
      {/* Card Body */}
      <div className="flex items-center gap-3 p-4">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-full ${
            isCredit ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
          }`}
        >
          {isCredit ? (
            <ArrowDownLeft className="size-5" strokeWidth={2.5} />
          ) : (
            <ArrowUpRight className="size-5" strokeWidth={2.5} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge
              variant={isCredit ? 'default' : 'destructive'}
              className="text-[10px] uppercase"
            >
              {isCredit ? 'Paid' : 'Paid Out'}
            </Badge>
          </div>
          <Link
            href={`/customers/${row.customer_id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 hover:underline"
          >
            <User className="text-muted-foreground size-3.5" />
            <span className="text-primary truncate text-sm font-medium">
              {row.customers.name}
            </span>
          </Link>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
            <Calendar className="size-3" />
            <span>{formatShortDate(row.transaction_date)}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-lg font-bold ${isCredit ? 'text-primary' : 'text-destructive'}`}>
            KES {Number(row.amount).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Message with expandable text */}
      {row.raw_text && (
        <div className="px-4 pb-3">
          <p className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wide">
            Message
          </p>
          <div className="text-foreground text-sm">
            <TruncatedText text={row.raw_text} maxLength={60} title="Message Content" />
          </div>
        </div>
      )}

      {/* Card Footer */}
      {actions && actions.length > 0 && (
        <div className="flex items-center justify-end gap-2 border-t px-4 py-2">
          {actions.filter(a => a.type === 'edit').map((action) => (
            <Button
              key={action.type}
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                action.onClick(row)
              }}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          ))}
          {actions.filter(a => a.type === 'delete').map((action) => (
            <Button
              key={action.type}
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation()
                action.onClick(row)
              }}
              aria-label="Delete"
            >
              <Trash2 className="text-muted-foreground size-4" />
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PaymentsPage() {
  const [page, setPage] = useState(1)
  const [transactions, setTransactions] = useState<TransactionWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)

  const fetchTransactions = useCallback(async () => {
    try {
      const data = await getTransactions()
      setTransactions(data)
    } catch (err) {
      console.error('Failed to fetch transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useRealtimeInserts('transactions', fetchTransactions)

  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions
    const query = search.toLowerCase()
    return transactions.filter(
      (t) =>
        t.customers.name.toLowerCase().includes(query) ||
        t.customers.phone.toLowerCase().includes(query) ||
        t.mpesa_code?.toLowerCase().includes(query) ||
        t.raw_text?.toLowerCase().includes(query)
    )
  }, [transactions, search])

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1)
  }, [search])

  const handleDelete = async () => {
    if (!deletingTransaction) return
    await deleteTransaction(deletingTransaction.id)
    fetchTransactions()
  }

  const columns: Column<TransactionWithCustomer>[] = [
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => (
        <Link
          href={`/customers/${row.customer_id}`}
          className="text-primary font-medium underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.customers.name}
        </Link>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right',
      render: (row) => (
        <span className={row.type === 'credit' ? 'text-primary' : 'text-destructive'}>
          {row.type === 'credit' ? '+' : '-'} KES {Number(row.amount).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <Badge variant={row.type === 'credit' ? 'default' : 'destructive'}>
          {row.type === 'credit' ? 'Paid' : 'Paid Out'}
        </Badge>
      ),
    },
    {
      key: 'transaction_date',
      header: 'Transaction Date',
      render: (row) => formatDateTime(row.transaction_date),
    },
    {
      key: 'phone',
      header: 'Phone',
      className: 'hidden sm:table-cell',
      render: (row) => row.customers.phone,
    },
    {
      key: 'raw_text',
      header: 'Message Content',
      className: 'hidden lg:table-cell',
      fullRow: true,
      render: (row) => <TruncatedText text={row.raw_text ?? ''} title="Message Content" />,
    },
    {
      key: 'created_at',
      header: 'Added On',
      className: 'hidden lg:table-cell',
      fullRow: true,
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      hideOnMobile: true,
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => e.stopPropagation()}
              aria-label="Actions"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setEditingTransaction(row)
              }}
            >
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setDeletingTransaction(row)
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const { data, totalPages } = paginate(filteredTransactions, page, PER_PAGE)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        subtitle="Track all payment transactions"
        action={
          <RecordPaymentModal
            trigger={
              <Button>
                <CreditCard />
                Record Payment
              </Button>
            }
            onSuccess={fetchTransactions}
          />
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by customer, phone, or M-Pesa code..."
      />

      {loading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          cardActions={[
            { type: 'edit', onClick: (row) => setEditingTransaction(row) },
            { type: 'delete', onClick: (row) => setDeletingTransaction(row) },
          ]}
          mobileCard={(row, actions) => PaymentMobileCard(row, actions)}
        />
      )}

      <EditPaymentModal
        transaction={editingTransaction}
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        onSuccess={fetchTransactions}
      />

      <DeleteConfirmModal
        open={!!deletingTransaction}
        onOpenChange={(open) => !open && setDeletingTransaction(null)}
        title="Delete Payment"
        description="This action cannot be undone. This will permanently delete this payment record."
        onConfirm={handleDelete}
      />
    </div>
  )
}
