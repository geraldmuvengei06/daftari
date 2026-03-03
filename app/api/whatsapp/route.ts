import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { parseWithAI } from '@/lib/ai-parser'
import { getWhatsAppProvider, type WhatsAppProvider } from '@/lib/whatsapp'

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

function getHelpMessage() {
  return (
    '🎉 Karibu! Akaunti yako iko tayari.\n' +
    'Hizi ndizo unazoweza kufanya:\n\n' +
    '🛠 *Unda Job*\n' +
    '  "Job Jane 1000 Print business cards"\n' +
    '  "nimefanya kazi ya Jane bei 1000 business cards"\n\n' +
    '👤 *Angalia Balance*\n' +
    '  "Bal Jane" au "Jane ananidai ngapi"\n\n' +
    '📊 *Ripoti*\n' +
    '  "deni za leo" — madeni ya leo\n' +
    '  "mapato ya wiki hii" — income ya wiki\n' +
    '  "muhtasari" — overview kamili\n\n' +
    '💳 *Rekodi Payment*\n' +
    '  "Ameleta 500" au forward M-Pesa SMS\n\n' +
    '🔑 *Login Portal*\n' +
    '  Tuma "Login" kupata link kwa email\n' +
    '  Portal ina ripoti kamili na dashboard\n\n' +
    '💡 Tuma message yoyote kuanza!'
  )
}

// ─── Registration Flow ───

async function handleRegistration(provider: WhatsAppProvider, phone: string, messageText: string) {
  const tenant = await resolveTenant(phone)
  const isGetStarted = /^get\s*started$/i.test(messageText.trim())

  if (!tenant) {
    const { data: newTenant, error } = await supabaseAdmin
      .from('tenants')
      .insert({
        owner_phone: phone,
        business_name: 'My Business',
        registration_state: 'awaiting_email',
      })
      .select('id')
      .single()

    if (error || !newTenant) {
      console.error('Failed to create tenant:', error)
      return '😕 Kuna tatizo la system. Tafadhali jaribu tena baadaye.'
    }

    const welcomeMsg = isGetStarted
      ? '🎉 Karibu! Asante kwa kuchagua huduma yetu.\n\n'
      : '👋 Karibu! Tunaona hii ni mara yako ya kwanza kutumia huduma hii.\n\n'

    return (
      welcomeMsg +
      `📱 Nambari yako ${phone} imesajiliwa.\n\n` +
      '📧 Tafadhali tuma jina lako/biashara yako na email yako.\n' +
      'Mfano: Juma Electronics, juma@gmail.com'
    )
  }

  if (tenant.registration_state === 'awaiting_email') {
    return handleAwaitingEmail(tenant.id, messageText)
  }

  if (tenant.registration_state === 'awaiting_verification') {
    return handleAwaitingVerification(tenant.id, messageText)
  }

  // registration_state === 'complete'
  // If user sends "Get Started", show them the help/welcome message
  if (isGetStarted) {
    return '🎉 Karibu tena! Akaunti yako iko tayari.\n\n' + getHelpMessage().split('\n').slice(1).join('\n')
  }

  // Otherwise continue to normal flow
  return null
}

