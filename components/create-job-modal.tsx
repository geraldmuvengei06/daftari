'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/components/field-error'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { getCustomers, createJob } from '@/lib/actions'
import type { Customer } from '@/lib/types'
import { createJobSchema, getFieldErrors, type FieldErrors } from '@/lib/validations'

interface CreateJobModalProps {
  trigger: React.ReactNode
  customerId?: string
  onSuccess?: () => void
}

function getInitial(customerId?: string) {
  return { customerId: customerId ?? '', description: '', totalQuote: '' }
}

export function CreateJobModal({ trigger, customerId, onSuccess }: CreateJobModalProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(getInitial(customerId))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(() => {
    if (!customerId) {
      getCustomers().then(setCustomers).catch(console.error)
    }
  }, [customerId])

  const clearField = (key: string) => setErrors((prev) => ({ ...prev, [key]: undefined }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = createJobSchema.safeParse(form)
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setSubmitting(true)
    try {
      await createJob({
        customer_id: form.customerId,
        description: form.description,
        total_quote: Number(form.totalQuote),
      })
      setErrors({})
      setOpen(false)
      setForm(getInitial(customerId))
      onSuccess?.()
    } catch {
      setErrors({ totalQuote: 'Failed to create job. Please try again.' })
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
          setForm(getInitial(customerId))
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Job Card</DialogTitle>
          <DialogDescription>Create a job card to track an order and payments.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {!customerId && (
            <div className="space-y-2">
              <Label htmlFor="job-customer">Customer</Label>
              <Select
                value={form.customerId}
                onValueChange={(v) => {
                  setForm({ ...form, customerId: v })
                  clearField('customerId')
                }}
              >
                <SelectTrigger
                  id="job-customer"
                  className="w-full"
                  aria-invalid={!!errors.customerId}
                >
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.customerId} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="job-quote">Total Quote (KES)</Label>
            <Input
              id="job-quote"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 2000"
              value={form.totalQuote}
              onChange={(e) => {
                setForm({ ...form, totalQuote: e.target.value })
                clearField('totalQuote')
              }}
              aria-invalid={!!errors.totalQuote}
            />
            <FieldError message={errors.totalQuote} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-desc">Description</Label>
            <Textarea
              id="job-desc"
              placeholder="e.g. Print 100 business cards"
              value={form.description}
              onChange={(e) => {
                setForm({ ...form, description: e.target.value })
                clearField('description')
              }}
              aria-invalid={!!errors.description}
            />
            <FieldError message={errors.description} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Job Card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
