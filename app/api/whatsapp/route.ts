import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { parseWithAI } from '@/lib/ai-parser'
import { getWhatsAppProvider } from '@/lib/whatsapp'

// ─── Tenant Resolution ───

async function resolveTenant(phone: string) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, registration_state, user_id')
    .eq('owner_phone', phone)
    .maybeSingle()
  if (error) {
    console.error('Tenant lookup failed for phone:', phone, error)
    return null
  }
  return data as { id: string; registration_state: string; user_id: string | null } | null
}

// ─── Help Message ───

function getHelpMessage(isNewUser = false) {
  const intro = isNewUser
    ? '🎉 Welcome! Your account is ready.\n'
    : ''
  return (
    intro +
    'Here is what you can do:\n\n' +
    '🛠 *Create Job*\n' +
    '  "Job Jane 1000 Print business cards"\n\n' +
    '👤 *Check Balance*\n' +
    '  "Bal Jane"\n\n' +
    '📊 *Reports*\n' +
    '  "debts today" — today\'s debts\n' +
    '  "income this week" — weekly income\n' +
    '  "summary" — full overview\n\n' +
    '💳 *Record Payment*\n' +
    '  "Received 500" or forward M-Pesa SMS\n\n' +
    '🔑 *Login Portal*\n' +
    '  Send "Login" to access web dashboard'
  )
}

// ─── Registration Flow ───

async function handleRegistration(phone: string, messageText: string): Promise<{ tenantId: string; welcomeMsg: string | null }> {
  const tenant = await resolveTenant(phone)
  const isGetStarted = /^get\s*started$/i.test(messageText.trim())

  if (tenant) {
    // Existing user — show welcome if they sent "Get Started"
    if (isGetStarted) {
      return { tenantId: tenant.id, welcomeMsg: getHelpMessage() }
    }
    return { tenantId: tenant.id, welcomeMsg: null }
  }

  // New user — create account immediately, ready to use
  const { data: newTenant, error } = await supabaseAdmin
    .from('tenants')
    .insert({
      owner_phone: phone,
      business_name: 'My Business',
      registration_state: 'complete',
    })
    .select('id')
    .single()

  if (error || !newTenant) {
    console.error('Failed to create tenant:', error)
    return { tenantId: '', welcomeMsg: '😕 System error. Please try again later.' }
  }

  // Return welcome message for new users
  return { tenantId: newTenant.id, welcomeMsg: getHelpMessage(true) }
}

// ─── Customer Resolution ───

