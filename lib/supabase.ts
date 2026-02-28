import { createClient } from "@supabase/supabase-js"

// Server-side client using service role key — bypasses RLS.
// Used by server actions in lib/actions.ts.
export const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
