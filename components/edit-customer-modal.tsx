'use client'

import { useState, useEffect } from 'react'
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
} from '@/components/ui/dialog'
import { addCustomerSchema, getFieldErrors, type FieldErrors } from '@/lib/validations'
import { updateCustomer } from '@/lib/actions'
import { PhoneInput } from '@/components/phone-input'
import type { Customer } from '@/lib/types'

interface EditCustomerModalProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditCustomerModal({
  customer,
  open,
  onOpenChange,
  onSuccess,
}: EditCustomerModalProps) {
  const [form, setForm] = useState({ name: '', phone: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (customer) {
      setForm({ name: customer.name, phone: customer.phone })
    }
  }, [customer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer) return

    const result = addCustomerSchema.safeParse(form)
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setSubmitting(true)
    try {
      await updateCustomer(customer.id, { name: form.name, phone: form.phone })
      setErrors({})
      onOpenChange(false)
      onSuccess?.()
    } catch {
      setErrors({ name: 'Failed to update customer. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setErrors({})
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>Update the customer details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="edit-customer-name">Name</Label>
            <Input
              id="edit-customer-name"
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
            <Label htmlFor="edit-customer-phone">Phone</Label>
            <PhoneInput
              id="edit-customer-phone"
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
              {submitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
