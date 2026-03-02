'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/page-header'
import { DataTable, type Column } from '@/components/data-table'
import { CreateJobModal } from '@/components/create-job-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getJobs } from '@/lib/actions'
import type { JobWithProgress } from '@/lib/types'
import { useRealtimeInserts } from '@/lib/use-realtime'
import { TableSkeleton } from '@/components/skeletons'
import { ClipboardList } from 'lucide-react'

const PER_PAGE = 20

function paginate<T>(items: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage
  return {
    data: items.slice(start, start + perPage),
    totalPages: Math.ceil(items.length / perPage),
  }
}

function ProgressBar({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-muted-foreground text-xs whitespace-nowrap">{pct}%</span>
    </div>
  )
}

const columns: Column<JobWithProgress>[] = [
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
    key: 'description',
    header: 'Job Description',
    render: (row) => <span className="line-clamp-1">{row.description}</span>,
  },
  {
    key: 'total_quote',
    header: 'Quote',
    className: 'text-right',
    render: (row) => `KES ${Number(row.total_quote).toLocaleString()}`,
  },
  {
    key: 'progress',
    header: 'Payment Progress',
    render: (row) => <ProgressBar paid={row.total_paid} total={Number(row.total_quote)} />,
  },
  {
    key: 'balance',
    header: 'Balance',
    className: 'text-right',
    render: (row) => (
      <span className={row.balance <= 0 ? 'text-green-600' : 'text-destructive'}>
        KES {row.balance.toLocaleString()}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge variant={row.status === 'open' ? 'default' : 'secondary'}>{row.status}</Badge>
    ),
  },
]

export default function JobsPage() {
  const [page, setPage] = useState(1)
  const [jobs, setJobs] = useState<JobWithProgress[]>([])
  const [loading, setLoading] = useState(true)

  const fetchJobs = useCallback(async () => {
    try {
      const data = await getJobs()
      setJobs(data)
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  useRealtimeInserts('jobs', fetchJobs)

  const { data, totalPages } = paginate(jobs, page, PER_PAGE)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Cards"
        subtitle="Track orders, quotes, and payment progress"
        action={
          <CreateJobModal
            trigger={
              <Button>
                <ClipboardList />
                New Job Card
              </Button>
            }
            onSuccess={fetchJobs}
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
          emptyMessage="No job cards yet. Create one or send 'Job <Name> <Amount> <Desc>' via WhatsApp."
        />
      )}
    </div>
  )
}
