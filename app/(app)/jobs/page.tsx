'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/page-header'
import { DataTable, type Column } from '@/components/data-table'
import { CreateJobModal } from '@/components/create-job-modal'
import { EditJobModal } from '@/components/edit-job-modal'
import { DeleteConfirmModal } from '@/components/delete-confirm-modal'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getJobs, deleteJob } from '@/lib/actions'
import type { JobWithProgress, Job } from '@/lib/types'
import { useRealtimeInserts } from '@/lib/use-realtime'
import { TableSkeleton } from '@/components/skeletons'
import { ClipboardList, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

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

export default function JobsPage() {
  const [page, setPage] = useState(1)
  const [jobs, setJobs] = useState<JobWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [deletingJob, setDeletingJob] = useState<Job | null>(null)

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

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs
    const query = search.toLowerCase()
    return jobs.filter(
      (j) =>
        j.description.toLowerCase().includes(query) ||
        j.customers.name.toLowerCase().includes(query) ||
        j.customers.phone.toLowerCase().includes(query)
    )
  }, [jobs, search])

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1)
  }, [search])

  const handleDelete = async () => {
    if (!deletingJob) return
    await deleteJob(deletingJob.id)
    fetchJobs()
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
                setEditingJob(row)
              }}
            >
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setDeletingJob(row)
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

  const { data, totalPages } = paginate(filteredJobs, page, PER_PAGE)

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

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by customer or description..."
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
          cardActions={[
            { type: 'edit', onClick: (row) => setEditingJob(row) },
            { type: 'delete', onClick: (row) => setDeletingJob(row) },
          ]}
        />
      )}

      <EditJobModal
        job={editingJob}
        open={!!editingJob}
        onOpenChange={(open) => !open && setEditingJob(null)}
        onSuccess={fetchJobs}
      />

      <DeleteConfirmModal
        open={!!deletingJob}
        onOpenChange={(open) => !open && setDeletingJob(null)}
        title="Delete Job Card"
        description="This action cannot be undone. This will permanently delete this job card."
        onConfirm={handleDelete}
      />
    </div>
  )
}
