# Daftari

A WhatsApp-first business management tool for small businesses in Kenya. Track jobs, customers, payments, and balances via WhatsApp messages — with a full web dashboard for deeper management.

## Features

- **WhatsApp Bot** — Create jobs, record payments, check balances, and pull reports via text
- **M-Pesa Integration** — Forward M-Pesa confirmation SMS to auto-record payments with duplicate detection
- **AI-Powered Parsing** — Natural language understanding (English, Swahili, Sheng) via Gemini or OpenAI
- **Smart Customer Matching** — Fuzzy name resolution with confirmation prompts for ambiguous matches
- **Web Dashboard** — Manage customers, jobs, payments, and view your profile/stats
- **Multi-tenant** — Each WhatsApp number gets isolated data with row-level security
- **Realtime Updates** — Supabase realtime subscriptions keep the dashboard in sync
- **Terms & Privacy** — Built-in terms acceptance flow, privacy policy, and data deletion pages
- **Feature Requests** — In-app feature request form for user feedback

## WhatsApp Commands

| Command | Example | Description |
|---------|---------|-------------|
| Create Job | `Job Jane 1000 Print business cards` | Create a job card for a customer |
| Multi-item Job | `Jane brought 100 business cards for printing at 10/- each` | AI parses quantities and unit prices |
| Record Payment | Forward M-Pesa SMS | Auto-extracts amount, customer, code, date |
| Informal Payment | `Jane amelipa 500` or `Received 500 from Jane` | Supports Swahili payment vocabulary |
| Check Balance | `Bal Jane` | View a customer's job-by-job balance breakdown |
| Debts Report | `debts`, `debts today`, `debts this week` | Outstanding balances across customers |
| Income Report | `income`, `income this week`, `mapato ya leo` | Income summary for a period |
| Summary | `summary`, `summary today` | Open jobs, outstanding, income, expenses, net |
| Login | `login` | Get a magic link emailed to access the web portal |
| Help | `Get Started` | Show the help menu |

## User Flow

1. User sends any message → account created, terms acceptance requested
2. User replies "I Accept" → account activated, help menu shown
3. User starts creating jobs and recording payments immediately
4. When user wants web access → sends "login" → provides email → receives magic link

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (Postgres + Realtime)
- **Auth**: Supabase Auth (magic links + OTP)
- **WhatsApp**: Meta Cloud API or Twilio (switchable via config)
- **AI**: Gemini or OpenAI for message parsing (switchable via config)
- **UI**: Tailwind CSS 4, Radix UI, shadcn/ui, Lucide icons
- **Validation**: Zod
- **Tooling**: ESLint, Prettier, Husky, lint-staged

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd daftari
pnpm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# WhatsApp Business number for login page link (e.g. 254712345678)
NEXT_PUBLIC_WHATSAPP_NUMBER=

# WhatsApp API
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=

# AI Provider (pick one)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Optional overrides (these take priority over `features.json`):

```env
AI_PROVIDER=gemini        # or openai
WHATSAPP_PROVIDER=cloud   # or twilio
```

### 3. Feature flags

`features.json` controls defaults:

```json
{
  "phoneLogin": false,
  "aiProvider": "openai",
  "whatsappProvider": "cloud"
}
```

- `phoneLogin` — enable phone OTP login tab alongside email magic links
- `aiProvider` — default AI provider (`gemini` or `openai`, overridden by `AI_PROVIDER` env)
- `whatsappProvider` — default WhatsApp provider (`cloud` or `twilio`, overridden by `WHATSAPP_PROVIDER` env)

### 4. Database

Run migrations:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### 5. Run

```bash
pnpm dev
```

## WhatsApp Webhook Setup

1. Create a Meta Business App at [developers.facebook.com](https://developers.facebook.com)
2. Add WhatsApp product
3. Configure webhook URL: `https://your-domain.com/api/whatsapp`
4. Set verify token to match `WHATSAPP_VERIFY_TOKEN`
5. Subscribe to `messages` webhook field

## Project Structure

```
app/
  (app)/              # Authenticated routes
    customers/        # Customer list + detail pages
    jobs/             # Job cards with payment progress
    payments/         # Transaction history
    ledger/           # Ledger view
    profile/          # Business profile, stats, account management
    feature-request/  # In-app feature request form
  api/whatsapp/       # WhatsApp webhook handler (GET verify + POST messages)
  auth/callback/      # Supabase auth callback
  login/              # Login page (email magic link, optional phone OTP)
  privacy-policy/     # Privacy policy page
  terms-of-service/   # Terms of service page
  data-deletion/      # Data deletion instructions
components/           # React components + shadcn/ui primitives
lib/
  whatsapp/           # WhatsApp provider abstraction (Cloud API + Twilio)
  ai-parser.ts        # AI message parsing (Gemini + OpenAI)
  actions.ts          # Server actions (CRUD, auth, reports)
  validations.ts      # Zod schemas
  use-realtime.ts     # Supabase realtime hook
  supabase.ts         # Admin client
  supabase-server.ts  # Server-side client
  supabase-browser.ts # Browser client
supabase/
  migrations/         # Database migrations
```

## License

MIT
