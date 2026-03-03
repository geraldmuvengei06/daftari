# Daftari

A WhatsApp-first business management tool for small businesses. Track jobs, customers, payments, and balances via WhatsApp messages.

## Features

- **WhatsApp Bot** - Create jobs, record payments, check balances via text
- **M-Pesa Integration** - Forward M-Pesa SMS to auto-record payments
- **AI-Powered Parsing** - Natural language understanding for messages
- **Web Dashboard** - Full reports and management portal
- **Multi-tenant** - Each phone number gets isolated data

## WhatsApp Commands

| Command | Example | Description |
|---------|---------|-------------|
| Create Job | `Job Jane 1000 Print business cards` | Create a job for customer |
| Check Balance | `Bal Jane` | View customer's balance |
| Record Payment | Forward M-Pesa SMS | Auto-extracts payment details |
| Reports | `debts today`, `income this week`, `summary` | View business reports |
| Login | `login` | Get magic link to web portal |

## User Flow

1. User sends any message → account created instantly
2. Bot responds with help menu, user can start working immediately
3. When user wants web access → type "login" → provide email → receive magic link

No email verification required to use the WhatsApp bot.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (Postgres)
- **Auth**: Supabase Auth (magic links)
- **WhatsApp**: Meta Cloud API or Twilio
- **AI**: Gemini or OpenAI for message parsing

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
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# WhatsApp (Cloud API)
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=

# AI Provider
GEMINI_API_KEY=
# or
OPENAI_API_KEY=
```

### 3. Database

Run migrations:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### 4. Run

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
  (app)/           # Authenticated routes (dashboard)
  api/whatsapp/    # WhatsApp webhook handler
  auth/            # Auth callback
  login/           # Login page
components/        # React components
lib/
  whatsapp/        # WhatsApp provider abstraction
  ai-parser.ts     # AI message parsing
  actions.ts       # Server actions
supabase/
  migrations/      # Database migrations
```

## License

MIT
