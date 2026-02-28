"use server"

import { supabaseAdmin } from "./supabase"
import { createSupabaseServer } from "./supabase-server"
import type { Customer, Tenant, Transaction, TransactionWithCustomer, FeatureRequest, Job, JobWithCustomer, JobWithProgress } from "./types"

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

  const customers = data as Customer[]
  if (customers.length === 0) return []

  const customerIds = customers.map((c) => c.id)

  // All credits per customer
  const { data: credits } = await supabaseAdmin
    .from("transactions")
    .select("customer_id, amount")
    .eq("tenant_id", tenantId)
    .eq("type", "credit")
    .in("customer_id", customerIds)

  const paidMap: Record<string, number> = {}
  for (const t of credits ?? []) {
    paidMap[t.customer_id] = (paidMap[t.customer_id] || 0) + Number(t.amount)
  }

  // All debits per customer
  const { data: debits } = await supabaseAdmin
    .from("transactions")
    .select("customer_id, amount")
    .eq("tenant_id", tenantId)
    .eq("type", "debit")
    .in("customer_id", customerIds)

  const debitMap: Record<string, number> = {}
  for (const t of debits ?? []) {
    debitMap[t.customer_id] = (debitMap[t.customer_id] || 0) + Number(t.amount)
  }

  // All open job quotes per customer
  const { data: jobs } = await supabaseAdmin
    .from("jobs")
    .select("customer_id, total_quote")
    .eq("tenant_id", tenantId)
    .eq("status", "open")
    .in("customer_id", customerIds)

  const quotesMap: Record<string, number> = {}
  for (const j of jobs ?? []) {
    quotesMap[j.customer_id] = (quotesMap[j.customer_id] || 0) + Number(j.total_quote)
  }

  return customers.map((c) => {
    const totalPaid = paidMap[c.id] || 0
    const totalDebits = debitMap[c.id] || 0
    const totalQuotes = quotesMap[c.id] || 0
    // Net payments = credits minus debits; balance = what they owe
    return {
      ...c,
      total_paid: totalPaid,
      total_job_quotes: totalQuotes,
      balance: totalQuotes - (totalPaid - totalDebits),
    }
  })
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
  const tenantId = await getTenantId()
  const transactions = await getTransactionsByCustomerId(customerId)
  const totalPaid = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const totalPaidOut = transactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + Number(t.amount), 0)

  // Total owed from open jobs
  const { data: openJobs } = await supabaseAdmin
    .from("jobs")
    .select("total_quote")
    .eq("customer_id", customerId)
    .eq("tenant_id", tenantId)
    .eq("status", "open")

  const totalJobQuotes = (openJobs ?? []).reduce((s, j) => s + Number(j.total_quote), 0)
  // Net payments = credits minus debits; balance = what they still owe
  const balance = totalJobQuotes - (totalPaid - totalPaidOut)

  return { totalPaid, totalPaidOut, totalJobQuotes, balance }
}

// ─── Jobs ───

