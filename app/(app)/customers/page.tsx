"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { DataTable, type Column } from "@/components/data-table"
import { AddCustomerModal } from "@/components/add-customer-modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { customers, payments, paginate, getCustomerTotals, type Customer } from "@/lib/mock-data"
import { Plus } from "lucide-react"

const PER_PAGE = 8

const columns: Column<Customer>[] = [
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
    key: "totalPaid",
    header: "Total Paid",
    className: "text-right",
    render: (row) => {
      const { totalPaid } = getCustomerTotals(row.id)
      return <span className="text-primary">KES {totalPaid.toLocaleString()}</span>
    },
  },
  {
    key: "totalPaidOut",
    header: "Total Paid Out",
    className: "text-right",
    render: (row) => {
      const { totalPaidOut } = getCustomerTotals(row.id)
      return <span className="text-destructive">KES {totalPaidOut.toLocaleString()}</span>
    },
  },
  {
    key: "createdAt",
    header: "Added On",
    className: "hidden sm:table-cell",
    render: (row) => row.createdAt,
  },
]

export default function CustomersPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
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
          />
        }
      />
      <DataTable
        columns={columns}
        data={data}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/customers/${row.id}`)}
      />
    </div>
  )
}
