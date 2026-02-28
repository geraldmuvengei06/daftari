import { createClient } from "@supabase/supabase-js"

// Server-side admin client — bypasses RLS.
// Only use in server actions / route handlers.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
