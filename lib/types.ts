export interface Tenant {
  id: string
  user_id: string
  owner_phone: string
  owner_email: string
  business_name: string
  registration_state: 'awaiting_email' | 'awaiting_verification' | 'complete'
  terms_accepted_at: string | null
  created_at: string
}

export interface Customer {
  id: string
  tenant_id: string
  name: string
  phone: string
  created_at: string
}

export interface Job {
  id: string
  tenant_id: string
  customer_id: string
  description: string
  total_quote: number
  status: 'open' | 'closed'
  created_at: string
}

export interface JobWithCustomer extends Job {
  customers: {
    name: string
    phone: string
  }
}

export interface JobWithProgress extends JobWithCustomer {
  total_paid: number
  balance: number
}

export interface CustomerWithBalance extends Customer {
  total_paid: number
  total_job_quotes: number
  balance: number // positive = owes you, negative = overpaid
}

export interface Transaction {
  id: string
  customer_id: string
  job_id: string | null
  mpesa_code: string | null
  amount: number
  status: 'paid' | 'pending' | 'failed'
  raw_text: string | null
  type: 'credit' | 'debit'
  transaction_date: string
  created_at: string
}

export interface TransactionWithCustomer extends Transaction {
  customers: {
    name: string
    phone: string
  }
}

export interface FeatureRequest {
  id: string
  title: string
  description: string
  status: string
  created_at: string
}
