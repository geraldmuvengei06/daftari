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
import { updateTenant } from '@/lib/actions'
import type { Tenant } from '@/lib/types'
import { z } from 'zod'
import { getFieldErrors, type FieldErrors } from '@/lib/validations'

const editBusinessNameSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').min(2, 'Business name is too short'),
})

interface EditTenantModalProps {
  tenant: Tenant
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditTenantModal({ tenant, open, onOpenChange, onSuccess }: EditTenantModalProps) {
  const [businessName, setBusinessName] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (tenant) {
      setBusinessName(tenant.business_name || '')
    }
  }, [tenant])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = editBusinessNameSchema.safeParse({ businessName })
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setSubmitting(true)
    try {
      await updateTenant({ business_name: businessName })
      setErrors({})
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      setErrors({ businessName: message })
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
          <DialogTitle>Edit Business Profile</DialogTitle>
          <DialogDescription>Update your business name below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="edit-business-name">Business Name</Label>
            <Input
              id="edit-business-name"
              placeholder="e.g. Acme Printing"
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value)
                setErrors((prev) => ({ ...prev, businessName: undefined }))
              }}
              aria-invalid={!!errors.businessName}
            />
            <FieldError message={errors.businessName} />
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
