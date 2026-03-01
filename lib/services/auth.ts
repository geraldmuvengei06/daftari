import { createSupabaseServer } from '@/lib/supabase-server'
import { ensureTenantExists } from '@/lib/services/tenant'

export async function handleCodeExchange(code: string) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) return null
  await ensureTenantExists(data.user)
  return data.user
}

export async function handleOtpVerification(tokenHash: string, type: 'signup' | 'email') {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  if (error || !data.user) return null
  await ensureTenantExists(data.user)
  return data.user
}
