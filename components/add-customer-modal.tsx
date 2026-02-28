"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/field-error"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { addCustomerSchema, getFieldErrors, type FieldErrors } from "@/lib/validations"

interface AddCustomerModalProps {
  trigger: React.ReactNode
}

const initial = { name: "", phone: "" }

export function AddCustomerModal({ trigger }: AddCustomerModalProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = addCustomerSchema.safeParse(form)
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setErrors({})
    setOpen(false)
    setForm(initial)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setErrors({}); setForm(initial) } }}>
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
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }) }}
              aria-invalid={!!errors.name}
            />
            <FieldError message={errors.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-phone">Phone</Label>
            <Input
              id="customer-phone"
              type="tel"
              placeholder="+254712345678"
              value={form.phone}
              onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: undefined }) }}
              aria-invalid={!!errors.phone}
            />
            <FieldError message={errors.phone} />
          </div>
          <DialogFooter>
            <Button type="submit">Add Customer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
