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
import { updateTransaction } from '@/lib/actions'
import type { Transaction } from '@/lib/types'
import { editPaymentSchema, getFieldErrors, type FieldErrors } from '@/lib/validations'

interface EditPaymentModalProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditPaymentModal({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: EditPaymentModalProps) {
  const [form, setForm] = useState({
    mpesaCode: '',
    amount: '',
    status: 'paid' as string,
    rawText: '',
    type: 'credit' as 'credit' | 'debit',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (transaction) {
      setForm({
        mpesaCode: transaction.mpesa_code ?? '',
        amount: String(transaction.amount),
        status: transaction.status,
        rawText: transaction.raw_text ?? '',
        type: transaction.type,
      })
    }
  }, [transaction])

  const clearField = (key: string) => setErrors((prev) => ({ ...prev, [key]: undefined }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transaction) return

    const result = editPaymentSchema.safeParse(form)
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setSubmitting(true)
    try {
      await updateTransaction(transaction.id, {
        mpesa_code: form.mpesaCode,
        amount: Number(form.amount),
        status: form.status,
        raw_text: form.rawText || undefined,
        type: form.type,
        transaction_date: transaction.transaction_date,
      })
      setErrors({})
      onOpenChange(false)
      onSuccess?.()
    } catch {
      setErrors({ amount: 'Failed to update payment. Please try again.' })
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
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>Update the transaction details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="edit-mpesa-code">M-Pesa Code</Label>
            <Input
              id="edit-mpesa-code"
              placeholder="e.g. SLK4H7R2T0"
              value={form.mpesaCode}
              onChange={(e) => {
                setForm({ ...form, mpesaCode: e.target.value })
                clearField('mpesaCode')
              }}
              aria-invalid={!!errors.mpesaCode}
            />
            <FieldError message={errors.mpesaCode} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-payment-amount">Amount (KES)</Label>
            <Input
              id="edit-payment-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => {
                setForm({ ...form, amount: e.target.value })
                clearField('amount')
              }}
              aria-invalid={!!errors.amount}
            />
            <FieldError message={errors.amount} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-payment-status">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger id="edit-payment-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-payment-type">Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as 'credit' | 'debit' })}
            >
              <SelectTrigger id="edit-payment-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Credit (received)</SelectItem>
                <SelectItem value="debit">Debit (paid out)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-raw-text">Raw Text (optional)</Label>
            <Textarea
              id="edit-raw-text"
              placeholder="Paste M-Pesa SMS text here..."
              value={form.rawText}
              onChange={(e) => setForm({ ...form, rawText: e.target.value })}
            />
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
