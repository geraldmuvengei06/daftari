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
} from '@/components/ui/dialog'
import { getCustomers, updateJob } from '@/lib/actions'
import type { Job, Customer } from '@/lib/types'
import { editJobSchema, getFieldErrors, type FieldErrors } from '@/lib/validations'

interface EditJobModalProps {
  job: Job | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditJobModal({ job, open, onOpenChange, onSuccess }: EditJobModalProps) {
  const [form, setForm] = useState({
    customerId: '',
    description: '',
    totalQuote: '',
    status: 'open' as 'open' | 'closed',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(() => {
    getCustomers().then(setCustomers).catch(console.error)
  }, [])

  useEffect(() => {
    if (job) {
      setForm({
        customerId: job.customer_id,
        description: job.description,
        totalQuote: String(job.total_quote),
        status: job.status,
      })
    }
  }, [job])

  const clearField = (key: string) => setErrors((prev) => ({ ...prev, [key]: undefined }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!job) return

    const result = editJobSchema.safeParse(form)
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setSubmitting(true)
    try {
      await updateJob(job.id, {
        customer_id: form.customerId,
        description: form.description,
        total_quote: Number(form.totalQuote),
        status: form.status,
      })
      setErrors({})
      onOpenChange(false)
      onSuccess?.()
    } catch {
      setErrors({ totalQuote: 'Failed to update job. Please try again.' })
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
          <DialogTitle>Edit Job Card</DialogTitle>
          <DialogDescription>Update the job card details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="edit-job-customer">Customer</Label>
            <Select
              value={form.customerId}
              onValueChange={(v) => {
                setForm({ ...form, customerId: v })
                clearField('customerId')
              }}
            >
              <SelectTrigger
                id="edit-job-customer"
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
          <div className="space-y-2">
            <Label htmlFor="edit-job-quote">Total Quote (KES)</Label>
            <Input
              id="edit-job-quote"
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
            <Label htmlFor="edit-job-desc">Description</Label>
            <Textarea
              id="edit-job-desc"
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
              {submitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
