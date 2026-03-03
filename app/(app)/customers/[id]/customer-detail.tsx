'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { DataTable, type Column, type CardAction } from '@/components/data-table'
import { RecordPaymentModal } from '@/components/record-payment-modal'
import { EditPaymentModal } from '@/components/edit-payment-modal'
import { EditJobModal } from '@/components/edit-job-modal'
import { EditCustomerModal } from '@/components/edit-customer-modal'
import { DeleteConfirmModal } from '@/components/delete-confirm-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getCustomerPageData,
  deleteTransaction,
  deleteJob,
  deleteCustomer,
} from '@/lib/actions'
import type { Transaction, Job } from '@/lib/types'
import {
  ArrowLeft,
  CreditCard,
  Phone,
  Calendar,
  ClipboardList,
  Wallet,
  MoreHorizontal,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react'
import { StatCard } from '@/components/stat-card'
import { TruncatedText } from '@/components/truncated-text'
import { useRealtimeInserts } from '@/lib/use-realtime'
import { CreateJobModal } from '@/components/create-job-modal'
import { useRouter } from 'next/navigation'

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

function TransactionMobileCard(row: Transaction, actions?: CardAction<Transaction>[]) {
  const isCredit = row.type === 'credit'

  return (
    <div className="bg-card overflow-hidden rounded-xl shadow-sm">
      <div className="flex items-center gap-3 p-4">
        {/* Transaction type icon */}
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
            isCredit ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
          }`}
        >
          {isCredit ? (
            <ArrowDownLeft className="size-5" strokeWidth={2.5} />
          ) : (
            <ArrowUpRight className="size-5" strokeWidth={2.5} />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <Badge variant={isCredit ? 'default' : 'destructive'} className="mb-1 text-[10px] uppercase">
            {isCredit ? 'Paid' : 'Paid Out'}
          </Badge>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Calendar className="size-3" />
            <span>{formatShortDate(row.transaction_date)}</span>
          </div>
        </div>

        {/* Amount */}
        <div className="shrink-0 text-right">
          <p className={`text-lg font-bold ${isCredit ? 'text-primary' : 'text-destructive'}`}>
            KES {Number(row.amount).toLocaleString()}
          </p>
        </div>
      </div>

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

type PageData = NonNullable<Awaited<ReturnType<typeof getCustomerPageData>>>

export function CustomerDetail({ id, initialData }: { id: string; initialData: PageData }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [page, setPage] = useState(1)

  // Edit/Delete state
  const [editingCustomer, setEditingCustomer] = useState(false)
  const [deletingCustomer, setDeletingCustomer] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [deletingJob, setDeletingJob] = useState<Job | null>(null)

  const { customer, transactions, jobs, totals } = data

  const refresh = useCallback(async () => {
    const fresh = await getCustomerPageData(id)
    if (fresh) setData(fresh)
  }, [id])

  useRealtimeInserts('transactions', refresh, 'customer_id', id)

  const handleDeleteTransaction = async () => {
    if (!deletingTransaction) return
    await deleteTransaction(deletingTransaction.id)
    refresh()
  }

  const handleDeleteJob = async () => {
    if (!deletingJob) return
    await deleteJob(deletingJob.id)
    refresh()
  }

  const handleDeleteCustomer = async () => {
    await deleteCustomer(customer.id)
    router.push('/customers')
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
            <DropdownMenuItem onClick={() => setEditingTransaction(row)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeletingTransaction(row)}
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

  const { data: txPage, totalPages } = paginate(transactions, page, PER_PAGE)

  return (
    <div className="space-y-6">
      <Link href="/customers" className="inline-flex">
        <Button variant="outline" size="lg">
          <ArrowLeft />
          Back to Customers
        </Button>
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{customer.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Customer actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingCustomer(true)}>
                <Pencil className="mr-2 size-4" />
                Edit Customer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeletingCustomer(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete Customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            totals.balance > 0 ? 'Balance Due' : totals.balance < 0 ? 'Overpaid' : 'Balance'
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

      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="jobs" className="flex-1 sm:flex-initial">
            <ClipboardList className="size-4" />
            <span className="hidden xs:inline">Job Cards</span>
            <span className="xs:hidden">Jobs</span>
            <span className="text-muted-foreground ml-1">({jobs.length})</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 sm:flex-initial">
            <CreditCard className="size-4" />
            Payments
            <span className="text-muted-foreground ml-1">({transactions.length})</span>
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
                onSuccess={refresh}
              />
            </div>
            {jobs.length > 0 && (
              <div className="grid gap-3">
                {jobs.map((job) => {
                  const pct =
                    Number(job.total_quote) > 0
                      ? Math.min(100, Math.round((job.total_paid / Number(job.total_quote)) * 100))
                      : 0
                  const isComplete = pct >= 100
                  const balance = job.balance
                  return (
                    <div
                      key={job.id}
                      className="bg-card overflow-hidden rounded-xl shadow-sm"
                    >
                      {/* Card Body */}
                      <div className="space-y-3 p-4">
                        {/* Job Description Header */}
                        <div>
                          <p className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wide">
                            Job Description
                          </p>
                          <p className="text-foreground text-sm font-medium leading-snug">
                            {job.description}
                          </p>
                        </div>

                        {/* Financial Breakdown */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                              Quote
                            </p>
                            <p className="text-foreground text-sm font-semibold">
                              KES {Number(job.total_quote).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                              Paid
                            </p>
                            <p className="text-sm font-semibold text-green-600">
                              KES {job.total_paid.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                              Balance
                            </p>
                            <p className={`text-sm font-semibold ${balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                              KES {balance.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-2">
                          <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                            <div
                              className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-primary'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${isComplete ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {pct}%
                          </span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="flex items-center justify-end gap-2 border-t px-4 py-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingJob(job)}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeletingJob(job)}
                          aria-label="Delete"
                        >
                          <Trash2 className="text-muted-foreground size-4" />
                        </Button>
                      </div>
                    </div>
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
                onSuccess={refresh}
              />
            </div>
            <DataTable
              columns={paymentColumns}
              data={txPage}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              emptyMessage="No payments recorded yet."
              cardActions={[
                { type: 'edit', onClick: (row) => setEditingTransaction(row) },
                { type: 'delete', onClick: (row) => setDeletingTransaction(row) },
              ]}
              mobileCard={(row, actions) => TransactionMobileCard(row, actions)}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit/Delete Modals */}
      <EditCustomerModal
        customer={editingCustomer ? customer : null}
        open={editingCustomer}
        onOpenChange={setEditingCustomer}
        onSuccess={refresh}
      />

      <DeleteConfirmModal
        open={deletingCustomer}
        onOpenChange={setDeletingCustomer}
        title="Delete Customer"
        description="This action cannot be undone. This will permanently delete this customer and all associated jobs and payments."
        onConfirm={handleDeleteCustomer}
      />

      <EditPaymentModal
        transaction={editingTransaction}
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        onSuccess={refresh}
      />

      <DeleteConfirmModal
        open={!!deletingTransaction}
        onOpenChange={(open) => !open && setDeletingTransaction(null)}
        title="Delete Payment"
        description="This action cannot be undone. This will permanently delete this payment record."
        onConfirm={handleDeleteTransaction}
      />

      <EditJobModal
        job={editingJob}
        open={!!editingJob}
        onOpenChange={(open) => !open && setEditingJob(null)}
        onSuccess={refresh}
      />

      <DeleteConfirmModal
        open={!!deletingJob}
        onOpenChange={(open) => !open && setDeletingJob(null)}
        title="Delete Job Card"
        description="This action cannot be undone. This will permanently delete this job card."
        onConfirm={handleDeleteJob}
      />
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
