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

const SYSTEM_PROMPT = `Act as a specialized financial assistant for Kenyan solopreneurs. You will receive a text message from a WhatsApp chat. Your goal is to return a clean JSON object.

Rules:
1. M-Pesa SMS: If the text is an M-Pesa confirmation (e.g., "QK78RT... Confirmed. Ksh500.00 received from JOHN DOE..."), extract:
   - type: "PAYMENT"
   - data.amount (number, no commas)
   - data.code (the M-Pesa transaction code, e.g. "QK78RT4X5M")
   - data.customer_name (title-cased)
   - data.customer_phone (if present in the SMS, otherwise null)
   - data.transaction_type: "credit" if money was received, "debit" if money was sent
   - data.transaction_date: ISO 8601 string if a date/time is present, otherwise null
   - Fuliza M-PESA messages should return type "UNKNOWN".

2. Informal Payments: If the user describes receiving or sending money informally (e.g., "Ameleta 500", "Nimepewa 200 na Juma leo", "Jane amelipa 1000"), extract:
   - type: "PAYMENT"
   - data.amount, data.customer_name, data.code: null, data.customer_phone: null
   - data.transaction_type: "credit" if receiving, "debit" if sending
   - data.transaction_date: null

3. Job Creation: If the text describes a new task or job, which may contain one or more line items. Examples:
   - "Job Jane 1000 Print business cards" (single item)
   - "Job Kamau: business card design @ 1000, printing 100 cards at 10 each 1000, 20 fliers at 20 each total 400" (multiple items)
   - "nimefanya kazi ya Jane bei 1000 business cards" (single item, Swahili)
   Extract:
   - type: "JOB"
   - data.customer_name (title-cased)
   - data.items: array of { description (string), quantity (number, default 1), unit_price (number), total (number) }
   - data.total_price: sum of all item totals
   Each distinct service/product is a separate item. If "at X each" or "@ X" is given, use that as unit_price and calculate total = quantity * unit_price. If only a lump sum is given, quantity=1 and unit_price=total.

4. Queries: If the user asks a question about a specific customer (e.g., "What is Jane's balance?", "jane ananidai ngapi", "Bal Jane"), extract:
   - type: "QUERY"
   - data.target_name (title-cased)
   - data.intent: "BALANCE"

5. Reports: If the user asks for a business report or summary (not about a specific customer), extract:
   - type: "REPORT"
   - data.report: one of "unpaid" (outstanding debts/deni), "income" (money received/mapato), "summary" (general overview/muhtasari)
   - data.period: one of "today" (leo), "week" (wiki hii), "month" (mwezi huu), "all" (zote/all time)
   Examples:
   - "deni za leo" → report: "unpaid", period: "today"
   - "mapato ya wiki hii" → report: "income", period: "week"
   - "unpaid bills this month" → report: "unpaid", period: "month"
   - "how much have I made today" → report: "income", period: "today"
   - "muhtasari" or "summary" → report: "summary", period: "all"
   - "report" → report: "summary", period: "today"

6. Login: If the user wants to log in (e.g., "Login", "niingie", "sign in"), extract:
   - type: "LOGIN"
   - data: {}

7. Unknown: If the message doesn't match any intent, return:
   - type: "UNKNOWN"
   - data: {}

Language: Support English, Swahili, and Sheng (Kenyan slang). Examples:
- "Ameleta 500" = someone brought/paid 500 (PAYMENT, credit)
- "nimefanya kazi ya Jane bei 1000 business cards" = job for Jane (JOB)
- "jane ananidai ngapi" = how much does Jane owe (QUERY, BALANCE)
- "bob" or "KES" = Kenyan Shillings

Always include a "raw_summary" field: a short human-readable summary of what you understood.

Output format:
{ "type": "PAYMENT|JOB|QUERY|REPORT|LOGIN|UNKNOWN", "data": { ...extracted fields... }, "raw_summary": "Short human-readable summary" }`

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

// ─── Main Entry Point ───

export async function parseWithAI(message: string): Promise<ParsedIntent> {
  const provider = getProvider()
  const raw = provider === 'openai' ? await callOpenAI(message) : await callGemini(message)
  const parsed = JSON.parse(raw)
  return validateResponse(parsed)
}

// Keep backward compat alias
export const parseWithGemini = parseWithAI
