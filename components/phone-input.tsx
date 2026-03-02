'use client'

import { Input } from '@/components/ui/input'
import { Phone } from 'lucide-react'

interface PhoneInputProps {
  id?: string
  value: string
  onChange: (raw: string) => void
  'aria-invalid'?: boolean
  placeholder?: string
  autoFocus?: boolean
}

/**
 * Formats a raw digit string into +254 7XX XXX XXX display format.
 * Stores the raw value as +254XXXXXXXXX for submission.
 */
function formatKenyanPhone(raw: string): string {
  // Strip everything except digits
  let digits = raw.replace(/\D/g, '')

  // If starts with 254, keep as-is; if starts with 0, replace with 254
  if (digits.startsWith('254')) {
    // good
  } else if (digits.startsWith('0')) {
    digits = '254' + digits.slice(1)
  }

  // Build display: +254 7XX XXX XXX
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `+${digits}`
  if (digits.length <= 6) return `+${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 9) return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 12)}`
}

function toRaw(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (digits.length === 0) return ''
  return `+${digits}`
}

export function PhoneInput({
  id,
  value,
  onChange,
  placeholder = '+254 7XX XXX XXX',
  autoFocus,
  ...props
}: PhoneInputProps) {
  const display = formatKenyanPhone(value)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = toRaw(e.target.value)
    // Cap at +254 + 9 digits = 13 chars
    if (raw.length <= 13) {
      onChange(raw)
    }
  }

  return (
    <div className="relative">
      <Phone className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        id={id}
        type="tel"
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        className="pl-8"
        autoFocus={autoFocus}
        aria-invalid={props['aria-invalid']}
      />
    </div>
  )
}
