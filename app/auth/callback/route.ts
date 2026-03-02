import { NextResponse } from 'next/server'
import { handleCodeExchange, handleOtpVerification } from '@/lib/services/auth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/customers'

  if (code) {
    const user = await handleCodeExchange(code)
    if (user) return NextResponse.redirect(`${origin}${next}`)
  }

  if (tokenHash && type) {
    const user = await handleOtpVerification(tokenHash, type as 'signup' | 'email')
    if (user) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login`)
}
