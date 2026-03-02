import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { parseWithGemini } from '@/lib/ai-parser'

function twimlResponse(message: string) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message}</Message>
</Response>`
  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

async function resolveTenant(phone: string) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('owner_phone', phone)
    .maybeSingle()
  if (error || !data) {
    console.error('Tenant lookup failed for phone:', phone, error)
    return null
  }
  return data.id as string
}

async function resolveCustomer(tenantId: string, name: string, phone: string | null) {
  // Normalize name: collapse multiple spaces
  const normalizedName = name.replace(/\s+/g, ' ').trim()

  // First try by phone (most reliable identifier)
  if (phone) {
    const { data: byPhone } = await supabaseAdmin
      .from('customers')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .maybeSingle()

    if (byPhone) {
      // Update name if it was a placeholder (e.g. phone used as name)
      if (byPhone.name === byPhone.id || byPhone.name === phone) {
        await supabaseAdmin.from('customers').update({ name: normalizedName }).eq('id', byPhone.id)
      }
      return byPhone as { id: string; name: string }
    }
  }

  // Then try by name (for customers created via Job command without phone)
  const { data: byName } = await supabaseAdmin
    .from('customers')
    .select('id, name, phone')
    .eq('tenant_id', tenantId)
    .ilike('name', `%${normalizedName}%`)
    .limit(1)

  if (byName && byName.length > 0) {
    const existing = byName[0]
    // If this customer was created without a real phone, update it
    if (phone && (existing.phone === existing.name || !existing.phone.match(/^\+?\d/))) {
      await supabaseAdmin.from('customers').update({ phone }).eq('id', existing.id)
    }
    return { id: existing.id, name: existing.name }
  }

  // Create new customer
  const { data, error } = await supabaseAdmin
    .from('customers')
    .insert({ phone: phone ?? normalizedName, name: normalizedName, tenant_id: tenantId })
    .select('id, name')
    .single()
  if (error || !data) return null
  return data as { id: string; name: string }
}

// ─── Job Creation ───
// Format: "Job <CustomerName> <Amount> <Description>"
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
) {
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
    if (error || !newCust) return twimlResponse('⚠️ Hatukuweza kuunda customer. Jaribu tena.')
    customerId = newCust.id
    customerName = newCust.name
  }

  // Insert one job per line item
  const jobRows = parsed.items.map((item) => ({
    tenant_id: tenantId,
    customer_id: customerId,
    description: item.quantity > 1
      ? `${item.description} (${item.quantity} × KES ${item.unit_price.toLocaleString()})`
      : item.description,
    total_quote: item.total,
  }))

  const { error } = await supabaseAdmin.from('jobs').insert(jobRows)
  if (error) return twimlResponse('⚠️ Tatizo la kuunda job card. Jaribu tena.')

  const grandTotal = parsed.items.reduce((s, i) => s + i.total, 0)

  // Build response
  const lines = [`📋 Job Card${parsed.items.length > 1 ? 's' : ''} imeundwa!`, `👤 ${customerName}`]
  for (const item of parsed.items) {
    if (item.quantity > 1) {
      lines.push(`  📝 ${item.description} — ${item.quantity} × KES ${item.unit_price.toLocaleString()} = KES ${item.total.toLocaleString()}`)
    } else {
      lines.push(`  📝 ${item.description} — KES ${item.total.toLocaleString()}`)
    }
  }
  if (parsed.items.length > 1) {
    lines.push(`💰 Total: KES ${grandTotal.toLocaleString()}`)
  }
  lines.push('', 'Tuma M-Pesa message kupata payment ikirekodiwa automatically.')

  return twimlResponse(lines.join('\n'))
}

// ─── Balance Query ───
// Format: "Bal <CustomerName>"
function parseBalanceQuery(text: string) {
  const match = text.match(/^Bal\s+(.+)$/i)
  if (!match) return null
  return match[1].trim()
}

async function handleBalanceQuery(tenantId: string, customerName: string) {
  const { data: customers } = await supabaseAdmin
    .from('customers')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .ilike('name', `%${customerName}%`)
    .limit(1)

  if (!customers || customers.length === 0) {
    return twimlResponse(`❌ Customer "${customerName}" hajapatikana.`)
  }

  const customer = customers[0]

  // Get ALL transactions for this customer (credits and debits)
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

  // Get open jobs (what they owe)
  const { data: jobs } = await supabaseAdmin
    .from('jobs')
    .select('id, description, total_quote')
    .eq('customer_id', customer.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'open')
    .order('created_at', { ascending: true })

  if (!jobs || jobs.length === 0) {
    if (netPaid > 0) {
      return twimlResponse(
        `✅ ${customer.name} hana open jobs.\n💰 Wallet: KES ${netPaid.toLocaleString()} (credit)`
      )
    }
    return twimlResponse(`✅ ${customer.name} hana open jobs. Hakuna deni.`)
  }

  const totalQuote = jobs.reduce((s, j) => s + Number(j.total_quote), 0)

  // Walk through jobs oldest-first, deducting from wallet
  let wallet = Math.max(0, netPaid)
  const lines: string[] = [`📊 Balance ya ${customer.name}:\n`]

  for (const job of jobs) {
    const quote = Number(job.total_quote)
    const applied = Math.min(wallet, quote)
    wallet -= applied
    const remaining = quote - applied
    const pct = quote > 0 ? Math.round((applied / quote) * 100) : 0

    lines.push(`📋 ${job.description}`)
    lines.push(
      `   Quote: KES ${quote.toLocaleString()} | Paid: KES ${applied.toLocaleString()} | Bal: KES ${remaining.toLocaleString()} (${pct}%)`
    )
  }

  const owes = Math.max(0, totalQuote - netPaid)
  const overpaid = Math.max(0, netPaid - totalQuote)

  lines.push(`\n💼 Jobs Total: KES ${totalQuote.toLocaleString()}`)
  lines.push(`💰 Total Paid: KES ${totalCredits.toLocaleString()}`)
  if (totalDebits > 0) {
    lines.push(`💸 Paid Out: KES ${totalDebits.toLocaleString()}`)
    lines.push(`💰 Net Paid: KES ${netPaid.toLocaleString()}`)
  }
  if (overpaid > 0) {
    lines.push(`✅ Credit: KES ${overpaid.toLocaleString()}`)
  } else {
    lines.push(`⏳ Owes: KES ${owes.toLocaleString()}`)
  }

  return twimlResponse(lines.join('\n'))
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
) {
  // Check for duplicate M-Pesa code if present
  if (data.code) {
    const { data: dup } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('mpesa_code', data.code)
      .maybeSingle()
    if (dup) {
      return twimlResponse('ℹ️ Payment isha-recordiwa.')
    }
  }

  const customer = await resolveCustomer(tenantId, data.customer_name, data.customer_phone)
  if (!customer) {
    return twimlResponse('⚠️ Kuna tatizo la system. Tafadhali try tena baadaye.')
  }

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
    return twimlResponse('⚠️ Kuna tatizo la save payment. Tafadhali try tena baadaye.')
  }

  const txLabel = data.transaction_type === 'credit' ? 'Umepokea' : 'Umetuma'
  const direction = data.transaction_type === 'credit' ? 'kutoka kwa' : 'kwa'
  return twimlResponse(
    `✅ ${txLabel} KES ${data.amount.toLocaleString()} ${direction} ${customer.name}.` +
      (data.code ? `\n📱 M-Pesa: ${data.code}` : '') +
      `\nTuma "Bal ${customer.name}" kuona balance.`
  )
}

// ─── M-Pesa Payment Processing (regex fallback) ───
async function handleMpesaPayment(tenantId: string, messageText: string) {
  if (/Fuliza\s+M-PESA/i.test(messageText)) {
    return twimlResponse('ℹ️ Fuliza payments hazirekodiwa kwa sasa.')
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

  if (!code || !amount || !customer_name || (!isCredit && !isDebit)) {
    return null
  }

  const txType = isDebit ? 'debit' : 'credit'

  // Check duplicate and resolve customer in parallel
  const [dupResult, customer] = await Promise.all([
    supabaseAdmin.from('transactions').select('id').eq('mpesa_code', code).maybeSingle(),
    resolveCustomer(tenantId, customer_name, customer_phone),
  ])

  if (dupResult.data) {
    return twimlResponse('ℹ️ Payment isha-recordiwa.')
  }

  if (!customer) {
    return twimlResponse('⚠️ Kuna tatizo la system. Tafadhali try tena baadaye.')
  }

  // Insert transaction
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
    return twimlResponse('⚠️ Kuna tatizo la save payment. Tafadhali try tena baadaye.')
  }

  const txLabel = txType === 'credit' ? 'Umepokea' : 'Umetuma'
  return twimlResponse(
    `✅ ${txLabel} KES ${amount} ${txType === 'credit' ? 'kutoka kwa' : 'kwa'} ${customer.name}.\nTuma "Bal ${customer.name}" kuona balance.`
  )
}

// ─── WhatsApp Login ───
async function handleWhatsAppLogin(tenantId: string) {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('owner_email, user_id')
    .eq('id', tenantId)
    .single()

  // Fall back to auth.users email if owner_email not set yet
  let email = tenant?.owner_email
  if (!email && tenant?.user_id) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(tenant.user_id)
    email = authUser?.user?.email ?? ''
    // Backfill owner_email
    if (email) {
      await supabaseAdmin.from('tenants').update({ owner_email: email }).eq('id', tenantId)
    }
  }

  if (!email) {
    return twimlResponse('⚠️ Hakuna email iliyohusishwa na akaunti yako. Ingia kwa email kwanza.')
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '.app') ??
    ''

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/customers` },
  })

  if (error || !data.properties?.hashed_token) {
    console.error('Magic link generation failed:', error)
    return twimlResponse('⚠️ Tatizo la kuunda login link. Jaribu tena.')
  }

  const loginUrl = `${appUrl}/auth/callback?token_hash=${data.properties.hashed_token}&type=email&next=/customers`

  return twimlResponse(
    `🔐 Bonyeza link hii kuingia:\n${loginUrl}\n\n⏰ Link itaisha baada ya dakika 60.`
  )
}

