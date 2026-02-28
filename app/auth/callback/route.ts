import { NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/customers"

  const supabase = await createSupabaseServer()

  // PKCE flow (code exchange)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      await ensureTenantExists(data.user)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Token hash flow (magic link with token_hash param)
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "email",
    })
    if (!error && data.user) {
      await ensureTenantExists(data.user)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}

async function ensureTenantExists(user: { id: string; phone?: string | null }) {
  const { data: existing } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!existing) {
    await supabaseAdmin.from("tenants").insert({
      user_id: user.id,
      owner_phone: user.phone ?? "",
      business_name: "My Business",
    })
  }
}
