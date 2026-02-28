"use server"

import { supabase } from "./supabase"
import type { Customer, Transaction, TransactionWithCustomer, FeatureRequest } from "./types"

// ─── Customers ───

export async function getCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data as Customer[]
}

export async function getCustomerById(id: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single()
  if (error) return null
  return data as Customer
}

export async function createCustomer(input: { name: string; phone: string }) {
  const { data, error } = await supabase
    .from("customers")
    .insert({ name: input.name, phone: input.phone })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Customer
}

// ─── Transactions ───

export async function getTransactions() {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, customers(name, phone)")
    .order("transaction_date", { ascending: false })
  if (error) throw new Error(error.message)
  return data as TransactionWithCustomer[]
}

export async function getTransactionsByCustomerId(customerId: string) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("transaction_date", { ascending: false })
  if (error) throw new Error(error.message)
  return data as Transaction[]
}

export async function createTransaction(input: {
  customer_id: string
  mpesa_code: string
  amount: number
  status: string
  raw_text?: string
  type: "credit" | "debit"
  transaction_date?: string
}) {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      customer_id: input.customer_id,
      mpesa_code: input.mpesa_code,
      amount: input.amount,
      status: input.status,
      raw_text: input.raw_text || null,
      type: input.type,
      transaction_date: input.transaction_date || new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Transaction
}

export async function getCustomerTotals(customerId: string) {
  const transactions = await getTransactionsByCustomerId(customerId)
  const totalPaid = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const totalPaidOut = transactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + Number(t.amount), 0)
  return { totalPaid, totalPaidOut }
}

// ─── Feature Requests ───

export async function createFeatureRequest(input: { title: string; description: string }) {
  const { data, error } = await supabase
    .from("feature_requests")
    .insert({ title: input.title, description: input.description })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as FeatureRequest
}

export async function getFeatureRequests() {
  const { data, error } = await supabase
    .from("feature_requests")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data as FeatureRequest[]
}

export async function getProfileStats() {
  const [{ count: customerCount }, { count: transactionCount }, { data: txns }] =
    await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("transactions").select("*", { count: "exact", head: true }),
      supabase.from("transactions").select("type, amount"),
    ])

  const totalCredits = (txns ?? [])
    .filter((t: { type: string }) => t.type === "credit")
    .reduce((sum: number, t: { amount: number }) => sum + Number(t.amount), 0)
  const totalDebits = (txns ?? [])
    .filter((t: { type: string }) => t.type === "debit")
    .reduce((sum: number, t: { amount: number }) => sum + Number(t.amount), 0)

  return {
    totalCustomers: customerCount ?? 0,
    totalTransactions: transactionCount ?? 0,
    totalCredits,
    totalDebits,
  }
}