async function resolveCustomer(tenantId: string, name: string, phone: string | null) {
  const normalizedName = name.replace(/\s+/g, ' ').trim()

  if (phone) {
    const { data: byPhone } = await supabaseAdmin
      .from('customers')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .maybeSingle()

    if (byPhone) {
      if (byPhone.name === byPhone.id || byPhone.name === phone) {
        await supabaseAdmin.from('customers').update({ name: normalizedName }).eq('id', byPhone.id)
      }
      return byPhone as { id: string; name: string }
    }
  }

  const { data: byName } = await supabaseAdmin
    .from('customers')
    .select('id, name, phone')
    .eq('tenant_id', tenantId)
    .ilike('name', `%${normalizedName}%`)
    .limit(1)

  if (byName && byName.length > 0) {
    const existing = byName[0]
    if (phone && (existing.phone === existing.name || !existing.phone.match(/^\+?\d/))) {
      await supabaseAdmin.from('customers').update({ phone }).eq('id', existing.id)
    }
    return { id: existing.id, name: existing.name }
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .insert({ phone: phone ?? normalizedName, name: normalizedName, tenant_id: tenantId })
    .select('id, name')
    .single()
  if (error || !data) return null
  return data as { id: string; name: string }
}

// ─── Job Creation ───

function parseJobMessage(text: string) {
  const match = text.match(/^Job\s+(.+?)\s+(\d[\d,]*)\s+(.+)$/i)
  if (!match) return null
  return {
    customerName: match[1].trim(),
    amount: Number(match[2].replace(/,/g, '')),
    description: match[3].trim(),
  }
}

async function handleJobCreation(
  tenantId: string,
  parsed: { customerName: string; items: { description: string; quantity: number; unit_price: number; total: number }[] }
): Promise<string> {
  const normalizedName = parsed.customerName.replace(/\s+/g, ' ').trim()

  const { data: customers } = await supabaseAdmin
    .from('customers')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .ilike('name', `%${normalizedName}%`)
    .limit(1)

  let customerId: string
  let customerName: string

  if (customers && customers.length > 0) {
    customerId = customers[0].id
    customerName = customers[0].name
  } else {
    const { data: newCust, error } = await supabaseAdmin
      .from('customers')
      .insert({ name: normalizedName, phone: normalizedName, tenant_id: tenantId })
      .select('id, name')
      .single()
    if (error || !newCust) return '😕 Could not create customer. Try again.'
    customerId = newCust.id
    customerName = newCust.name
  }

  const jobRows = parsed.items.map((item) => ({
    tenant_id: tenantId,
    customer_id: customerId,
    description: item.quantity > 1
      ? `${item.description} (${item.quantity} × KES ${item.unit_price.toLocaleString()})`
      : item.description,
    total_quote: item.total,
  }))

  const { error } = await supabaseAdmin.from('jobs').insert(jobRows)
  if (error) return '😕 Error creating job card. Try again.'

  const grandTotal = parsed.items.reduce((s, i) => s + i.total, 0)
  const lines = [`✨ Job Card${parsed.items.length > 1 ? 's' : ''} created!`, `👤 ${customerName}`]
  for (const item of parsed.items) {
    if (item.quantity > 1) {
      lines.push(`  🔹 ${item.description} — ${item.quantity} × KES ${item.unit_price.toLocaleString()} = KES ${item.total.toLocaleString()}`)
    } else {
      lines.push(`  🔹 ${item.description} — KES ${item.total.toLocaleString()}`)
    }
  }
  if (parsed.items.length > 1) {
    lines.push(`💰 Total: KES ${grandTotal.toLocaleString()}`)
  }
  lines.push('', '📲 Forward M-Pesa message to record payment automatically.')
  return lines.join('\n')
}

// ─── Balance Query ───

function parseBalanceQuery(text: string) {
  const match = text.match(/^Bal\s+(.+)$/i)
  if (!match) return null
  return match[1].trim()
}

async function handleBalanceQuery(tenantId: string, customerName: string): Promise<string> {
  const { data: customers } = await supabaseAdmin
    .from('customers')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .ilike('name', `%${customerName}%`)
    .limit(1)

  if (!customers || customers.length === 0) {
    return `🔍 Customer "${customerName}" not found.`
  }

  const customer = customers[0]

  const { data: txns } = await supabaseAdmin
    .from('transactions')
    .select('amount, type')
    .eq('customer_id', customer.id)
    .eq('tenant_id', tenantId)
    .in('type', ['credit', 'debit'])

  const totalCredits = (txns ?? [])
    .filter((t) => t.type === 'credit')
    .reduce((s, t) => s + Number(t.amount), 0)
  const totalDebits = (txns ?? [])
    .filter((t) => t.type === 'debit')
    .reduce((s, t) => s + Number(t.amount), 0)
  const netPaid = totalCredits - totalDebits

  const { data: jobs } = await supabaseAdmin
    .from('jobs')
    .select('id, description, total_quote')
    .eq('customer_id', customer.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'open')
    .order('created_at', { ascending: true })

  if (!jobs || jobs.length === 0) {
    if (netPaid > 0) {
      return `🎉 ${customer.name} has no open jobs.\n💰 Wallet: KES ${netPaid.toLocaleString()} (credit)`
    }
    return `🎉 ${customer.name} has no open jobs. No balance due.`
  }

  const totalQuote = jobs.reduce((s, j) => s + Number(j.total_quote), 0)
  let wallet = Math.max(0, netPaid)
  const lines: string[] = [`📊 Balance for ${customer.name}:\n`]

  for (const job of jobs) {
    const quote = Number(job.total_quote)
    const applied = Math.min(wallet, quote)
    wallet -= applied
    const remaining = quote - applied
    const pct = quote > 0 ? Math.round((applied / quote) * 100) : 0

    lines.push(`🔹 ${job.description}`)
    lines.push(
      `   Quote: KES ${quote.toLocaleString()} · Paid: KES ${applied.toLocaleString()} · Bal: KES ${remaining.toLocaleString()} (${pct}%)`
    )
  }

  const owes = Math.max(0, totalQuote - netPaid)
  const overpaid = Math.max(0, netPaid - totalQuote)

  lines.push(`\n🧾 Jobs Total: KES ${totalQuote.toLocaleString()}`)
  lines.push(`💰 Total Paid: KES ${totalCredits.toLocaleString()}`)
  if (totalDebits > 0) {
    lines.push(`💸 Paid Out: KES ${totalDebits.toLocaleString()}`)
    lines.push(`💰 Net Paid: KES ${netPaid.toLocaleString()}`)
  }
  if (overpaid > 0) {
    lines.push(`🎉 Credit: KES ${overpaid.toLocaleString()}`)
  } else {
    lines.push(`⏳ Owes: KES ${owes.toLocaleString()}`)
  }

  return lines.join('\n')
}

// ─── AI-Parsed Payment Processing ───

async function handleAIPayment(
  tenantId: string,
  data: {
    amount: number
    code: string | null
    customer_name: string
    customer_phone: string | null
    transaction_type: 'credit' | 'debit'
    transaction_date: string | null
  },
  rawText: string
): Promise<string> {
  if (data.code) {
    const { data: dup } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('mpesa_code', data.code)
      .maybeSingle()
    if (dup) return 'ℹ️ This payment has already been recorded.'
  }

  const customer = await resolveCustomer(tenantId, data.customer_name, data.customer_phone)
  if (!customer) return '😕 System error. Please try again later.'

  const { error: txError } = await supabaseAdmin.from('transactions').insert({
    mpesa_code: data.code,
    amount: data.amount,
    type: data.transaction_type,
    status: 'paid',
    raw_text: rawText,
    tenant_id: tenantId,
    customer_id: customer.id,
    transaction_date: data.transaction_date,
  })

  if (txError) {
    console.error('Transaction insert failed:', txError)
    return '😕 Error saving payment. Please try again later.'
  }

  const txLabel = data.transaction_type === 'credit' ? 'Received' : 'Sent'
  const direction = data.transaction_type === 'credit' ? 'from' : 'to'
  return (
    `✅ ${txLabel} KES ${data.amount.toLocaleString()} ${direction} ${customer.name}.` +
    (data.code ? `\n📱 M-Pesa: ${data.code}` : '') +
    `\n\n💡 Send "Bal ${customer.name}" to see balance.`
  )
}

// ─── M-Pesa Payment Processing (regex fallback) ───

async function handleMpesaPayment(tenantId: string, messageText: string): Promise<string | null> {
  if (/Fuliza\s+M-PESA/i.test(messageText)) {
    return 'ℹ️ Fuliza payments are not recorded at this time.'
  }

  const isDebit = /sent\s+to/i.test(messageText)
  const isCredit = /received.*from/i.test(messageText)

  const code = messageText.match(/([A-Z0-9]{10})\sConfirmed/i)?.[1]
  const amount = messageText.match(/Ksh([\d,.]+)/i)?.[1]?.replace(/,/g, '')

  let transaction_date: string | null = null
  const dateTimeMatch = messageText.match(
    /on\s+(\d{1,2})\/(\d{1,2})\/(\d{2})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i
  )
  if (dateTimeMatch) {
    const [, day, month, year, hours, minutes, period] = dateTimeMatch
    let hour24 = parseInt(hours)
    if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12
    if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0
    const fullYear = 2000 + parseInt(year)
    const date = new Date(fullYear, parseInt(month) - 1, parseInt(day), hour24, parseInt(minutes))
    transaction_date = date.toISOString()
  }

  let customer_name: string | null = null
  let customer_phone: string | null = null

  if (isCredit) {
    customer_name = messageText.match(/from\s+(.+?)\s+\S+\s+on\s+\d/i)?.[1]?.trim() || null
    customer_phone = messageText.match(/from\s.+\s(\S+)\s+on\s+\d/i)?.[1] || null
  } else if (isDebit) {
    customer_name =
      messageText.match(/sent\s+to\s+(.+?)(?:\.\s+for|\s+on\s+\d)/i)?.[1]?.trim() || null
    customer_phone = messageText.match(/for\s+account\s+(\S+)\s+on/i)?.[1] || null
  }

  if (!code || !amount || !customer_name || (!isCredit && !isDebit)) return null

  const txType = isDebit ? 'debit' : 'credit'

  const [dupResult, customer] = await Promise.all([
    supabaseAdmin.from('transactions').select('id').eq('mpesa_code', code).maybeSingle(),
    resolveCustomer(tenantId, customer_name, customer_phone),
  ])

  if (dupResult.data) return 'ℹ️ This payment has already been recorded.'
  if (!customer) return '😕 System error. Please try again later.'

  const { error: txError } = await supabaseAdmin.from('transactions').insert({
    mpesa_code: code,
    amount,
    type: txType,
    status: 'paid',
    raw_text: messageText,
    tenant_id: tenantId,
    customer_id: customer.id,
    transaction_date,
  })

  if (txError) {
    console.error('Transaction insert failed:', txError)
    return '😕 Error saving payment. Please try again later.'
  }

  const txLabel = txType === 'credit' ? 'Received' : 'Sent'
  return (
    `✅ ${txLabel} KES ${amount} ${txType === 'credit' ? 'from' : 'to'} ${customer.name}.\n\n💡 Send "Bal ${customer.name}" to see balance.`
  )
}

// ─── WhatsApp Login ───

async function handleWhatsAppLogin(tenantId: string, messageText: string): Promise<{ response: string; needsEmail?: boolean }> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('user_id, owner_email, login_state')
    .eq('id', tenantId)
    .single()

  // Check if user is in the middle of providing email for login
  if (tenant?.login_state === 'awaiting_email') {
    return handleLoginEmail(tenantId, messageText)
  }

  // No email set yet — ask for it
  if (!tenant?.owner_email) {
    await supabaseAdmin
      .from('tenants')
      .update({ login_state: 'awaiting_email' })
      .eq('id', tenantId)

    return {
      response: '📧 To access the web portal, please send your email address.\nExample: juma@gmail.com',
      needsEmail: true,
    }
  }

  // Email exists — send magic link
  return sendLoginLink(tenantId, tenant.owner_email)
}

