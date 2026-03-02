# AI-Powered Message Parsing with Google Gemini

## The Idea

Daftari is a WhatsApp-based business management tool for Kenyan SMEs. Users send messages to manage jobs, track payments, and check balances. The original bot relied on rigid regex patterns like `Job <Name> <Amount> <Description>` — any deviation (Swahili phrasing, different word order, typos) would fail silently.

The core insight: **use an LLM as an intelligent router**. Instead of pattern-matching strings, let AI understand what the user *means* and translate natural language into structured API calls. The AI doesn't execute business logic — it parses intent and extracts structured data, then the existing handlers take over.

## Why Gemini

Google Gemini 2.0 Flash is the backbone of this parsing layer:

- **Structured JSON output** via `responseMimeType: "application/json"` — guaranteed valid JSON, no parsing gymnastics
- **Multilingual understanding** — users mix English, Swahili, and Sheng freely; Gemini handles all three natively
- **Speed** — Flash models respond in ~200-400ms, well within WhatsApp's async webhook tolerance
- **Cost** — at the free tier (15 RPM, 1M TPM) this is essentially zero-cost for early-stage usage

## Architecture: Gemini as the Intelligent Router

Every incoming message flows through Gemini, which classifies it into one of five intent types and extracts structured data. The existing business logic handlers remain untouched — Gemini just replaces the brittle regex layer.

```
Incoming WhatsApp message
    │
    └─ parseWithGemini(message)
        │
        ├─ Returns { type, data, raw_summary }
        │
        ├─ type: "PAYMENT" → handleAIPayment()
        │   ├─ M-Pesa SMS (with code) → dedup + record
        │   └─ Informal ("Ameleta 500") → record without code
        │
        ├─ type: "JOB"     → handleJobCreation()
        ├─ type: "QUERY"   → handleBalanceQuery()
        ├─ type: "LOGIN"   → handleWhatsAppLogin()
        └─ type: "UNKNOWN" → send help message
        
    ⚠️ If Gemini API fails → fall back to original regex parsers
```

## What Gemini Parses

| User message | Gemini output |
|---|---|
| "Job Jane 1000 Print business cards" | `{ type: "JOB", data: { customer_name: "Jane", total_price: 1000, description: "Print business cards" } }` |
| "nimefanya kazi ya Jane bei 1000 business cards" | Same — Swahili works naturally |
| "Printing 200 cards for Kamau at 1500 bob" | `{ type: "JOB", data: { customer_name: "Kamau", total_price: 1500, description: "Printing 200 cards" } }` |
| "jane ananidai ngapi" | `{ type: "QUERY", data: { target_name: "Jane", intent: "BALANCE" } }` |
| "Ameleta 500" | `{ type: "PAYMENT", data: { amount: 500, customer_name: inferred, code: null } }` |
| "Nimepewa 200 na Juma leo" | `{ type: "PAYMENT", data: { amount: 200, customer_name: "Juma", code: null } }` |
| Forwarded M-Pesa SMS | `{ type: "PAYMENT", data: { amount: 500, code: "QK78RT4X5M", customer_name: "John Doe" } }` |
| "Login" | `{ type: "LOGIN" }` |
| "hello" / random text | `{ type: "UNKNOWN" }` |

## Key Enhancement: Informal Payments

The biggest win over regex: Gemini understands informal payment descriptions in Sheng/Swahili. "Ameleta 500" (they brought 500), "Jane amelipa 1000" (Jane has paid 1000) — these are natural ways Kenyan business owners talk about transactions. Regex can't touch this. Gemini gets it instantly.

## System Prompt

The system prompt positions Gemini as a specialized financial assistant for Kenyan solopreneurs. It handles:

- **M-Pesa SMS parsing** — extracts transaction code, amount, customer name/phone, date, credit/debit direction
- **Informal payment recognition** — Sheng phrases like "Ameleta 500" mapped to structured payment data
- **Job creation** — natural language descriptions of work orders with customer, price, and description
- **Balance queries** — any form of "how much does X owe" in English, Swahili, or Sheng
- **Login requests** — various phrasings mapped to login intent

Every response includes a `raw_summary` field — a human-readable summary of what Gemini understood, useful for debugging and logging.

## Resilience: Regex Fallback

If the Gemini API is down or times out, the route falls back to the original regex parsers. The old `parseJobMessage()`, `parseBalanceQuery()`, and `handleMpesaPayment()` functions are still in the codebase. Users get degraded (rigid syntax only) but functional service.

## Cost Reality

- Average message: ~50 tokens input + ~80 tokens system prompt
- Gemini 2.0 Flash free tier: 15 requests/minute, 1M tokens/day
- For a small business doing 100 messages/day: comfortably within free tier
- Even at 1000 messages/day on paid tier: ~$0.01/day

## Implementation Files

- `lib/ai-parser.ts` — `parseWithGemini()` function, types, system prompt
- `app/api/whatsapp/route.ts` — webhook handler with AI routing + regex fallback
- `.env` — `GEMINI_API_KEY` and `GEMINI_MODEL` configuration
