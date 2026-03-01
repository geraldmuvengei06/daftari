import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return <span className={cn('text-primary text-xl font-bold', className)}>Daftari</span>
}
