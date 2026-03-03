import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('text-xl font-bold', className)}>
      <span className="text-primary">Daftari</span>
      <span className="bg-linear-to-r from-emerald-400 via-lime-500 to-teal-500 bg-clip-text text-transparent">
        AI
      </span>
    </span>
  )
}
