import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  variant?: 'primary' | 'destructive' | 'muted'
}

const styles = {
  primary: {
    bg: 'bg-linear-to-r from-primary/10 to-transparent',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    watermark: 'text-primary/10',
    value: 'text-primary',
    label: 'text-primary/60',
  },
  destructive: {
    bg: 'bg-linear-to-r from-destructive/10 to-transparent',
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    watermark: 'text-destructive/10',
    value: 'text-destructive',
    label: 'text-destructive/70',
  },
  muted: {
    bg: 'bg-linear-to-r from-muted to-transparent',
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    watermark: 'text-muted-foreground/10',
    value: 'text-foreground',
    label: 'text-muted-foreground',
  },
}

export function StatCard({ label, value, icon: Icon, variant = 'muted' }: StatCardProps) {
  const s = styles[variant]
  return (
    <div className={`bg-card relative flex items-center gap-4 overflow-hidden rounded-xl p-4 ${s.bg}`}>
      <Icon className={`absolute -right-3 -bottom-3 size-24 ${s.watermark}`} />
      <div className={`flex size-10 items-center justify-center rounded-lg ${s.iconBg}`}>
        <Icon className={`size-5 ${s.iconColor}`} />
      </div>
      <div className="relative">
        <p className={`text-2xl font-semibold ${s.value}`}>{value}</p>
        <p className={`text-xs ${s.label}`}>{label}</p>
      </div>
    </div>
  )
}
