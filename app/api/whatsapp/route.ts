import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// ─── Meta WhatsApp Cloud API Config ───
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!          // Permanent access token
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID!    // Phone number ID from Meta dashboard
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN! // Your custom webhook verify token
const GRAPH_API_VERSION = "v21.0"

// ─── Send reply via Meta Cloud API ───
async function sendWhatsAppReply(to: string, message: string) {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_ID}/messages`

    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to,
                type: "text",
                text: { body: message },
            }),
        })
        if (!resp.ok) {
            const err = await resp.text()
            console.error("WhatsApp send failed:", resp.status, err)
        }
    } catch (err) {
        console.error("WhatsApp send error:", err)
    }
}

// ─── Extract incoming message from Meta webhook payload ───
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMessage(body: any): { from: string; text: string } | null {
    try {
        const entry = body?.entry?.[0]
        const change = entry?.changes?.[0]
        const value = change?.value
        const message = value?.messages?.[0]

        if (!message || message.type !== "text") return null

        return {
            from: message.from,       // e.g. "254712345678" (no + prefix)
            text: message.text?.body ?? "",
        }
    } catch {
        return null
    }
}

// ─── Tenant & Customer Resolution ───

async function resolveTenant(phone: string) {
    // Meta sends "254..." without +, but DB may store "+254..."
    const phoneVariants = [phone, `+${phone}`]

    const { data, error } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .in("owner_phone", phoneVariants)
        .maybeSingle()
    if (error || !data) {
        console.error("Tenant lookup failed for phone:", phone, error)
        return null
    }
    return data.id as string
}

async function resolveCustomer(tenantId: string, name: string, phone: string | null) {
    const normalizedName = name.replace(/\s+/g, " ").trim()

    if (phone) {
        const { data: byPhone } = await supabaseAdmin
            .from("customers")
            .select("id, name")
            .eq("tenant_id", tenantId)
            .eq("phone", phone)
            .maybeSingle()

        if (byPhone) {
            if (byPhone.name === byPhone.id || byPhone.name === phone) {
                await supabaseAdmin
                    .from("customers")
                    .update({ name: normalizedName })
                    .eq("id", byPhone.id)
            }
            return byPhone as { id: string; name: string }
        }
    }

    const { data: byName } = await supabaseAdmin
        .from("customers")
        .select("id, name, phone")
        .eq("tenant_id", tenantId)
        .ilike("name", `%${normalizedName}%`)
        .limit(1)

    if (byName && byName.length > 0) {
        const existing = byName[0]
        if (phone && (existing.phone === existing.name || !existing.phone.match(/^\+?\d/))) {
            await supabaseAdmin
                .from("customers")
                .update({ phone })
                .eq("id", existing.id)
        }
        return { id: existing.id, name: existing.name }
    }

    const { data, error } = await supabaseAdmin
        .from("customers")
        .insert({ phone: phone ?? normalizedName, name: normalizedName, tenant_id: tenantId })
        .select("id, name")
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
        amount: Number(match[2].replace(/,/g, "")),
        description: match[3].trim(),
    }
}

async function handleJobCreation(tenantId: string, parsed: { customerName: string; amount: number; description: string }): Promise<string> {
    const normalizedName = parsed.customerName.replace(/\s+/g, " ").trim()

    const { data: customers } = await supabaseAdmin
        .from("customers")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .ilike("name", `%${normalizedName}%`)
        .limit(1)

    let customerId: string
    let customerName: string

    if (customers && customers.length > 0) {
        customerId = customers[0].id
        customerName = customers[0].name
    } else {
        const { data: newCust, error } = await supabaseAdmin
            .from("customers")
            .insert({ name: normalizedName, phone: normalizedName, tenant_id: tenantId })
            .select("id, name")
            .single()
        if (error || !newCust) return "⚠️ Hatukuweza kuunda customer. Jaribu tena."
        customerId = newCust.id
        customerName = newCust.name
    }

    const { error } = await supabaseAdmin
        .from("jobs")
        .insert({
            tenant_id: tenantId,
            customer_id: customerId,
            description: parsed.description,
            total_quote: parsed.amount,
        })

    if (error) return "⚠️ Tatizo la kuunda job card. Jaribu tena."

    return (
        `📋 Job Card imeundwa!\n` +
        `👤 ${customerName}\n` +
        `💰 Quote: KES ${parsed.amount.toLocaleString()}\n` +
        `📝 ${parsed.description}\n\n` +
        `Tuma M-Pesa message kupata payment ikirekodiwa automatically.`
    )
}

// ─── Balance Query ───
function parseBalanceQuery(text: string) {
    const match = text.match(/^Bal\s+(.+)$/i)
    if (!match) return null
    return match[1].trim()
}

async function handleBalanceQuery(tenantId: string, customerName: string): Promise<string> {
    const { data: customers } = await supabaseAdmin
        .from("customers")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .ilike("name", `%${customerName}%`)
        .limit(1)

    if (!customers || customers.length === 0) {
        return `❌ Customer "${customerName}" hajapatikana.`
    }

    const customer = customers[0]

    const { data: txns } = await supabaseAdmin
        .from("transactions")
        .select("amount, type")
        .eq("customer_id", customer.id)
        .eq("tenant_id", tenantId)
        .in("type", ["credit", "debit"])

    const totalCredits = (txns ?? [])
        .filter((t) => t.type === "credit")
        .reduce((s, t) => s + Number(t.amount), 0)
    const totalDebits = (txns ?? [])
        .filter((t) => t.type === "debit")
        .reduce((s, t) => s + Number(t.amount), 0)
    const netPaid = totalCredits - totalDebits

    const { data: jobs } = await supabaseAdmin
        .from("jobs")
        .select("id, description, total_quote")
        .eq("customer_id", customer.id)
        .eq("tenant_id", tenantId)
        .eq("status", "open")
        .order("created_at", { ascending: true })

    if (!jobs || jobs.length === 0) {
        if (netPaid > 0) {
            return `✅ ${customer.name} hana open jobs.\n💰 Wallet: KES ${netPaid.toLocaleString()} (credit)`
        }
        return `✅ ${customer.name} hana open jobs. Hakuna deni.`
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

        lines.push(`📋 ${job.description}`)
        lines.push(`   Quote: KES ${quote.toLocaleString()} | Paid: KES ${applied.toLocaleString()} | Bal: KES ${remaining.toLocaleString()} (${pct}%)`)
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

    return lines.join("\n")
}

// ─── M-Pesa Payment Processing ───
async function handleMpesaPayment(tenantId: string, messageText: string): Promise<string | null> {
    if (/Fuliza\s+M-PESA/i.test(messageText)) {
        return "ℹ️ Fuliza payments hazirekodiwa kwa sasa."
    }

    const isDebit = /sent\s+to/i.test(messageText)
    const isCredit = /received.*from/i.test(messageText)

    const code = messageText.match(/([A-Z0-9]{10})\sConfirmed/i)?.[1]
    const amount = messageText.match(/Ksh([\d,.]+)/i)?.[1]?.replace(/,/g, "")

    let transaction_date: string | null = null
    const dateTimeMatch = messageText.match(/on\s+(\d{1,2})\/(\d{1,2})\/(\d{2})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (dateTimeMatch) {
        const [, day, month, year, hours, minutes, period] = dateTimeMatch
        let hour24 = parseInt(hours)
        if (period.toUpperCase() === "PM" && hour24 !== 12) hour24 += 12
        if (period.toUpperCase() === "AM" && hour24 === 12) hour24 = 0
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
        customer_name = messageText.match(/sent\s+to\s+(.+?)(?:\.\s+for|\s+on\s+\d)/i)?.[1]?.trim() || null
        customer_phone = messageText.match(/for\s+account\s+(\S+)\s+on/i)?.[1] || null
    }

    if (!code || !amount || !customer_name || (!isCredit && !isDebit)) {
        return null
    }

    const txType = isDebit ? "debit" : "credit"

    const [dupResult, customer] = await Promise.all([
        supabaseAdmin.from("transactions").select("id").eq("mpesa_code", code).maybeSingle(),
        resolveCustomer(tenantId, customer_name, customer_phone),
    ])

    if (dupResult.data) {
        return "ℹ️ Payment isha-recordiwa."
    }

    if (!customer) {
        return "⚠️ Kuna tatizo la system. Tafadhali try tena baadaye."
    }

    const { error: txError } = await supabaseAdmin
        .from("transactions")
        .insert({
            mpesa_code: code,
            amount,
            type: txType,
            status: "paid",
            raw_text: messageText,
            tenant_id: tenantId,
            customer_id: customer.id,
            transaction_date,
        })

    if (txError) {
        console.error("Transaction insert failed:", txError)
        return "⚠️ Kuna tatizo la save payment. Tafadhali try tena baadaye."
    }

    const txLabel = txType === "credit" ? "Umepokea" : "Umetuma"
    return `✅ ${txLabel} KES ${amount} ${txType === "credit" ? "kutoka kwa" : "kwa"} ${customer.name}.\nTuma "Bal ${customer.name}" kuona balance.`
}

// ─── Process message and send reply ───
async function processAndReply(senderPhone: string, messageText: string) {
    const tenantId = await resolveTenant(senderPhone)
    if (!tenantId) {
        await sendWhatsAppReply(senderPhone, "⚠️ Kuna tatizo la system. Tafadhali try tena baadaye.")
        return
    }

    // 1. Job creation
    const jobParsed = parseJobMessage(messageText)
    if (jobParsed) {
        const reply = await handleJobCreation(tenantId, jobParsed)
        await sendWhatsAppReply(senderPhone, reply)
        return
    }

    // 2. Balance query
    const balanceName = parseBalanceQuery(messageText)
    if (balanceName) {
        const reply = await handleBalanceQuery(tenantId, balanceName)
        await sendWhatsAppReply(senderPhone, reply)
        return
    }

    // 3. M-Pesa payment
    const mpesaResult = await handleMpesaPayment(tenantId, messageText)
    if (mpesaResult) {
        await sendWhatsAppReply(senderPhone, mpesaResult)
        return
    }

    await sendWhatsAppReply(
        senderPhone,
        "🤔 Sijui message hii. Jaribu moja ya hizi:\n\n" +
        "📋 *Job* <Jina> <Amount> <Maelezo>\n" +
        "   Mfano: Job Jane 1000 Print business cards\n\n" +
        "💰 *Bal* <Jina>\n" +
        "   Mfano: Bal Jane\n\n" +
        "📲 Forward M-Pesa SMS → itarekodiwa automatically"
    )
}

// ─── Webhook Verification (GET) ───
// Meta sends this once when you register the webhook URL
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get("hub.mode")
    const token = searchParams.get("hub.verify_token")
    const challenge = searchParams.get("hub.challenge")

    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
        console.log("Webhook verified")
        return new NextResponse(challenge, { status: 200 })
    }

    return new NextResponse("Forbidden", { status: 403 })
}

// ─── Webhook Handler (POST) ───
// Meta sends incoming messages here as JSON
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const msg = extractMessage(body)
        if (!msg) {
            // Could be a status update, delivery receipt, etc. — acknowledge it
            return NextResponse.json({ status: "ok" })
        }

        // Respond to Meta immediately, process async
        processAndReply(msg.from, msg.text).catch((err) =>
            console.error("processAndReply failed:", err)
        )

        return NextResponse.json({ status: "ok" })
    } catch (error) {
        console.error("Webhook error:", error)
        return NextResponse.json({ status: "error" }, { status: 500 })
    }
}
