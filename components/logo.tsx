import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("text-xl font-bold text-primary", className)}>
      Daftari
    </span>
  )
}
