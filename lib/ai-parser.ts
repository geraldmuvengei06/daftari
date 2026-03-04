import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import features from '@/features.json'

// ─── Types ───

type PaymentIntent = {
  type: 'PAYMENT'
  data: {
    amount: number
    code: string | null
    customer_name: string
    customer_phone: string | null
    transaction_type: 'credit' | 'debit'
    transaction_date: string | null
  }
  raw_summary: string
}

type JobItem = {
  description: string
  quantity: number
  unit_price: number
  total: number
}

type JobIntent = {
  type: 'JOB'
  data: {
    customer_name: string
    items: JobItem[]
    total_price: number
  }
  raw_summary: string
}

type QueryIntent = {
  type: 'QUERY'
  data: {
    target_name: string
    intent: 'BALANCE'
  }
  raw_summary: string
}

type LoginIntent = {
  type: 'LOGIN'
  data: Record<string, never>
  raw_summary: string
}

type ReportIntent = {
  type: 'REPORT'
  data: {
    report: 'unpaid' | 'income' | 'summary'
    period: 'today' | 'week' | 'month' | 'all'
  }
  raw_summary: string
}

type UnknownIntent = {
  type: 'UNKNOWN'
  data: Record<string, never>
  raw_summary: string
}

export type ParsedIntent = PaymentIntent | JobIntent | QueryIntent | ReportIntent | LoginIntent | UnknownIntent

// ─── Feature Flags ───

type AIProvider = 'gemini' | 'openai'

function getProvider(): AIProvider {
  // ENV override takes priority, then feature flag, then default
  const envProvider = process.env.AI_PROVIDER?.toLowerCase()
  if (envProvider === 'openai' || envProvider === 'gemini') return envProvider
  return (features as Record<string, unknown>).aiProvider === 'openai' ? 'openai' : 'gemini'
}

// ─── Shared System Prompt ───

