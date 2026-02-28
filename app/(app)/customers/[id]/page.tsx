"use client"

import { use, useState, useEffect, useCallback } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { DataTable, type Column } from "@/components/data-table"
import { RecordPaymentModal } from "@/components/record-payment-modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCustomerById, getTransactionsByCustomerId, getCustomerTotals } from "@/lib/actions"
import type { Customer, Transaction } from "@/lib/types"
import { ArrowLeft, CreditCard, Phone, Calendar } from "lucide-react"
import { StatCard } from "@/components/stat-card"
import { TruncatedText } from "@/components/truncated-text"
import { CustomerDetailSkeleton } from "@/components/skeletons"
import { TrendingUp, TrendingDown } from "lucide-react"

const PER_PAGE = 5

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

const paymentColumns: Column<Transaction>[] = [
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
    key: "raw_text",
    header: "Message Content",
    className: "hidden md:table-cell",
    fullRow: true,
    render: (row) => <TruncatedText text={row.raw_text ?? ""} title="Message Content" />,
  },
  {
    key: "created_at",
    header: "Added On",
    className: "hidden sm:table-cell",
    fullRow: true,
    render: (row) => formatDateTime(row.created_at),
  },
]

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totals, setTotals] = useState({ totalPaid: 0, totalPaidOut: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [notFoundState, setNotFoundState] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const c = await getCustomerById(id)
      if (!c) { setNotFoundState(true); return }
      setCustomer(c)
      const [txns, t] = await Promise.all([
        getTransactionsByCustomerId(id),
        getCustomerTotals(id),
      ])
      setTransactions(txns)
      setTotals(t)
    } catch (err) {
      console.error("Failed to load customer:", err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  if (notFoundState) return notFound()
  if (loading || !customer) {
    return <CustomerDetailSkeleton />
  }

  const { data, totalPages } = paginate(transactions, page, PER_PAGE)

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
            <KycField icon={<Calendar className="size-4" />} label="Joined" value={formatDateTime(customer.created_at)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total Paid" value={`KES ${totals.totalPaid.toLocaleString()}`} icon={TrendingUp} variant="primary" />
        <StatCard label="Total Paid Out" value={`KES ${totals.totalPaidOut.toLocaleString()}`} icon={TrendingDown} variant="destructive" />
      </div>

      <PageHeader
        title="Payments"
        subtitle={`${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`}
        action={
          <RecordPaymentModal
            customerId={customer.id}
            trigger={
              <Button>
                <CreditCard />
                Record Payment
              </Button>
            }
            onSuccess={fetchData}
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
