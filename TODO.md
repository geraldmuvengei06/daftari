# TODO

## Protect /api/whatsapp with Twilio Signature Validation

Twilio signs every webhook request with `X-Twilio-Signature`. Validate it to block unauthorized access.

### Steps

1. Install Twilio SDK:

```bash
pnpm add twilio
```

2. Add to `.env`:

```
TWILIO_AUTH_TOKEN=your-auth-token-here
```

3. Add validation in `app/api/whatsapp/route.ts` after parsing formData:

```ts
import { validateRequest } from 'twilio'

const authToken = process.env.TWILIO_AUTH_TOKEN!
const url = process.env.APP_URL + '/api/whatsapp'

const signature = request.headers.get('x-twilio-signature') || ''
const params = Object.fromEntries(formData.entries()) as Record<string, string>

const isValid = validateRequest(authToken, signature, url, params)

if (!isValid) {
  return new NextResponse('Unauthorized', { status: 403 })
}
```

## Secure Environment Variables

Next.js exposes any env var prefixed with `NEXT_PUBLIC_` to the browser. Only use that prefix for values that are safe to be public (e.g. Supabase URL and anon key are designed to be public).

### Rules

- `NEXT_PUBLIC_` prefix = visible in browser JS bundles. Only use for public/anon keys.
- No prefix = server-only. Use for secrets like auth tokens, service role keys, etc.

### Current vars

| Variable                               | Prefix         | Safe?                                                      |
| -------------------------------------- | -------------- | ---------------------------------------------------------- |
| `APP_URL`                              | none           | ✅ Server-only                                             |
| `NEXT_PUBLIC_SUPABASE_URL`             | `NEXT_PUBLIC_` | ✅ OK — project URL is public                              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `NEXT_PUBLIC_` | ✅ OK — anon key is meant to be public (RLS protects data) |
| `TWILIO_AUTH_TOKEN`                    | none           | ✅ Server-only (keep it this way)                          |

### Checklist

- [ ] Never prefix `TWILIO_AUTH_TOKEN` with `NEXT_PUBLIC_`
- [ ] Never prefix Supabase `service_role` key with `NEXT_PUBLIC_` if you add one later
- [ ] Add `.env` to `.gitignore` so secrets don't get committed
- [ ] Use `.env.example` (without real values) for documentation
