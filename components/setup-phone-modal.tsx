'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/field-error'
import { PhoneInput } from '@/components/phone-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Phone } from 'lucide-react'
import { loginPhoneSchema, getFieldErrors, type FieldErrors } from '@/lib/validations'
import { getTenant, updateTenantPhone } from '@/lib/actions'

export function SetupPhoneModal() {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  const checkPhone = useCallback(async () => {
    try {
      const tenant = await getTenant()
      if (!tenant.owner_phone) {
        setOpen(true)
      }
    } catch {
      // Not authenticated or tenant issue — ignore, middleware handles it
    }
  }, [])

  useEffect(() => {
    checkPhone()
  }, [checkPhone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = loginPhoneSchema.safeParse({ phone })
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setLoading(true)
    setErrors({})
    try {
      await updateTenantPhone(phone)
      setOpen(false)
    } catch (err) {
      setErrors({ phone: err instanceof Error ? err.message : 'Failed to save. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="bg-primary/10 mx-auto flex size-10 items-center justify-center rounded-full">
            <Phone className="text-primary size-5" />
          </div>
          <DialogTitle className="text-center">Set up your M-Pesa number</DialogTitle>
          <DialogDescription className="text-center">
            We need your M-Pesa phone number to match incoming payment messages to your account.
            This is the number you use to send and receive M-Pesa transactions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="setup-mpesa-phone">M-Pesa Phone Number</Label>
            <PhoneInput
              id="setup-mpesa-phone"
              value={phone}
              onChange={(v) => {
                setPhone(v)
                setErrors({ ...errors, phone: undefined })
              }}
              aria-invalid={!!errors.phone}
              autoFocus
            />
            <FieldError message={errors.phone} />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving…' : 'Continue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
