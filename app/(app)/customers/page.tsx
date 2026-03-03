'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { DataTable, type Column, type CardAction } from '@/components/data-table'
import { AddCustomerModal } from '@/components/add-customer-modal'
import { EditCustomerModal } from '@/components/edit-customer-modal'
import { DeleteConfirmModal } from '@/components/delete-confirm-modal'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getCustomers, deleteCustomer } from '@/lib/actions'
import type { CustomerWithBalance, Customer } from '@/lib/types'
import { useRealtimeInserts } from '@/lib/use-realtime'
import { TableSkeleton } from '@/components/skeletons'
import { Plus, MoreHorizontal, Pencil, Trash2, ChevronRight, Phone, User } from 'lucide-react'

function CustomerMobileCard(
  row: CustomerWithBalance,
  actions?: CardAction<CustomerWithBalance>[]
) {
  const hasActivity = row.total_job_quotes > 0 || row.total_paid > 0

  return (
    <div className="bg-card ring-border/50 overflow-hidden rounded-xl shadow-sm ring-1">
      <div className="flex items-center gap-3 p-4">
        <div className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-full">
          <User className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground truncate text-base font-semibold">{row.name}</h3>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-sm">
            <Phone className="size-3.5" />
            <span>{row.phone}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          {!hasActivity ? (
            <span className="text-muted-foreground text-sm">New</span>
          ) : row.balance > 0 ? (
            <>
              <p className="text-destructive text-base font-bold">
                KES {row.balance.toLocaleString()}
              </p>
              <p className="text-destructive/70 text-xs">owes</p>
            </>
          ) : row.balance < 0 ? (
            <>
              <p className="text-base font-bold text-green-600">
                KES {Math.abs(row.balance).toLocaleString()}
              </p>
              <p className="text-xs text-green-600/70">credit</p>
            </>
          ) : (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Settled
            </span>
          )}
        </div>
        <ChevronRight className="text-muted-foreground/50 size-5 shrink-0" />
      </div>
      {actions && actions.length > 0 && (
        <div className="bg-muted/30 flex border-t">
          {actions.map((action, idx) => (
            <button
              key={action.type}
              onClick={(e) => {
                e.stopPropagation()
                action.onClick(row)
              }}
              className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors active:bg-muted ${
                action.type === 'delete'
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'text-foreground hover:bg-muted'
              } ${idx > 0 ? 'border-l' : ''}`}
            >
              {action.type === 'edit' ? (
                <>
                  <Pencil className="size-4" />
                  Edit
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const PER_PAGE = 20

function paginate<T>(items: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage
  return {
    data: items.slice(start, start + perPage),
    totalPages: Math.ceil(items.length / perPage),
  }
}

export default function CustomersPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)

  const fetchCustomers = useCallback(async () => {
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useRealtimeInserts('customers', fetchCustomers)

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers
    const query = search.toLowerCase()
    return customers.filter(
      (c) => c.name.toLowerCase().includes(query) || c.phone.toLowerCase().includes(query)
    )
  }, [customers, search])

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1)
  }, [search])

  const handleDelete = async () => {
    if (!deletingCustomer) return
    await deleteCustomer(deletingCustomer.id)
    fetchCustomers()
  }

  const columns: Column<CustomerWithBalance>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="text-primary font-medium">{row.name}</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => row.phone,
    },
    {
      key: 'balance',
      header: 'Balance',
      className: 'text-right',
      render: (row) => {
        if (row.total_job_quotes === 0 && row.total_paid === 0) {
          return <span className="text-muted-foreground">—</span>
        }
        if (row.balance > 0) {
          return <span className="text-destructive">KES {row.balance.toLocaleString()}</span>
        }
        if (row.balance < 0) {
          return (
            <span className="text-green-600">
              Credit KES {Math.abs(row.balance).toLocaleString()}
            </span>
          )
        }
        return <span className="text-green-600">Settled</span>
      },
    },
    {
      key: 'created_at',
      header: 'Added On',
      className: 'hidden sm:table-cell',
      render: (row) =>
        new Date(row.created_at).toLocaleDateString('en-KE', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
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
                setEditingCustomer(row)
              }}
            >
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setDeletingCustomer(row)
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

  const { data, totalPages } = paginate(filteredCustomers, page, PER_PAGE)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Manage your customer records"
        action={
          <AddCustomerModal
            trigger={
              <Button>
                <Plus />
                Add Customer
              </Button>
            }
            onSuccess={fetchCustomers}
          />
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name or phone..."
      />

      {loading ? (
        <TableSkeleton rows={8} cols={3} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRowClick={(row) => router.push(`/customers/${row.id}`)}
          cardActions={[
            { type: 'edit', onClick: (row) => setEditingCustomer(row) },
            { type: 'delete', onClick: (row) => setDeletingCustomer(row) },
          ]}
          mobileCard={(row, actions) => CustomerMobileCard(row, actions)}
        />
      )}

      <EditCustomerModal
        customer={editingCustomer}
        open={!!editingCustomer}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        onSuccess={fetchCustomers}
      />

      <DeleteConfirmModal
        open={!!deletingCustomer}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        title="Delete Customer"
        description="This action cannot be undone. This will permanently delete this customer and all associated data."
        onConfirm={handleDelete}
      />
    </div>
  )
}
