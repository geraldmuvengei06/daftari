'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/field-error'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { addCustomerSchema, getFieldErrors, type FieldErrors } from '@/lib/validations'
import { createCustomer } from '@/lib/actions'
import { PhoneInput } from '@/components/phone-input'

interface AddCustomerModalProps {
  trigger: React.ReactNode
  onSuccess?: () => void
}

const initial = { name: '', phone: '' }

export function AddCustomerModal({ trigger, onSuccess }: AddCustomerModalProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = addCustomerSchema.safeParse(form)
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setSubmitting(true)
    try {
      await createCustomer({ name: form.name, phone: form.phone })
      setErrors({})
      setOpen(false)
      setForm(initial)
      onSuccess?.()
    } catch {
      setErrors({ name: 'Failed to add customer. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setErrors({})
          setForm(initial)
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
          <DialogDescription>Enter the customer details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="customer-name">Name</Label>
            <Input
              id="customer-name"
              placeholder="e.g. Alice Mwangi"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value })
                setErrors({ ...errors, name: undefined })
              }}
              aria-invalid={!!errors.name}
            />
            <FieldError message={errors.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-phone">Phone</Label>
            <PhoneInput
              id="customer-phone"
              value={form.phone}
              onChange={(v) => {
                setForm({ ...form, phone: v })
                setErrors({ ...errors, phone: undefined })
              }}
              aria-invalid={!!errors.phone}
            />
            <FieldError message={errors.phone} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
