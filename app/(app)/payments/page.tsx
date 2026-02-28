"use client"

import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/page-header"
import { DataTable, type Column } from "@/components/data-table"
import { RecordPaymentModal } from "@/components/record-payment-modal"
import { TruncatedText } from "@/components/truncated-text"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getTransactions } from "@/lib/actions"
import type { TransactionWithCustomer } from "@/lib/types"
import { TableSkeleton } from "@/components/skeletons"
import { CreditCard } from "lucide-react"

const PER_PAGE = 8

function paginate<T>(items: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage
  return {
    data: items.slice(start, start + perPage),
    totalPages: Math.ceil(items.length / perPage),
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-KE", {
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  })
}

const columns: Column<TransactionWithCustomer>[] = [
  {
    key: "customer",
    header: "Customer",
    render: (row) => (
      <Link
        href={`/customers/${row.customer_id}`}
        className="font-medium text-primary underline-offset-2 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.customers.name}
      </Link>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    className: "text-right",
    render: (row) => (
      <span className={row.type === "credit" ? "text-primary" : "text-destructive"}>
        {row.type === "credit" ? "+" : "-"} KES {Number(row.amount).toLocaleString()}
      </span>
    ),
  },
  {
    key: "type",
    header: "Type",
    render: (row) => (
      <Badge variant={row.type === "credit" ? "default" : "destructive"}>
        {row.type}
      </Badge>
    ),
  },
  {
    key: "transaction_date",
    header: "Transaction Date",
    render: (row) => formatDateTime(row.transaction_date),
  },
  {
    key: "phone",
    header: "Phone",
    className: "hidden sm:table-cell",
    render: (row) => row.customers.phone,
  },
  {
    key: "raw_text",
    header: "Message Content",
    className: "hidden lg:table-cell",
    fullRow: true,
    render: (row) => <TruncatedText text={row.raw_text ?? ""} title="Message Content" />,
  },
  {
    key: "created_at",
    header: "Added On",
    className: "hidden lg:table-cell",
    fullRow: true,
    render: (row) => formatDateTime(row.created_at),
  },
]

export default function PaymentsPage() {
  const [page, setPage] = useState(1)
  const [transactions, setTransactions] = useState<TransactionWithCustomer[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = useCallback(async () => {
    try {
      const data = await getTransactions()
      setTransactions(data)
    } catch (err) {
      console.error("Failed to fetch transactions:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const { data, totalPages } = paginate(transactions, page, PER_PAGE)

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
      {loading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