async function handleLoginEmail(tenantId: string, messageText: string): Promise<{ response: string; needsEmail?: boolean }> {
  const text = messageText.trim()
  const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/
  const emailMatch = text.match(emailRegex)

  if (!emailMatch) {
    return {
      response: '📧 Please send a valid email address.\nExample: juma@gmail.com',
      needsEmail: true,
    }
  }

  const email = emailMatch[0].toLowerCase()

  // Check if email is already used by another tenant
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email)

  if (existingUser) {
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('user_id', existingUser.id)
      .maybeSingle()

    if (existingTenant && existingTenant.id !== tenantId) {
      return {
        response: '⚠️ This email is already used by another account.\nPlease send a different email.',
        needsEmail: true,
      }
    }

    // Link existing user to this tenant
    await supabaseAdmin
      .from('tenants')
      .update({ user_id: existingUser.id, owner_email: email, login_state: null })
      .eq('id', tenantId)

    return sendLoginLink(tenantId, email)
  }

  // Create new auth user
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: false,
  })

  if (createError || !newUser?.user) {
    console.error('Failed to create auth user:', createError)
    await supabaseAdmin.from('tenants').update({ login_state: null }).eq('id', tenantId)
    return { response: '😕 Error setting up account. Please try again.' }
  }

  await supabaseAdmin
    .from('tenants')
    .update({ user_id: newUser.user.id, owner_email: email, login_state: null })
    .eq('id', tenantId)

  return sendLoginLink(tenantId, email)
}

