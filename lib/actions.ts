"use server"

import { supabaseAdmin } from "./supabase"
import { createSupabaseServer } from "./supabase-server"
import type { Customer, Tenant, Transaction, TransactionWithCustomer, FeatureRequest } from "./types"

// ─── Auth helpers ───

async function getUser() {
  const supabase = await createSupabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Not authenticated")
  return user
}

async function getTenantId(): Promise<string> {
  const user = await getUser()
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("user_id", user.id)
    .single()
  if (data) return data.id

  // Auto-create tenant if missing
  const { data: created, error } = await supabaseAdmin
    .from("tenants")
    .insert({
      user_id: user.id,
      owner_phone: user.phone ?? "",
      business_name: "My Business",
    })
    .select("id")
    .single()
  if (error || !created) throw new Error("Failed to create tenant")
  return created.id
}

export async function getTenant(): Promise<Tenant> {
  const tenantId = await getTenantId()
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single()
  if (error || !data) throw new Error("Tenant not found")
  return data as Tenant
}

// Called after login to ensure a tenant row exists
export async function ensureTenant(phone: string) {
  const user = await getUser()
  const { data: existing } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("user_id", user.id)
    .single()
  if (existing) return existing.id

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .insert({
      user_id: user.id,
      owner_phone: phone,
      business_name: "My Business",
    })
    .select("id")
    .single()
  if (error) throw new Error(error.message)
  return data.id
}

// ─── Customers ───

export async function getCustomers() {
  const tenantId = await getTenantId()
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data as Customer[]
}

export async function getCustomerById(id: string) {
  const tenantId = await getTenantId()
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()
  if (error) return null
  return data as Customer
}

export async function createCustomer(input: { name: string; phone: string }) {
  const tenantId = await getTenantId()
  const { data, error } = await supabaseAdmin
    .from("customers")
    .insert({ name: input.name, phone: input.phone, tenant_id: tenantId })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Customer
}

// ─── Transactions ───

export async function getTransactions() {
  const tenantId = await getTenantId()
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("*, customers(name, phone)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data as TransactionWithCustomer[]
}

export async function getTransactionsByCustomerId(customerId: string) {
  const tenantId = await getTenantId()
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .eq("customer_id", customerId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
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
  const tenantId = await getTenantId()
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .insert({
      tenant_id: tenantId,
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
  const tenantId = await getTenantId()
  const { data, error } = await supabaseAdmin
    .from("feature_requests")
    .insert({ title: input.title, description: input.description, tenant_id: tenantId })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as FeatureRequest
}

export async function getFeatureRequests() {
  const tenantId = await getTenantId()
  const { data, error } = await supabaseAdmin
    .from("feature_requests")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data as FeatureRequest[]
}

export async function getProfileStats() {
  const tenantId = await getTenantId()
  const [{ count: customerCount }, { count: transactionCount }, { data: txns }] =
    await Promise.all([
      supabaseAdmin.from("customers").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabaseAdmin.from("transactions").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabaseAdmin.from("transactions").select("type, amount").eq("tenant_id", tenantId),
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

// ─── Tenant management ───

export async function checkTenantHasPhone(): Promise<boolean> {
  const user = await getUser()
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("owner_phone")
    .eq("user_id", user.id)
    .single()
  return !!data?.owner_phone
}

export async function updateTenantPhone(phone: string) {
  const user = await getUser()
  const tenantId = await getTenantId()

  // Check if another tenant already has this phone
  const { data: existing } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("owner_phone", phone)
    .neq("id", tenantId)
    .single()
  if (existing) throw new Error("This phone number is already linked to another account.")

  // Update tenant phone
  const { error: tenantError } = await supabaseAdmin
    .from("tenants")
    .update({ owner_phone: phone })
    .eq("id", tenantId)
  if (tenantError) throw new Error(tenantError.message)

  // Also update the auth user's phone metadata
  await supabaseAdmin.auth.admin.updateUserById(user.id, { phone })
}

// ─── Auth actions ───

export async function signOut() {
  const supabase = await createSupabaseServer()
  await supabase.auth.signOut()
}

// ─── Realtime helpers ───

export async function getCurrentTenantId() {
  return getTenantId()
}