// ─── Main Handler ───
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const body = Object.fromEntries(formData.entries())
    const message_text = body['Body'] as string
    const tenant_phone = body['From']?.toString().replace('whatsapp:', '')

    if (!message_text || !tenant_phone) {
      return twimlResponse('⚠️ Message haikueleweka. Tafadhali tuma tena.')
    }

    const tenantId = await resolveTenant(tenant_phone)
    if (!tenantId) {
      return twimlResponse('⚠️ Kuna tatizo la system. Tafadhali try tena baadaye.')
    }

    // 1. AI-powered intent parsing via Gemini — all messages go through AI
    let intent: Awaited<ReturnType<typeof parseWithGemini>>

    try {
      intent = await parseWithGemini(message_text)
      console.log('Gemini parsed:', intent.type, '→', intent.raw_summary)
    } catch (error) {
      console.error('Gemini parsing failed, falling back to regex:', error)
      // Fallback: try regex parsers when AI is unavailable
      const mpesaResult = await handleMpesaPayment(tenantId, message_text)
      if (mpesaResult) return mpesaResult
      if (/^login$/i.test(message_text.trim())) return handleWhatsAppLogin(tenantId)
      const jobParsed = parseJobMessage(message_text)
      if (jobParsed) return handleJobCreation(tenantId, {
          customerName: jobParsed.customerName,
          items: [{ description: jobParsed.description, quantity: 1, unit_price: jobParsed.amount, total: jobParsed.amount }],
        })
      const balanceName = parseBalanceQuery(message_text)
      if (balanceName) return handleBalanceQuery(tenantId, balanceName)
      return twimlResponse('🤔 Sijui message hii. Jaribu tena.')
    }

    // 2. Route based on AI-parsed intent
    switch (intent.type) {
      case 'PAYMENT':
        return handleAIPayment(tenantId, intent.data, message_text)
      case 'JOB':
        return handleJobCreation(tenantId, {
          customerName: intent.data.customer_name,
          items: intent.data.items,
        })
      case 'QUERY':
        return handleBalanceQuery(tenantId, intent.data.target_name)
      case 'LOGIN':
        return handleWhatsAppLogin(tenantId)
      case 'UNKNOWN':
      default:
        return twimlResponse(
          '🤔 Sijui message hii. Jaribu moja ya hizi:\n\n' +
            '📋 Unda job: "Job Jane 1000 Print business cards"\n' +
            '   Au kwa Kiswahili: "nimefanya kazi ya Jane bei 1000 business cards"\n\n' +
            '💰 Angalia balance: "Bal Jane" au "Jane ananidai ngapi"\n\n' +
            '📲 Forward M-Pesa SMS → itarekodiwa automatically\n\n' +
            '💵 Rekodi payment: "Ameleta 500" au "Nimepewa 200 na Juma"\n\n' +
            '🔐 Tuma "Login" kupata link ya kuingia'
        )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return twimlResponse('⚠️ Kuna tatizo. Tafadhali try tena baadaye.')
  }
}