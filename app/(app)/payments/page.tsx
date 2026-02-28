"use client"

import Link from "next/link"
import { useState } from "react"
import { PageHeader } from "@/components/page-header"
import { DataTable, type Column } from "@/components/data-table"
import { RecordPaymentModal } from "@/components/record-payment-modal"
import { TruncatedText } from "@/components/truncated-text"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { payments, paginate, formatDateTime, type Payment } from "@/lib/mock-data"
import { CreditCard } from "lucide-react"

const PER_PAGE = 8

const columns: Column<Payment>[] = [
  {
    key: "customer",
    header: "Customer",
    render: (row) => (
      <Link
        href={`/customers/${row.customerId}`}
        className="font-medium text-primary underline-offset-2 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.customerName}
      </Link>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    className: "text-right",
    render: (row) => (
      <span className={row.type === "credit" ? "text-primary" : "text-destructive"}>
        {row.type === "credit" ? "+" : "-"} KES {row.amount.toLocaleString()}
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
    key: "date",
    header: "Transaction Date",
    render: (row) => formatDateTime(row.date),
  },
  {
    key: "phone",
    header: "Phone",
    className: "hidden sm:table-cell",
    render: (row) => row.customerPhone,
  },
  {
    key: "rawText",
    header: "Message Content",
    className: "hidden lg:table-cell",
    fullRow: true,
    render: (row) => <TruncatedText text={row.rawText} title="Message Content" />,
  },
  {
    key: "createdAt",
    header: "Added On",
    className: "hidden lg:table-cell",
    fullRow: true,
    render: (row) => formatDateTime(row.createdAt),
  },
]

export default function PaymentsPage() {
  const [page, setPage] = useState(1)
  const { data, totalPages } = paginate(payments, page, PER_PAGE)

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
          />
        }
      />
      <DataTable
        columns={columns}
        data={data}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  )
}