export async function getJobs() {
  const tenantId = await getTenantId()
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("*, customers(name, phone)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)

  const jobs = data as JobWithCustomer[]

  // Get net credits (credits - debits) grouped by customer
  const { data: allCredits } = await supabaseAdmin
    .from("transactions")
    .select("customer_id, amount, type")
    .eq("tenant_id", tenantId)
    .in("type", ["credit", "debit"])

  const walletByCustomer: Record<string, number> = {}
  for (const t of allCredits ?? []) {
    const amt = Number(t.amount)
    walletByCustomer[t.customer_id] = (walletByCustomer[t.customer_id] || 0) + (t.type === "credit" ? amt : -amt)
  }

  // For each customer, walk their OPEN jobs oldest-first to distribute wallet
  const openJobs = jobs.filter((j) => j.status === "open")
  const customerJobs: Record<string, JobWithCustomer[]> = {}
  for (const j of openJobs) {
    if (!customerJobs[j.customer_id]) customerJobs[j.customer_id] = []
    customerJobs[j.customer_id].push(j)
  }

  const paidMap: Record<string, number> = {}
  for (const [custId, custJobs] of Object.entries(customerJobs)) {
    let wallet = Math.max(0, walletByCustomer[custId] || 0)
    // Sort oldest first for distribution
    const sorted = [...custJobs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    for (const j of sorted) {
      const quote = Number(j.total_quote)
      const applied = Math.min(wallet, quote)
      wallet -= applied
      paidMap[j.id] = applied
    }
  }

  return jobs.map((j) => ({
    ...j,
    total_paid: paidMap[j.id] || 0,
    balance: j.status === "closed" ? 0 : Math.max(0, Number(j.total_quote) - (paidMap[j.id] || 0)),
  })) as JobWithProgress[]
}

export async function getJobsByCustomerId(customerId: string) {
  const tenantId = await getTenantId()
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("*, customers(name, phone)")
    .eq("customer_id", customerId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
  if (error) throw new Error(error.message)

  const jobs = data as JobWithCustomer[]

  // Net wallet: credits minus debits for this customer
  const { data: txns } = await supabaseAdmin
    .from("transactions")
    .select("amount, type")
    .eq("customer_id", customerId)
    .eq("tenant_id", tenantId)
    .in("type", ["credit", "debit"])

  let wallet = (txns ?? []).reduce((s, t) => {
    const amt = Number(t.amount)
    return s + (t.type === "credit" ? amt : -amt)
  }, 0)
  wallet = Math.max(0, wallet)

  // Walk through OPEN jobs oldest-first, deducting from wallet
  const openJobs = jobs.filter((j) => j.status === "open")
  const paidMap: Record<string, number> = {}
  for (const j of openJobs) {
    const quote = Number(j.total_quote)
    const applied = Math.min(wallet, quote)
    wallet -= applied
    paidMap[j.id] = applied
  }

  const result = jobs.map((j) => ({
    ...j,
    total_paid: paidMap[j.id] || 0,
    balance: j.status === "closed" ? 0 : Math.max(0, Number(j.total_quote) - (paidMap[j.id] || 0)),
  })) as JobWithProgress[]

  // Return newest-first for display
  return result.reverse()
}

export async function createJob(input: {
  customer_id: string
  description: string
  total_quote: number
}) {
  const tenantId = await getTenantId()
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .insert({
      tenant_id: tenantId,
      customer_id: input.customer_id,
      description: input.description,
      total_quote: input.total_quote,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Job
}

export async function closeJob(jobId: string) {
  const tenantId = await getTenantId()
  const { error } = await supabaseAdmin
    .from("jobs")
    .update({ status: "closed" })
    .eq("id", jobId)
    .eq("tenant_id", tenantId)
  if (error) throw new Error(error.message)
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
  const [{ count: customerCount }, { count: transactionCount }, { data: txns }, { data: jobs }] =
    await Promise.all([
      supabaseAdmin.from("customers").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabaseAdmin.from("transactions").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabaseAdmin.from("transactions").select("type, amount").eq("tenant_id", tenantId),
      supabaseAdmin.from("jobs").select("total_quote").eq("tenant_id", tenantId).eq("status", "open"),
    ])

  const totalCredits = (txns ?? [])
    .filter((t: { type: string }) => t.type === "credit")
    .reduce((sum: number, t: { amount: number }) => sum + Number(t.amount), 0)
  const totalDebits = (txns ?? [])
    .filter((t: { type: string }) => t.type === "debit")
    .reduce((sum: number, t: { amount: number }) => sum + Number(t.amount), 0)
  const totalJobQuotes = (jobs ?? []).reduce((sum: number, j: { total_quote: number }) => sum + Number(j.total_quote), 0)
  const moneyOwed = Math.max(0, totalJobQuotes - totalCredits)

  return {
    totalCustomers: customerCount ?? 0,
    totalTransactions: transactionCount ?? 0,
    totalCredits,
    totalDebits,
    moneyOwed,
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
