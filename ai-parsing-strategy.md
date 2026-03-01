# AI-Powered Message Parsing Strategy

## Problem

Current WhatsApp bot relies on rigid regex patterns:
- `Job <Name> <Amount> <Description>`
- `Bal <Name>`
- M-Pesa SMS pattern matching

Users must remember exact syntax. Any deviation (Swahili phrasing, different word order, typos) fails silently and returns the "I don't understand" fallback.

## Goal

Replace regex-based parsing with an LLM call that understands natural language (English + Swahili) and returns structured JSON for routing.

## Examples of What Should Work

| User message | Extracted intent |
|---|---|
| "Job Jane 1000 Print business cards" | `{ intent: "job", customer: "Jane", amount: 1000, description: "Print business cards" }` |
| "nimefanya kazi ya Jane bei 1000 business cards" | Same as above |
| "jane ananidai ngapi" | `{ intent: "balance", customer: "Jane" }` |
| "Bal Jane" | `{ intent: "balance", customer: "Jane" }` |
| "Login" | `{ intent: "login" }` |
| (forwarded M-Pesa SMS) | `{ intent: "mpesa", raw: true }` — skip AI, use existing regex |
| "hello" / random text | `{ intent: "unknown" }` |

## Architecture

```
Incoming message
    │
    ├─ Quick check: is it an M-Pesa SMS? (regex, no AI needed)
    │   └─ Yes → existing handleMpesaPayment()
    │
    └─ No → send to parseWithAI(message)
        │
        ├─ Returns { intent, ...structured fields }
        │
        ├─ intent: "job"     → handleJobCreation(tenantId, { customer, amount, description })
        ├─ intent: "balance" → handleBalanceQuery(tenantId, customer)
        ├─ intent: "login"   → handleWhatsAppLogin(tenantId)
        └─ intent: "unknown" → send help message
```

M-Pesa messages bypass AI entirely — they have a very distinct format and the existing regex is reliable for them. No point spending tokens on those.

## LLM Provider Options

| Provider | Model | Cost (per 1M input tokens) | Structured output | Notes |
|---|---|---|---|---|
| OpenAI | gpt-4o-mini | ~$0.15 | JSON mode / function calling | Best structured output support |
| Google | Gemini 2.0 Flash | Free tier available | JSON mode | Free tier = 15 RPM, 1M TPM |
| Anthropic | Claude Haiku | ~$0.25 | Tool use | Good at Swahili |

**Recommendation:** Start with OpenAI `gpt-4o-mini` — cheapest paid option, best JSON mode support, fast (~200ms for short prompts). At ~$0.15/1M tokens, processing 1000 messages/day costs roughly $0.01/day.

Gemini Flash free tier is viable for early stage but has rate limits that could bite at scale.

## System Prompt Design

```
You are a message parser for a Kenyan business management bot.
Users send messages in English or Swahili (or a mix).

Extract the intent and structured data. Return JSON only.

Intents:
- "job": Creating a job/work order. Extract: customer (name), amount (number), description (string).
- "balance": Checking customer balance. Extract: customer (name).
- "login": User wants a login link. No extra fields.
- "unknown": Message doesn't match any intent.

Rules:
- Amount must be a positive number. If no amount given for a job, return intent "unknown".
- Customer name should be title-cased.
- If ambiguous, prefer "unknown" over guessing.
```

## Implementation Plan

1. Add `OPENAI_API_KEY` to env
2. Create `lib/ai-parser.ts` with `parseWithAI(message: string)` function
3. Use OpenAI's `response_format: { type: "json_object" }` for guaranteed JSON
4. Update `processAndReply()` in the webhook route:
   - Keep M-Pesa regex check first (no AI)
   - Replace `parseJobMessage()` / `parseBalanceQuery()` / login regex with single `parseWithAI()` call
   - Route based on returned intent
5. Add fallback: if AI call fails (timeout, API down), fall back to existing regex parsers

## Cost Estimate

- Average message: ~50 tokens input + ~30 tokens system prompt overhead
- gpt-4o-mini: ~$0.15 / 1M input tokens
- 100 messages/day = ~8,000 tokens/day = $0.0012/day ≈ KES 0.15/day
- 1000 messages/day ≈ KES 1.5/day

Essentially free compared to the old Twilio costs.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM latency adds delay | gpt-4o-mini is ~200-400ms; webhook already responds async |
| API downtime | Fall back to regex parsers |
| Hallucinated customer names | Fuzzy match against existing customers in DB (already doing this) |
| Prompt injection via WhatsApp | System prompt is server-side only; user input is clearly delineated |
| Cost creep at scale | Monitor token usage; switch to Gemini free tier if needed |