const SYSTEM_PROMPT = `You are a financial message parser for a Kenyan solopreneur's business tool. The user (business owner) sends you a WhatsApp message. Return a JSON object classifying the intent.

CRITICAL CONTEXT: The user is a business owner. Messages are ALWAYS from their perspective:
- When a customer pays them, that is INCOMING money → transaction_type: "credit"
- When the business owner pays out to someone, that is OUTGOING money → transaction_type: "debit"
- DEFAULT ASSUMPTION: Most informal payment messages describe money the business owner RECEIVED (credit). Only classify as "debit" if the message EXPLICITLY says the business owner sent/gave/paid out money.

Rules:

1. M-Pesa SMS: If the text looks like a forwarded M-Pesa confirmation (contains transaction codes like "QK78RT4X5M", "Confirmed", "Ksh"), extract:
   - type: "PAYMENT"
   - data.amount (number, no commas)
   - data.code (the M-Pesa transaction code)
   - data.customer_name (title-cased)
   - data.customer_phone (if present, otherwise null)
   - data.transaction_type: "credit" if "received from", "debit" if "sent to"
   - data.transaction_date: ISO 8601 string if date/time present, otherwise null
   - Fuliza M-PESA messages → type "UNKNOWN"

2. Informal Payments: If the user describes a payment informally, extract:
   - type: "PAYMENT"
   - data.amount, data.customer_name, data.code: null, data.customer_phone: null
   - data.transaction_type: see SWAHILI PAYMENT VOCABULARY below
   - data.transaction_date: null

   SWAHILI PAYMENT VOCABULARY (this is critical — get this right):
   These ALL mean the customer PAID the business owner → "credit":
   - "amelipa" / "amelipa" / "alilipa" = has paid / paid
   - "ameleta" / "ameleta" = has brought (money)
   - "amenilipa" = has paid me
   - "nimepokea" = I have received
   - "nimepewa" = I have been given
   - "paid" / "has paid" / "received" / "got"
   - "analipa" = is paying
   - "amekuja na" = has come with (money)
   - "<Name> <amount>" with no verb (e.g. "John 500") = customer paid → "credit"

   These mean the business owner PAID OUT → "debit":
   - "nimelipa" = I have paid (someone)
   - "nimetoa" = I have given out
   - "nimempa" = I have given them
   - "nimetuma" = I have sent
   - "I paid" / "I sent" / "I gave"
   - "refund" / "nimerudisha" = I returned money

3. Job Creation: If the text describes work done or a new task/order for a customer.
   IMPORTANT: "Job" can be a person's name (e.g. "Job Ochieng"). Do NOT assume "Job" at the start means job creation. Look for these signals of job creation:
   - Describes a service or product being provided (printing, design, repair, etc.)
   - Contains pricing with item descriptions (e.g. "100 cards at 10 each")
   - Uses words like "kazi" (work), "order", "printing", "design", etc.
   - Has the pattern: customer name + service description + price

   If the word "Job" appears as a person's name followed by a service description, treat it as a JOB with "Job" as the customer_name.

   Extract:
   - type: "JOB"
   - data.customer_name (title-cased — this is the CLIENT's name, not the service)
   - data.items: array of { description, quantity (default 1), unit_price, total }
   - data.total_price: sum of all item totals
   
   Parsing items:
   - "100 cards at 10 each" → quantity: 100, unit_price: 10, total: 1000
   - "at 10/-" or "@ 10" means unit_price = 10
   - If only a lump sum, quantity=1, unit_price=total
   - "brought 100 business cards for printing at 10/- each" → the client brought items TO BE printed. The customer is whoever is named. description: "business cards for printing", quantity: 100, unit_price: 10, total: 1000

4. Queries: If the user asks about a SPECIFIC customer's balance/debt:
   - type: "QUERY"
   - data.target_name (title-cased)
   - data.intent: "BALANCE"
   Examples:
   - "Bal Jane" → QUERY, target_name: "Jane"
   - "balance Jane" → QUERY, target_name: "Jane"
   - "how much does Jane owe" → QUERY, target_name: "Jane"
   - "deni ya John" → QUERY, target_name: "John"

5. Reports: If the user asks for a business-wide report (NOT about a specific customer):
   - type: "REPORT"
   - data.report: "unpaid" | "income" | "summary"
   - data.period: "today" | "week" | "month" | "all"
   
   IMPORTANT — these shorthand words map to reports:
   - "balances" / "all balances" / "madeni" → report: "unpaid", period: "all"
   - "bal" (alone, no customer name after it) → report: "unpaid", period: "all"
   - "debts" / "deni" / "debts today" / "deni za leo" → report: "unpaid", period varies
   - "debts this week" / "deni za wiki" → report: "unpaid", period: "week"
   - "debts this month" → report: "unpaid", period: "month"
   - "income" / "mapato" / "income today" / "mapato ya leo" → report: "income", period varies
   - "income this week" / "mapato ya wiki hii" → report: "income", period: "week"
   - "summary" / "muhtasari" → report: "summary", period: "all"
   - "summary today" → report: "summary", period: "today"
   
   Period detection:
   - "today" / "leo" → "today"
   - "this week" / "wiki hii" / "wiki" → "week"
   - "this month" / "mwezi huu" / "mwezi" → "month"
   - No period specified → "all" (default)
   - "debts" alone with no time qualifier → period: "all"
   - "debts today" → period: "today"

6. Login: "Login", "niingie", "sign in" →
   - type: "LOGIN", data: {}

7. Unknown: If nothing matches → type: "UNKNOWN", data: {}

DISAMBIGUATION RULES (apply in order):
- If the message contains an M-Pesa transaction code → always PAYMENT
- If the message describes a service/product with pricing details (quantities, unit prices, descriptions of work) → JOB
- If the message mentions someone paying or bringing money without service details → PAYMENT
- If the message asks about a SPECIFIC person's balance (e.g. "Bal Jane", "balance for John") → QUERY
- If the message is a general balance/debt request with NO specific customer name (e.g. "balances", "bal", "debts", "debts today") → REPORT (unpaid)
- "Job" followed by a service description = JOB intent where "Job" is the customer name
- "Job" followed by just an amount and no service = ambiguous, prefer PAYMENT if payment verbs present

Language: Support English, Swahili, and Sheng. "bob" or "KES" = Kenyan Shillings.

Always include "raw_summary": a short human-readable summary of what you understood.

Output: { "type": "PAYMENT|JOB|QUERY|REPORT|LOGIN|UNKNOWN", "data": { ... }, "raw_summary": "..." }`

// ─── Provider: Gemini ───

async function callGemini(message: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' })
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
    },
    contents: message,
  })
  return response.text ?? ''
}

// ─── Provider: OpenAI ───

async function callOpenAI(message: string): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message },
    ],
  })
  return response.choices[0]?.message?.content ?? ''
}

// ─── Validate & Shape Response ───

