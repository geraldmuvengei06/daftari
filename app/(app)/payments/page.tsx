'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/page-header'
import { DataTable, type Column } from '@/components/data-table'
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
import { CreditCard, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

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
        <Badge variant={row.type === 'credit' ? 'default' : 'destructive'}>{row.type}</Badge>
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
