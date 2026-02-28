"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { DataTable, type Column } from "@/components/data-table"
import { AddCustomerModal } from "@/components/add-customer-modal"
import { Button } from "@/components/ui/button"
import { getCustomers } from "@/lib/actions"
import type { CustomerWithBalance } from "@/lib/types"
import { useRealtimeInserts } from "@/lib/use-realtime"
import { TableSkeleton } from "@/components/skeletons"
import { Plus } from "lucide-react"

const PER_PAGE = 8

function paginate<T>(items: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage
  return {
    data: items.slice(start, start + perPage),
    totalPages: Math.ceil(items.length / perPage),
  }
}

const columns: Column<CustomerWithBalance>[] = [
  {
    key: "name",
    header: "Name",
    render: (row) => (
      <span className="font-medium text-primary">{row.name}</span>
    ),
  },
  {
    key: "phone",
    header: "Phone",
    render: (row) => row.phone,
  },
  {
    key: "balance",
    header: "Balance",
    className: "text-right",
    render: (row) => {
      if (row.total_job_quotes === 0 && row.total_paid === 0) {
        return <span className="text-muted-foreground">—</span>
      }
      if (row.balance > 0) {
        return <span className="text-destructive">Owes KES {row.balance.toLocaleString()}</span>
      }
      if (row.balance < 0) {
        return <span className="text-green-600">Credit KES {Math.abs(row.balance).toLocaleString()}</span>
      }
      return <span className="text-green-600">Settled</span>
    },
  },
  {
    key: "created_at",
    header: "Added On",
    className: "hidden sm:table-cell",
    render: (row) =>
      new Date(row.created_at).toLocaleDateString("en-KE", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
  },
]

export default function CustomersPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCustomers = useCallback(async () => {
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (err) {
      console.error("Failed to fetch customers:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Realtime: auto-refresh when new customers are added
  useRealtimeInserts("customers", fetchCustomers)

  const { data, totalPages } = paginate(customers, page, PER_PAGE)

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
        />
      )}
    </div>
  )
}
