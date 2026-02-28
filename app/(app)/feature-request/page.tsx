"use client"

import { useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FieldError } from "@/components/field-error"
import { Lightbulb, Send } from "lucide-react"
import { featureRequestSchema, getFieldErrors, type FieldErrors } from "@/lib/validations"

const initial = { title: "", description: "" }

export default function FeatureRequestPage() {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = featureRequestSchema.safeParse(form)
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setErrors({})
    setSubmitted(true)
    setForm(initial)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature Request"
        subtitle="Help us build what matters to you"
      />

      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="size-5 text-primary" />
            <CardTitle>Got an idea?</CardTitle>
          </div>
          <CardDescription>
            Tell us what feature or improvement would make Daftari work better for your business. We read every request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-3 text-center py-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Send className="size-5 text-primary" />
              </div>
              <p className="font-medium">Thank you for your feedback</p>
              <p className="text-sm text-muted-foreground">
                We&apos;ve received your request and will review it soon.
              </p>
              <Button variant="outline" onClick={() => { setSubmitted(false); setErrors({}) }}>
                Submit another
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="feature-title">Title</Label>
                <Input
                  id="feature-title"
                  placeholder="e.g. SMS payment reminders"
                  value={form.title}
                  onChange={(e) => { setForm({ ...form, title: e.target.value }); setErrors({ ...errors, title: undefined }) }}
                  aria-invalid={!!errors.title}
                />
                <FieldError message={errors.title} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feature-description">Description</Label>
                <Textarea
                  id="feature-description"
                  placeholder="Describe the feature and how it would help you..."
                  value={form.description}
                  onChange={(e) => { setForm({ ...form, description: e.target.value }); setErrors({ ...errors, description: undefined }) }}
                  className="min-h-28"
                  aria-invalid={!!errors.description}
                />
                <FieldError message={errors.description} />
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                <Send />
                Submit Request
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
