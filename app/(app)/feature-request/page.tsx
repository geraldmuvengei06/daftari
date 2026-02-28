"use client"

import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { FieldError } from "@/components/field-error"
import { FeatureRequestListSkeleton } from "@/components/skeletons"
import { Lightbulb, Send } from "lucide-react"
import { featureRequestSchema, getFieldErrors, type FieldErrors } from "@/lib/validations"
import { createFeatureRequest, getFeatureRequests } from "@/lib/actions"
import type { FeatureRequest } from "@/lib/types"

const initial = { title: "", description: "" }

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  in_review: "outline",
  planned: "default",
  completed: "default",
  declined: "destructive",
}

export default function FeatureRequestPage() {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)

  const fetchRequests = useCallback(async () => {
    try {
      const data = await getFeatureRequests()
      setRequests(data)
    } catch (err) {
      console.error("Failed to load feature requests:", err)
    } finally {
      setLoadingRequests(false)
    }
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = featureRequestSchema.safeParse(form)
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      return
    }
    setSubmitting(true)
    try {
      await createFeatureRequest({ title: form.title, description: form.description })
      setErrors({})
      setSubmitted(true)
      setForm(initial)
      fetchRequests()
    } catch {
      setErrors({ title: "Failed to submit. Please try again." })
    } finally {
      setSubmitting(false)
    }
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
              <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                <Send />
                {submitting ? "Submitting…" : "Submit Request"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Past requests */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your Requests</h2>
        {loadingRequests ? (
          <FeatureRequestListSkeleton />
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No feature requests yet. Be the first to submit one.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{r.title}</p>
                    <Badge variant={statusColors[r.status] ?? "secondary"}>
                      {r.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("en-KE", {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
