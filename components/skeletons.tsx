import { cn } from '@/lib/utils'

function Bone({ className }: { className?: string }) {
  return <div className={cn('bg-muted animate-pulse rounded-md', className)} />
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-4">
      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-lg border sm:block">
        <div className="bg-muted/40 flex gap-6 border-b px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Bone key={i} className="h-4 w-24" />
          ))}
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex items-center gap-6 px-4 py-3.5">
              {Array.from({ length: cols }).map((_, c) => (
                <Bone
                  key={c}
                  className={cn('h-4', c === 0 ? 'w-32' : c === cols - 1 ? 'w-20' : 'w-24')}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* Mobile */}
      <div className="flex flex-col gap-2 sm:hidden">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="space-y-2 rounded-xl border p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Bone className="h-2.5 w-12" />
                <Bone className="h-4 w-28" />
              </div>
              <div className="space-y-1.5">
                <Bone className="h-2.5 w-10" />
                <Bone className="h-4 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatCardSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className={cn('grid gap-4', count > 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2')}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-muted/40 relative flex items-center gap-4 overflow-hidden rounded-xl p-4"
        >
          <Bone className="size-10 rounded-lg" />
          <div className="space-y-2">
            <Bone className="h-6 w-28" />
            <Bone className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProfileCardSkeleton() {
  return (
    <div className="rounded-xl border p-6">
      <div className="flex items-center gap-4">
        <Bone className="size-12 rounded-full" />
        <div className="space-y-2">
          <Bone className="h-5 w-32" />
          <Bone className="h-3.5 w-40" />
          <Bone className="h-3 w-28" />
        </div>
      </div>
    </div>
  )
}

export function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Bone className="h-10 w-44 rounded-lg" />
      <div className="space-y-4 rounded-xl border p-6">
        <Bone className="h-6 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <Bone className="mt-0.5 size-4 rounded" />
            <div className="space-y-1.5">
              <Bone className="h-3 w-12" />
              <Bone className="h-4 w-32" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Bone className="mt-0.5 size-4 rounded" />
            <div className="space-y-1.5">
              <Bone className="h-3 w-12" />
              <Bone className="h-4 w-28" />
            </div>
          </div>
        </div>
      </div>
      <StatCardSkeleton count={2} />
      <div className="space-y-2">
        <Bone className="h-6 w-24" />
        <Bone className="h-4 w-32" />
      </div>
      <TableSkeleton rows={3} cols={3} />
    </div>
  )
}

export function FeatureRequestListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <Bone className="h-4 w-48" />
            <Bone className="h-5 w-16 rounded-full" />
          </div>
          <Bone className="h-3.5 w-full" />
          <Bone className="h-3.5 w-3/4" />
          <Bone className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}