async function sendLoginLink(tenantId: string, email: string): Promise<{ response: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/customers`,
  })

  if (error) {
    console.error('[Login] inviteUserByEmail failed:', error)
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${appUrl}/auth/callback?next=/customers` },
    })

    if (otpError) {
      console.error('[Login] OTP send failed:', otpError)
      return { response: '😕 Error sending login link. Try again.' }
    }
  }

  const [local, domain] = email.split('@')
  const masked = local.slice(0, 2) + '***@' + domain

  return {
    response:
      `📧 We sent a login link to ${masked}.\n` +
      'Open your email and click the link to login 🔓\n\n' +
      '⏳ Link expires in 1 hour.',
  }
}

// ─── Reports ───

function getDateRange(period: 'today' | 'week' | 'month' | 'all'): { from: string; label: string } {
  const now = new Date()
  switch (period) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { from: start.toISOString(), label: 'Today' }
    }
    case 'week': {
      const day = now.getDay()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
      return { from: start.toISOString(), label: 'This week' }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: start.toISOString(), label: 'This month' }
    }
    case 'all':
      return { from: '2000-01-01T00:00:00Z', label: 'Total' }
  }
}

async function handleReport(
  tenantId: string,
  report: 'unpaid' | 'income' | 'summary',
  period: 'today' | 'week' | 'month' | 'all'
): Promise<string> {
  const { from, label } = getDateRange(period)

  if (report === 'unpaid') {
    let query = supabaseAdmin
      .from('jobs')
      .select('description, total_quote, created_at, customers(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (period !== 'all') query = query.gte('created_at', from)
    const { data: jobs } = await query.limit(20)

    if (!jobs || jobs.length === 0) return `🎉 No debts ${label.toLowerCase()}. All clear!`

    const total = jobs.reduce((s, j) => s + Number(j.total_quote), 0)
    const lines = [`📊 Debts — ${label}:\n`]

    for (const job of jobs) {
      const customer = (job.customers as unknown as { name: string })?.name ?? 'Unknown'
      lines.push(`  👤 ${customer} — KES ${Number(job.total_quote).toLocaleString()}`)
      lines.push(`     🔹 ${job.description}`)
    }

    lines.push(`\n💰 Total: KES ${total.toLocaleString()}`)
    lines.push(`🧾 Jobs: ${jobs.length}`)
    return lines.join('\n')
  }

  if (report === 'income') {
    let query = supabaseAdmin
      .from('transactions')
      .select('amount, type, created_at, customers(name)')
      .eq('tenant_id', tenantId)
      .eq('type', 'credit')
      .eq('status', 'paid')
      .order('created_at', { ascending: false })

    if (period !== 'all') query = query.gte('created_at', from)
    const { data: txns } = await query.limit(30)

    if (!txns || txns.length === 0) return `📊 No income ${label.toLowerCase()}.`

    const total = txns.reduce((s, t) => s + Number(t.amount), 0)
    const lines = [`📊 Income — ${label}:\n`]

    for (const txn of txns) {
      const customer = (txn.customers as unknown as { name: string })?.name ?? 'Unknown'
      lines.push(`  💵 KES ${Number(txn.amount).toLocaleString()} — ${customer}`)
    }

    lines.push(`\n💰 Total: KES ${total.toLocaleString()}`)
    lines.push(`🧾 Transactions: ${txns.length}`)
    return lines.join('\n')
  }

  // summary
  const [jobsResult, incomeResult, expenseResult] = await Promise.all([
    period !== 'all'
      ? supabaseAdmin.from('jobs').select('total_quote').eq('tenant_id', tenantId).eq('status', 'open').gte('created_at', from)
      : supabaseAdmin.from('jobs').select('total_quote').eq('tenant_id', tenantId).eq('status', 'open'),
    period !== 'all'
      ? supabaseAdmin.from('transactions').select('amount').eq('tenant_id', tenantId).eq('type', 'credit').eq('status', 'paid').gte('created_at', from)
      : supabaseAdmin.from('transactions').select('amount').eq('tenant_id', tenantId).eq('type', 'credit').eq('status', 'paid'),
    period !== 'all'
      ? supabaseAdmin.from('transactions').select('amount').eq('tenant_id', tenantId).eq('type', 'debit').eq('status', 'paid').gte('created_at', from)
      : supabaseAdmin.from('transactions').select('amount').eq('tenant_id', tenantId).eq('type', 'debit').eq('status', 'paid'),
  ])

  const openJobs = jobsResult.data?.length ?? 0
  const totalOwed = (jobsResult.data ?? []).reduce((s, j) => s + Number(j.total_quote), 0)
  const totalIncome = (incomeResult.data ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = (expenseResult.data ?? []).reduce((s, t) => s + Number(t.amount), 0)

  return (
    `📊 Summary — ${label}:\n\n` +
    `🧾 Open Jobs: ${openJobs}\n` +
    `⏳ Owed: KES ${totalOwed.toLocaleString()}\n` +
    `💵 Income: KES ${totalIncome.toLocaleString()}\n` +
    `💸 Expenses: KES ${totalExpense.toLocaleString()}\n` +
    `💰 Net: KES ${(totalIncome - totalExpense).toLocaleString()}`
  )
}

// ─── Unknown Intent Response ───

const UNKNOWN_RESPONSE =
  '👋 Hi! I don\'t understand this message.\n' +
  'Here is what you can do:\n\n' +
  '🛠 *Create Job*\n' +
  '  "Job Jane 1000 Print business cards"\n\n' +
  '👤 *Check Balance*\n' +
  '  "Bal Jane"\n\n' +
  '📊 *Reports*\n' +
  '  "debts today" — today\'s debts\n' +
  '  "income this week" — weekly income\n' +
  '  "summary" — full overview\n\n' +
  '💳 *Record Payment*\n' +
  '  "Received 500" or forward M-Pesa SMS\n\n' +
  '🔑 *Login Portal*\n' +
  '  Send "Login" to access web dashboard'

// ─── Webhook Verification (GET) — Cloud API only ───

export async function GET(request: NextRequest) {
  const provider = getWhatsAppProvider()
  if (provider.handleVerification) {
    return provider.handleVerification(request)
  }
  return new Response('OK', { status: 200 })
}

// ─── Main Handler (POST) ───

export async function POST(request: NextRequest) {
  const provider = getWhatsAppProvider()

  try {
    const inbound = await provider.parseInbound(request)
    if (!inbound) {
      return provider.buildResponse('😕 Message not understood. Please try again.')
    }

    const { phone, text: messageText, messageId } = inbound

    // Mark message as read immediately (Cloud API only)
    if (messageId && provider.markAsRead) {
      provider.markAsRead(messageId).catch(() => {})
    }

    // Helper: send reply through the provider and return the HTTP response
    async function reply(message: string) {
      await provider.sendReply(phone, message)
      return provider.buildResponse(message)
    }

    // Handle registration — creates account if new, returns tenantId
    const { tenantId, welcomeMsg } = await handleRegistration(phone, messageText)
    
    if (!tenantId) {
      // Error during registration
      return reply(welcomeMsg || '😕 System error. Please try again later.')
    }

    // Check if user is in login flow (awaiting email)
    const { data: tenantState } = await supabaseAdmin
      .from('tenants')
      .select('login_state')
      .eq('id', tenantId)
      .single()

    if (tenantState?.login_state === 'awaiting_email') {
      const loginResult = await handleWhatsAppLogin(tenantId, messageText)
      return reply(loginResult.response)
    }

    // New user — show welcome message
    if (welcomeMsg) {
      return reply(welcomeMsg)
    }

    // Send processing indicator for AI parsing (Cloud API only)
    if (provider.sendProcessingIndicator) {
      provider.sendProcessingIndicator(phone).catch(() => {})
    }

    // 1. AI-powered intent parsing — all messages go through AI
    let intent: Awaited<ReturnType<typeof parseWithAI>>

    try {
      intent = await parseWithAI(messageText)
      console.log('AI parsed:', intent.type, '→', intent.raw_summary)
    } catch (error) {
      console.error('AI parsing failed, falling back to regex:', error)
      // Fallback: try regex parsers when AI is unavailable
      const mpesaResult = await handleMpesaPayment(tenantId, messageText)
      if (mpesaResult) return reply(mpesaResult)
      if (/^login$/i.test(messageText.trim())) {
        const loginResult = await handleWhatsAppLogin(tenantId, messageText)
        return reply(loginResult.response)
      }
      const jobParsed = parseJobMessage(messageText)
      if (jobParsed) {
        const msg = await handleJobCreation(tenantId, {
          customerName: jobParsed.customerName,
          items: [{ description: jobParsed.description, quantity: 1, unit_price: jobParsed.amount, total: jobParsed.amount }],
        })
        return reply(msg)
      }
      const balanceName = parseBalanceQuery(messageText)
      if (balanceName) return reply(await handleBalanceQuery(tenantId, balanceName))
      return reply('🤔 I don\'t understand this message. Try again.')
    }

    // 2. Route based on AI-parsed intent
    let responseMsg: string

    switch (intent.type) {
      case 'PAYMENT':
        responseMsg = await handleAIPayment(tenantId, intent.data, messageText)
        break
      case 'JOB':
        responseMsg = await handleJobCreation(tenantId, {
          customerName: intent.data.customer_name,
          items: intent.data.items,
        })
        break
      case 'QUERY':
        responseMsg = await handleBalanceQuery(tenantId, intent.data.target_name)
        break
      case 'REPORT':
        responseMsg = await handleReport(tenantId, intent.data.report, intent.data.period)
        break
      case 'LOGIN': {
        const loginResult = await handleWhatsAppLogin(tenantId, messageText)
        responseMsg = loginResult.response
        break
      }
      case 'UNKNOWN':
      default:
        responseMsg = UNKNOWN_RESPONSE
    }

    return reply(responseMsg)
  } catch (error) {
    console.error('Unexpected error:', error)
    return provider.buildResponse('😕 Something went wrong. Please try again later.')
  }
}
