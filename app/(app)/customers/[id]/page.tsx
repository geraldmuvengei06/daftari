"use client"

import { use, useState } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { DataTable, type Column } from "@/components/data-table"
import { RecordPaymentModal } from "@/components/record-payment-modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getCustomerById,
  getPaymentsByCustomerId,
  getCustomerTotals,
  paginate,
  formatDateTime,
  type Payment,
} from "@/lib/mock-data"
import { ArrowLeft, CreditCard, Phone, Calendar } from "lucide-react"
import { StatCard } from "@/components/stat-card"
import { TruncatedText } from "@/components/truncated-text"
import { TrendingUp, TrendingDown } from "lucide-react"

const PER_PAGE = 5

const paymentColumns: Column<Payment>[] = [
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
    key: "rawText",
    header: "Message Content",
    className: "hidden md:table-cell",
    fullRow: true,
    render: (row) => <TruncatedText text={row.rawText} title="Message Content" />,
  },
  {
    key: "createdAt",
    header: "Added On",
    className: "hidden sm:table-cell",
    fullRow: true,
    render: (row) => formatDateTime(row.createdAt),
  },
]

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const customer = getCustomerById(id)
  const [page, setPage] = useState(1)

  if (!customer) return notFound()

  const allPayments = getPaymentsByCustomerId(customer.id)
  const { totalPaid, totalPaidOut } = getCustomerTotals(customer.id)
  const { data, totalPages } = paginate(allPayments, page, PER_PAGE)

  return (
    <div className="space-y-6">
      <Link href="/customers" className="inline-flex">
        <Button variant="outline" size="lg">
          <ArrowLeft />
          Back to Customers
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{customer.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <KycField icon={<Phone className="size-4" />} label="Phone" value={customer.phone} />
            <KycField icon={<Calendar className="size-4" />} label="Joined" value={customer.createdAt} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total Paid" value={`KES ${totalPaid.toLocaleString()}`} icon={TrendingUp} variant="primary" />
        <StatCard label="Total Paid Out" value={`KES ${totalPaidOut.toLocaleString()}`} icon={TrendingDown} variant="destructive" />
      </div>

      <PageHeader
        title="Payments"
        subtitle={`${allPayments.length} transaction${allPayments.length !== 1 ? "s" : ""}`}
        action={
          <RecordPaymentModal
            customerId={customer.id}
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
        columns={paymentColumns}
        data={data}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="No payments recorded yet."
      />
    </div>
  )
}

function KycField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
