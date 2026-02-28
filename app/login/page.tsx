"use client"

import { useState } from "react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/field-error"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Phone, Mail } from "lucide-react"
import { loginPhoneSchema, loginEmailSchema, getFieldErrors, type FieldErrors } from "@/lib/validations"

export default function LoginPage() {
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState<"phone" | "email" | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})

  const handlePhone = (e: React.FormEvent) => {
    e.preventDefault()
    const result = loginPhoneSchema.safeParse({ phone })
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setErrors({})
    setSent("phone")
  }

  const handleEmail = (e: React.FormEvent) => {
    e.preventDefault()
    const result = loginEmailSchema.safeParse({ email })
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setErrors({})
    setSent("email")
  }

  if (sent) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mb-2 flex justify-center"><Logo className="text-2xl" /></div>
            <CardTitle>{sent === "phone" ? "Check your phone" : "Check your email"}</CardTitle>
            <CardDescription>
              {sent === "phone"
                ? "We sent an OTP to your phone."
                : "We sent a magic link to your email. Click it to sign in."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Sent to <span className="font-medium text-foreground">{sent === "phone" ? phone : email}</span>
            </p>
            <Button variant="ghost" className="w-full" onClick={() => setSent(null)}>
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
          <div className="mb-2 flex justify-center"><Logo className="text-2xl" /></div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" onValueChange={() => setErrors({})}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">
                <Mail className="size-4 mr-1.5" />
                Email
              </TabsTrigger>
              <TabsTrigger value="phone">
                <Phone className="size-4 mr-1.5" />
                Phone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={handleEmail} className="space-y-4 pt-2" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: undefined }) }}
                      className="pl-8"
                      aria-invalid={!!errors.email}
                    />
                  </div>
                  <FieldError message={errors.email} />
                </div>
                <Button type="submit" className="w-full">Send magic link</Button>
              </form>
            </TabsContent>

            <TabsContent value="phone">
              <form onSubmit={handlePhone} className="space-y-4 pt-2" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+254712345678"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setErrors({ ...errors, phone: undefined }) }}
                      className="pl-8"
                      aria-invalid={!!errors.phone}
                    />
                  </div>
                  <FieldError message={errors.phone} />
                </div>
                <Button type="submit" className="w-full">Send OTP</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
