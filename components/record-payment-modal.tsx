"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FieldError } from "@/components/field-error"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getCustomers, createTransaction } from "@/lib/actions"
import type { Customer } from "@/lib/types"
import { recordPaymentSchema, getFieldErrors, type FieldErrors } from "@/lib/validations"

interface RecordPaymentModalProps {
  trigger: React.ReactNode
  customerId?: string
  onSuccess?: () => void
}

function getInitial(customerId?: string) {
  return { customerId: customerId ?? "", mpesaCode: "", amount: "", status: "confirmed" as string, rawText: "" }
}

export function RecordPaymentModal({ trigger, customerId, onSuccess }: RecordPaymentModalProps) {
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
    const result = recordPaymentSchema.safeParse(form)
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setSubmitting(true)
    try {
      await createTransaction({
        customer_id: form.customerId,
        mpesa_code: form.mpesaCode,
        amount: Number(form.amount),
        status: form.status,
        raw_text: form.rawText || undefined,
        type: "credit",
      })
      setErrors({})
      setOpen(false)
      setForm(getInitial(customerId))
      onSuccess?.()
    } catch {
      setErrors({ amount: "Failed to record payment. Please try again." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setErrors({}); setForm(getInitial(customerId)) } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Enter the transaction details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {!customerId && (
            <div className="space-y-2">
              <Label htmlFor="payment-customer">Customer</Label>
              <Select
                value={form.customerId}
                onValueChange={(v) => { setForm({ ...form, customerId: v }); clearField("customerId") }}
              >
                <SelectTrigger id="payment-customer" className="w-full" aria-invalid={!!errors.customerId}>
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
            <Label htmlFor="mpesa-code">M-Pesa Code</Label>
            <Input
              id="mpesa-code"
              placeholder="e.g. SLK4H7R2T0"
              value={form.mpesaCode}
              onChange={(e) => { setForm({ ...form, mpesaCode: e.target.value }); clearField("mpesaCode") }}
              aria-invalid={!!errors.mpesaCode}
            />
            <FieldError message={errors.mpesaCode} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount (KES)</Label>
            <Input
              id="payment-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => { setForm({ ...form, amount: e.target.value }); clearField("amount") }}
              aria-invalid={!!errors.amount}
            />
            <FieldError message={errors.amount} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v })}
            >
              <SelectTrigger id="payment-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="raw-text">Raw Text (optional)</Label>
            <Textarea
              id="raw-text"
              placeholder="Paste M-Pesa SMS text here..."
              value={form.rawText}
              onChange={(e) => setForm({ ...form, rawText: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Recording…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
