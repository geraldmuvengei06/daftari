'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DataTable, type Column } from '@/components/data-table'
import { RecordPaymentModal } from '@/components/record-payment-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getCustomerById,
  getTransactionsByCustomerId,
  getCustomerTotals,
  getJobsByCustomerId,
} from '@/lib/actions'
import type { Customer, Transaction, JobWithProgress } from '@/lib/types'
import { ArrowLeft, CreditCard, Phone, Calendar, ClipboardList, Wallet } from 'lucide-react'
import { StatCard } from '@/components/stat-card'
import { TruncatedText } from '@/components/truncated-text'
import { CustomerDetailSkeleton } from '@/components/skeletons'
import { useRealtimeInserts } from '@/lib/use-realtime'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { CreateJobModal } from '@/components/create-job-modal'

const PER_PAGE = 5

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

const paymentColumns: Column<Transaction>[] = [
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
    key: 'raw_text',
    header: 'Message Content',
    className: 'hidden md:table-cell',
    fullRow: true,
    render: (row) => <TruncatedText text={row.raw_text ?? ''} title="Message Content" />,
  },
  {
    key: 'created_at',
    header: 'Added On',
    className: 'hidden sm:table-cell',
    fullRow: true,
    render: (row) => formatDateTime(row.created_at),
  },
]

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [jobs, setJobs] = useState<JobWithProgress[]>([])
  const [totals, setTotals] = useState({
    totalPaid: 0,
    totalPaidOut: 0,
    totalJobQuotes: 0,
    balance: 0,
  })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [notFoundState, setNotFoundState] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const c = await getCustomerById(id)
      if (!c) {
        setNotFoundState(true)
        return
      }
      setCustomer(c)
      const [txns, t, j] = await Promise.all([
        getTransactionsByCustomerId(id),
        getCustomerTotals(id),
        getJobsByCustomerId(id),
      ])
      setTransactions(txns)
      setTotals(t)
      setJobs(j)
    } catch (err) {
      console.error('Failed to load customer:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])
  useRealtimeInserts('transactions', fetchData, 'customer_id', id)

  if (notFoundState) return notFound()
  if (loading || !customer) return <CustomerDetailSkeleton />

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
            <KycField
              icon={<Calendar className="size-4" />}
              label="Joined"
              value={formatDateTime(customer.created_at)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Paid"
          value={`KES ${totals.totalPaid.toLocaleString()}`}
          icon={TrendingUp}
          variant="primary"
        />
        <StatCard
          label="Total Paid Out"
          value={`KES ${totals.totalPaidOut.toLocaleString()}`}
          icon={TrendingDown}
          variant="destructive"
        />
        <StatCard
          label={
            totals.balance > 0 ? 'Owes You' : totals.balance < 0 ? 'Credit Balance' : 'Balance'
          }
          value={
            totals.balance === 0 && totals.totalJobQuotes === 0
              ? '—'
              : `KES ${Math.abs(totals.balance).toLocaleString()}`
          }
          icon={Wallet}
          variant={totals.balance > 0 ? 'destructive' : totals.balance < 0 ? 'primary' : 'muted'}
        />
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">
            <ClipboardList className="size-4" />
            Job Cards ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="size-4" />
            Payments ({transactions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {jobs.length === 0
                  ? 'No job cards yet'
                  : `${jobs.filter((j) => j.status === 'open').length} open, ${jobs.filter((j) => j.status === 'closed').length} closed`}
              </p>
              <CreateJobModal
                customerId={customer.id}
                trigger={
                  <Button variant="outline" size="sm">
                    <ClipboardList />
                    New Job
                  </Button>
                }
                onSuccess={fetchData}
              />
            </div>
            {jobs.length > 0 && (
              <div className="grid gap-3">
                {jobs.map((job) => {
                  const pct =
                    Number(job.total_quote) > 0
                      ? Math.min(100, Math.round((job.total_paid / Number(job.total_quote)) * 100))
                      : 0
                  return (
                    <Card key={job.id}>
                      <CardContent className="space-y-2 px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{job.description}</p>
                            <p className="text-muted-foreground text-xs">
                              Quote: KES {Number(job.total_quote).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                            {job.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground text-xs whitespace-nowrap">
                            KES {job.total_paid.toLocaleString()} /{' '}
                            {Number(job.total_quote).toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        {job.balance > 0 && (
                          <p className="text-destructive text-xs">
                            Balance: KES {job.balance.toLocaleString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </p>
              <RecordPaymentModal
                customerId={customer.id}
                trigger={
                  <Button size="sm">
                    <CreditCard />
                    Record Payment
                  </Button>
                }
                onSuccess={fetchData}
              />
            </div>
            <DataTable
              columns={paymentColumns}
              data={data}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              emptyMessage="No payments recorded yet."
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function KycField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
