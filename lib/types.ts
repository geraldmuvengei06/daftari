export interface Customer {
  id: string
  name: string
  phone: string
  created_at: string
}

export interface Transaction {
  id: string
  customer_id: string
  mpesa_code: string | null
  amount: number
  status: "confirmed" | "pending" | "failed"
  raw_text: string | null
  type: "credit" | "debit"
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