function validateResponse(parsed: Record<string, unknown>): ParsedIntent {
  const summary = String(parsed.raw_summary ?? '')

  switch (parsed.type) {
    case 'PAYMENT': {
      const d = parsed.data as Record<string, unknown> | undefined
      if (d && Number(d.amount) > 0 && d.customer_name) {
        return {
          type: 'PAYMENT',
          data: {
            amount: Number(d.amount),
            code: d.code ? String(d.code) : null,
            customer_name: String(d.customer_name),
            customer_phone: d.customer_phone ? String(d.customer_phone) : null,
            transaction_type: d.transaction_type === 'debit' ? 'debit' : 'credit',
            transaction_date: d.transaction_date ? String(d.transaction_date) : null,
          },
          raw_summary: summary,
        }
      }
      break
    }
    case 'JOB': {
      const d = parsed.data as Record<string, unknown> | undefined
      const rawItems = d?.items
      const items: JobItem[] = Array.isArray(rawItems)
        ? rawItems
            .filter((i: Record<string, unknown>) => i?.description && Number(i?.total) > 0)
            .map((i: Record<string, unknown>) => ({
              description: String(i.description),
              quantity: Number(i.quantity) || 1,
              unit_price: Number(i.unit_price) || Number(i.total),
              total: Number(i.total),
            }))
        : []
      // Fallback: flat format from older prompt versions
      if (items.length === 0 && d?.description && Number(d?.total_price) > 0) {
        items.push({
          description: String(d.description),
          quantity: 1,
          unit_price: Number(d.total_price),
          total: Number(d.total_price),
        })
      }
      if (d?.customer_name && items.length > 0) {
        const total = items.reduce((s, i) => s + i.total, 0)
        return {
          type: 'JOB',
          data: { customer_name: String(d.customer_name), items, total_price: total },
          raw_summary: summary,
        }
      }
      break
    }
    case 'QUERY': {
      const d = parsed.data as Record<string, unknown> | undefined
      if (d?.target_name) {
        return {
          type: 'QUERY',
          data: { target_name: String(d.target_name), intent: 'BALANCE' },
          raw_summary: summary,
        }
      }
      break
    }
    case 'REPORT': {
      const d = parsed.data as Record<string, unknown> | undefined
      const validReports = ['unpaid', 'income', 'summary'] as const
      const validPeriods = ['today', 'week', 'month', 'all'] as const
      const report = validReports.includes(d?.report as typeof validReports[number])
        ? (d!.report as typeof validReports[number])
        : 'summary'
      const period = validPeriods.includes(d?.period as typeof validPeriods[number])
        ? (d!.period as typeof validPeriods[number])
        : 'today'
      return {
        type: 'REPORT',
        data: { report, period },
        raw_summary: summary,
      }
    }
    case 'LOGIN':
      return { type: 'LOGIN', data: {}, raw_summary: summary }
  }

  return { type: 'UNKNOWN', data: {}, raw_summary: summary }
}

// ─── Post-validation: credit/debit heuristic safety net ───

// Patterns that strongly indicate the CUSTOMER paid the business owner (credit)
const CREDIT_PATTERNS = [
  /amelipa/i, /alilipa/i, /ameleta/i, /amenilipa/i, /analipa/i,
  /nimepokea/i, /nimepewa/i, /amekuja\s+na/i,
  /\bpaid\b/i, /\breceived\b/i, /\bgot\b/i,
  /\bhas\s+paid\b/i, /\bbought\b/i, /\bbrought\b/i,
]

// Patterns that strongly indicate the business owner PAID OUT (debit)
const DEBIT_PATTERNS = [
  /nimelipa/i, /nimetoa/i, /nimempa/i, /nimetuma/i,
  /\bI\s+paid\b/, /\bI\s+sent\b/, /\bI\s+gave\b/,
  /\brefund/i, /nimerudisha/i,
]

function inferTransactionType(message: string): 'credit' | 'debit' | null {
  const creditScore = CREDIT_PATTERNS.filter((p) => p.test(message)).length
  const debitScore = DEBIT_PATTERNS.filter((p) => p.test(message)).length
  if (creditScore > 0 && debitScore === 0) return 'credit'
  if (debitScore > 0 && creditScore === 0) return 'debit'
  return null // ambiguous — trust the AI
}

// ─── Main Entry Point ───

export async function parseWithAI(message: string): Promise<ParsedIntent> {
  const provider = getProvider()
  const raw = provider === 'openai' ? await callOpenAI(message) : await callGemini(message)
  const parsed = JSON.parse(raw)
  const result = validateResponse(parsed)

  // Safety net: override credit/debit if heuristic strongly disagrees with AI
  if (result.type === 'PAYMENT') {
    const heuristic = inferTransactionType(message)
    if (heuristic && heuristic !== result.data.transaction_type) {
      console.warn(
        `AI said "${result.data.transaction_type}" but heuristic says "${heuristic}" for: ${message.slice(0, 80)}`
      )
      result.data.transaction_type = heuristic
    }
  }

  return result
}

// Keep backward compat alias
export const parseWithGemini = parseWithAI
