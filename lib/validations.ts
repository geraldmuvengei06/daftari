import { z } from 'zod'

export const loginPhoneSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\+?\d{10,15}$/, 'Enter a valid phone number'),
})

export const loginEmailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
})

export const addCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').min(2, 'Name is too short'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\+?\d{10,15}$/, 'Enter a valid phone number'),
})

export const recordPaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  mpesaCode: z.string().min(1, 'M-Pesa code is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be greater than 0'),
  status: z.enum(['paid', 'pending', 'failed']),
  rawText: z.string().optional(),
})

export const createJobSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  totalQuote: z
    .string()
    .min(1, 'Quote amount is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required').min(3, 'Description is too short'),
})

export const featureRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').min(3, 'Title is too short'),
  description: z.string().min(1, 'Description is required').min(10, 'Please provide more detail'),
})

export type FieldErrors = Record<string, string | undefined>

export function getFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0])
    if (key && !errors[key]) {
      errors[key] = issue.message
    }
  }
  return errors
}
