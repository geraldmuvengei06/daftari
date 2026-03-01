'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/field-error'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Phone, Mail } from 'lucide-react'
import {
  loginPhoneSchema,
  loginEmailSchema,
  getFieldErrors,
  type FieldErrors,
} from '@/lib/validations'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { ensureTenant } from '@/lib/actions'
import { PhoneInput } from '@/components/phone-input'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [sent, setSent] = useState<'phone' | 'email' | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  const supabase = createSupabaseBrowser()
  const [handlingMagicLink, setHandlingMagicLink] = useState(false)
  const checkedHash = useRef(false)

  // Auto-handle magic link hash fragments (#access_token=...)
  useEffect(() => {
    if (checkedHash.current) return
    checkedHash.current = true

    const hash = window.location.hash.substring(1)
    if (!hash.includes('access_token')) return

    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (!accessToken || !refreshToken) return

    queueMicrotask(() => setHandlingMagicLink(true))

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(async ({ data: { session }, error }) => {
        if (session && !error) {
          // Clear the hash from the URL
          window.history.replaceState(null, '', window.location.pathname)
          try {
            await ensureTenant('')
          } catch {}
          router.push('/customers')
        } else {
          setHandlingMagicLink(false)
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (handlingMagicLink) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mb-2 flex justify-center">
              <Logo className="text-2xl" />
            </div>
            <CardTitle>Signing you in…</CardTitle>
            <CardDescription>Please wait while we verify your magic link.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const handlePhone = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = loginPhoneSchema.safeParse({ phone })
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setLoading(true)
    setErrors({})
    const { error } = await supabase.auth.signInWithOtp({ phone })
    setLoading(false)
    if (error) {
      setErrors({ phone: error.message })
      return
    }
    setSent('phone')
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = loginEmailSchema.safeParse({ email })
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setLoading(true)
    setErrors({})
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) {
      setErrors({ email: error.message })
      return
    }
    setSent('email')
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp.trim()) {
      setErrors({ otp: 'Enter the code' })
      return
    }
    setLoading(true)
    setErrors({})
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    })
    if (error) {
      setLoading(false)
      setErrors({ otp: error.message })
      return
    }
    try {
      await ensureTenant(phone)
    } catch {}
    router.push('/customers')
  }

  if (sent === 'phone') {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mb-2 flex justify-center">
              <Logo className="text-2xl" />
            </div>
            <CardTitle>Enter verification code</CardTitle>
            <CardDescription>
              We sent a code to <span className="text-foreground font-medium">{phone}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value)
                    setErrors({ ...errors, otp: undefined })
                  }}
                  aria-invalid={!!errors.otp}
                  autoFocus
                />
                <FieldError message={errors.otp} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setSent(null)
                  setOtp('')
                  setErrors({})
                }}
              >
                Try again
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (sent === 'email') {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mb-2 flex justify-center">
              <Logo className="text-2xl" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a magic link to <span className="text-foreground font-medium">{email}</span>.
              Click it to sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setSent(null)
                setErrors({})
              }}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <Logo className="text-2xl" />
          </div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" onValueChange={() => setErrors({})}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">
                <Mail className="mr-1.5 size-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="phone">
                <Phone className="mr-1.5 size-4" />
                Phone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={handleEmail} className="space-y-4 pt-2" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setErrors({ ...errors, email: undefined })
                      }}
                      className="pl-8"
                      aria-invalid={!!errors.email}
                    />
                  </div>
                  <FieldError message={errors.email} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending…' : 'Send magic link'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="phone">
              <form onSubmit={handlePhone} className="space-y-4 pt-2" noValidate>
                <p className="text-muted-foreground text-xs">
                  Phone login requires an SMS provider. Use email for now.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <PhoneInput
                    id="phone"
                    value={phone}
                    onChange={(v) => {
                      setPhone(v)
                      setErrors({ ...errors, phone: undefined })
                    }}
                    aria-invalid={!!errors.phone}
                  />
                  <FieldError message={errors.phone} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending…' : 'Send OTP'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