async function handleAwaitingEmail(tenantId: string, messageText: string): Promise<string> {
  const text = messageText.trim()
  const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/

  // Try to extract email from the message
  const emailMatch = text.match(emailRegex)
  if (!emailMatch) {
    return (
      '📧 Sijapata email sahihi. Tafadhali tuma jina lako/biashara na email.\n' +
      'Mfano: Juma Electronics, juma@gmail.com'
    )
  }

  const email = emailMatch[0].toLowerCase()
  
  // Extract business name (everything before the email, cleaned up)
  let businessName = text.replace(emailRegex, '').replace(/[,;:\-]+/g, ' ').trim()
  if (!businessName || businessName.length < 2) {
    businessName = 'My Business'
  }

  // Update business name
  await supabaseAdmin
    .from('tenants')
    .update({ business_name: businessName })
    .eq('id', tenantId)

  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email
  )

  if (existingUser) {
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('user_id', existingUser.id)
      .maybeSingle()

    if (existingTenant && existingTenant.id !== tenantId) {
      return (
        '⚠️ Email hii tayari inatumika na akaunti nyingine.\n' +
        'Tafadhali tuma email tofauti.'
      )
    }

    await supabaseAdmin
      .from('tenants')
      .update({
        user_id: existingUser.id,
        owner_email: email,
        registration_state: existingUser.email_confirmed_at ? 'complete' : 'awaiting_verification',
      })
      .eq('id', tenantId)

    if (existingUser.email_confirmed_at) {
      return '✅ Email yako imethibitishwa tayari!\n\n' + getHelpMessage()
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/customers`,
    })

    return (
      `📧 Tumetuma barua ya uthibitisho kwa ${email}.\n\n` +
      '📬 Fungua email yako ubonyeze link ya uthibitisho.\n' +
      '⏳ Baada ya kuthibitisha, tuma message yoyote hapa kuendelea.'
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: false,
  })

  if (createError || !newUser?.user) {
    console.error('Failed to create auth user:', createError)
    return (
      '😕 Kuna tatizo la kuunda akaunti. Tafadhali jaribu tena.\n' +
      'Tuma jina na email yako tena.'
    )
  }

  await supabaseAdmin
    .from('tenants')
    .update({
      user_id: newUser.user.id,
      owner_email: email,
      registration_state: 'awaiting_verification',
    })
    .eq('id', tenantId)

  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/customers`,
  })

  if (inviteError) {
    await supabaseAdmin.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${appUrl}/auth/callback?next=/customers` },
    })
  }

  return (
    `✅ Asante${businessName !== 'My Business' ? ` ${businessName}` : ''}! Email yako ${email} imesajiliwa.\n\n` +
    '📬 Tumetuma barua ya uthibitisho kwa email yako.\n' +
    'Fungua email yako ubonyeze link ya uthibitisho.\n\n' +
    '⏳ Baada ya kuthibitisha, tuma message yoyote hapa kuendelea.'
  )
}

async function handleAwaitingVerification(tenantId: string, messageText: string): Promise<string> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('user_id, owner_email')
    .eq('id', tenantId)
    .single()

  if (!tenant?.user_id) {
    await supabaseAdmin
      .from('tenants')
      .update({ registration_state: 'awaiting_email' })
      .eq('id', tenantId)
    return (
      '📧 Tafadhali tuma email yako ili tukamilishe usajili.\n' +
      'Mfano: juma@gmail.com'
    )
  }

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(tenant.user_id)

  if (authUser?.user?.email_confirmed_at) {
    await supabaseAdmin
      .from('tenants')
      .update({ registration_state: 'complete' })
      .eq('id', tenantId)
    return '✅ Email yako imethibitishwa! Akaunti yako iko tayari.\n\n' + getHelpMessage()
  }

  const text = messageText.trim().toLowerCase()
  if (text === 'resend' || text === 'tuma tena') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const email = tenant.owner_email

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/customers`,
    })

    if (error) {
      await supabaseAdmin.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${appUrl}/auth/callback?next=/customers` },
      })
    }

    return (
      `📧 Tumetuma tena barua ya uthibitisho kwa ${email}.\n` +
      'Fungua email yako ubonyeze link.'
    )
  }

  const [local, domain] = (tenant.owner_email || '').split('@')
  const masked = local ? local.slice(0, 2) + '***@' + domain : tenant.owner_email

  return (
    `⏳ Bado tunasubiri uthibitishe email yako (${masked}).\n\n` +
    '📬 Fungua email yako ubonyeze link ya uthibitisho.\n' +
    '🔄 Tuma "resend" au "tuma tena" kupata link mpya.\n\n' +
    '💡 Huwezi kutumia huduma hii bila kuthibitisha email.'
  )
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
    if (error || !newCust) return '😕 Hatukuweza kuunda customer. Jaribu tena.'
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
  if (error) return '😕 Tatizo la kuunda job card. Jaribu tena.'

  const grandTotal = parsed.items.reduce((s, i) => s + i.total, 0)
  const lines = [`✨ Job Card${parsed.items.length > 1 ? 's' : ''} imeundwa!`, `👤 ${customerName}`]
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
  lines.push('', '📲 Tuma M-Pesa message kupata payment ikirekodiwa automatically.')
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
    return `🔍 Customer "${customerName}" hajapatikana.`
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
      return `🎉 ${customer.name} hana open jobs.\n💰 Wallet: KES ${netPaid.toLocaleString()} (credit)`
    }
    return `🎉 ${customer.name} hana open jobs. Hakuna deni.`
  }

  const totalQuote = jobs.reduce((s, j) => s + Number(j.total_quote), 0)
  let wallet = Math.max(0, netPaid)
  const lines: string[] = [`📊 Balance ya ${customer.name}:\n`]

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
    if (dup) return 'ℹ️ Payment hii isha-recordiwa tayari.'
  }

  const customer = await resolveCustomer(tenantId, data.customer_name, data.customer_phone)
  if (!customer) return '😕 Kuna tatizo la system. Tafadhali jaribu tena baadaye.'

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
    return '😕 Kuna tatizo la save payment. Tafadhali jaribu tena baadaye.'
  }

  const txLabel = data.transaction_type === 'credit' ? 'Umepokea' : 'Umetuma'
  const direction = data.transaction_type === 'credit' ? 'kutoka kwa' : 'kwa'
  return (
    `✅ ${txLabel} KES ${data.amount.toLocaleString()} ${direction} ${customer.name}.` +
    (data.code ? `\n📱 M-Pesa: ${data.code}` : '') +
    `\n\n💡 Tuma "Bal ${customer.name}" kuona balance.`
  )
}

// ─── M-Pesa Payment Processing (regex fallback) ───

async function handleMpesaPayment(tenantId: string, messageText: string): Promise<string | null> {
  if (/Fuliza\s+M-PESA/i.test(messageText)) {
    return 'ℹ️ Fuliza payments hazirekodiwa kwa sasa.'
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

  if (dupResult.data) return 'ℹ️ Payment hii isha-recordiwa tayari.'
  if (!customer) return '😕 Kuna tatizo la system. Tafadhali jaribu tena baadaye.'

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
    return '😕 Kuna tatizo la save payment. Tafadhali jaribu tena baadaye.'
  }

  const txLabel = txType === 'credit' ? 'Umepokea' : 'Umetuma'
  return (
    `✅ ${txLabel} KES ${amount} ${txType === 'credit' ? 'kutoka kwa' : 'kwa'} ${customer.name}.\n\n💡 Tuma "Bal ${customer.name}" kuona balance.`
  )
}

// ─── WhatsApp Login ───

async function handleWhatsAppLogin(tenantId: string): Promise<string> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('user_id')
    .eq('id', tenantId)
    .single()

  if (!tenant?.user_id) {
    return (
      '🔒 Hakuna akaunti iliyounganishwa na nambari hii.\n' +
      'Ingia kwanza kwa browser kupata akaunti yako iungane na WhatsApp.'
    )
  }

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(
    tenant.user_id
  )

  const email = authUser?.user?.email
  if (authError || !email) {
    return '🔒 Hakuna email iliyohusishwa na akaunti yako. Ingia kwa email kwanza.'
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/customers`,
  })

  if (error) {
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${appUrl}/auth/callback?next=/customers` },
    })

    if (otpError) {
      console.error('[Login] OTP send failed:', otpError)
      return '😕 Tatizo la kutuma login link. Jaribu tena.'
    }
  }

  const [local, domain] = email.split('@')
  const masked = local.slice(0, 2) + '***@' + domain

  return (
    `📧 Tumetuma login link kwa ${masked}.\n` +
    'Fungua email yako ubonyeze link hiyo kuingia 🔓\n\n' +
    '⏳ Link itaisha baada ya saa 1.'
  )
}

// ─── Reports ───

function getDateRange(period: 'today' | 'week' | 'month' | 'all'): { from: string; label: string } {
  const now = new Date()
  switch (period) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { from: start.toISOString(), label: 'Leo' }
    }
    case 'week': {
      const day = now.getDay()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
      return { from: start.toISOString(), label: 'Wiki hii' }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: start.toISOString(), label: 'Mwezi huu' }
    }
    case 'all':
      return { from: '2000-01-01T00:00:00Z', label: 'Jumla' }
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

    if (!jobs || jobs.length === 0) return `🎉 Hakuna deni ${label.toLowerCase()}. Safi!`

    const total = jobs.reduce((s, j) => s + Number(j.total_quote), 0)
    const lines = [`📊 Deni — ${label}:\n`]

    for (const job of jobs) {
      const customer = (job.customers as unknown as { name: string })?.name ?? 'Unknown'
      lines.push(`  👤 ${customer} — KES ${Number(job.total_quote).toLocaleString()}`)
      lines.push(`     🔹 ${job.description}`)
    }

    lines.push(`\n💰 Jumla: KES ${total.toLocaleString()}`)
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

    if (!txns || txns.length === 0) return `📊 Hakuna mapato ${label.toLowerCase()}.`

    const total = txns.reduce((s, t) => s + Number(t.amount), 0)
    const lines = [`📊 Mapato — ${label}:\n`]

    for (const txn of txns) {
      const customer = (txn.customers as unknown as { name: string })?.name ?? 'Unknown'
      lines.push(`  💵 KES ${Number(txn.amount).toLocaleString()} — ${customer}`)
    }

    lines.push(`\n💰 Jumla: KES ${total.toLocaleString()}`)
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
    `📊 Muhtasari — ${label}:\n\n` +
    `🧾 Open Jobs: ${openJobs}\n` +
    `⏳ Deni: KES ${totalOwed.toLocaleString()}\n` +
    `💵 Mapato: KES ${totalIncome.toLocaleString()}\n` +
    `💸 Matumizi: KES ${totalExpense.toLocaleString()}\n` +
    `💰 Net: KES ${(totalIncome - totalExpense).toLocaleString()}`
  )
}

// ─── Unknown Intent Response ───

const UNKNOWN_RESPONSE =
  '👋 Hujambo! Sijui message hii.\n' +
  'Hizi ndizo unazoweza kufanya:\n\n' +
  '🛠 *Unda Job*\n' +
  '  "Job Jane 1000 Print business cards"\n' +
  '  "nimefanya kazi ya Jane bei 1000 business cards"\n\n' +
  '👤 *Angalia Balance*\n' +
  '  "Bal Jane" au "Jane ananidai ngapi"\n\n' +
  '📊 *Ripoti*\n' +
  '  "deni za leo" — madeni ya leo\n' +
  '  "mapato ya wiki hii" — income ya wiki\n' +
  '  "muhtasari" — overview kamili\n\n' +
  '💳 *Rekodi Payment*\n' +
  '  "Ameleta 500" au forward M-Pesa SMS\n\n' +
  '🔑 *Login Portal*\n' +
  '  Tuma "Login" kupata link kwa email\n' +
  '  Portal ina ripoti kamili na dashboard'

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
      return provider.buildResponse('😕 Message haikueleweka. Tafadhali tuma tena.')
    }

    const { phone, text: messageText } = inbound

    // Helper: send reply through the provider and return the HTTP response
    async function reply(message: string) {
      // For Cloud API, we need to actively send the reply via API
      await provider.sendReply(phone, message)
      return provider.buildResponse(message)
    }

    // Handle registration flow (new users + onboarding)
    const registrationMsg = await handleRegistration(provider, phone, messageText)
    if (registrationMsg) return reply(registrationMsg)

    // At this point, tenant is fully registered
    const tenant = await resolveTenant(phone)
    if (!tenant) return reply('😕 Kuna tatizo la system. Tafadhali jaribu tena baadaye.')
    const tenantId = tenant.id

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
      if (/^login$/i.test(messageText.trim())) return reply(await handleWhatsAppLogin(tenantId))
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
      return reply('🤔 Sijui message hii. Jaribu tena.')
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
      case 'LOGIN':
        responseMsg = await handleWhatsAppLogin(tenantId)
        break
      case 'UNKNOWN':
      default:
        responseMsg = UNKNOWN_RESPONSE
    }

    return reply(responseMsg)
  } catch (error) {
    console.error('Unexpected error:', error)
    return provider.buildResponse('😕 Kuna tatizo. Tafadhali jaribu tena baadaye.')
  }
}
