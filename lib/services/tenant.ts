import { supabaseAdmin } from '@/lib/supabase'

export async function ensureTenantExists(user: { id: string; phone?: string | null; email?: string | null }) {
  const { data: existing } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    await supabaseAdmin.from('tenants').insert({
      user_id: user.id,
      owner_phone: user.phone ?? '',
      owner_email: user.email ?? '',
      business_name: 'My Business',
      registration_state: 'complete',
    })
  }
}
