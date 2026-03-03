'use client'

import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <Logo className="text-xl" />
      </div>

      <article className="legal-prose max-w-none">
        <h1>Data Deletion Instructions</h1>
        <p className="text-muted-foreground text-sm">
          How to delete your Daftari account and data
        </p>

        <h2>Option 1: Self-Service Deletion (Recommended)</h2>
        <p>You can delete your account directly from the Daftari app:</p>
        <ol>
          <li>
            Log in to your Daftari account at{' '}
            <a href="https://daftariai.vercel.app">daftariai.vercel.app</a>
          </li>
          <li>
            Navigate to your <strong>Profile</strong> page
          </li>
          <li>
            Scroll down to find the <strong>&quot;Delete Account&quot;</strong> button
          </li>
          <li>
            Type <strong>&quot;delete my account&quot;</strong> to confirm
          </li>
          <li>Click the delete button to permanently remove your account</li>
        </ol>

        <h2>Option 2: Email Request</h2>
        <p>
          If you cannot access your account or prefer to request deletion via email:
        </p>
        <ol>
          <li>
            Send an email to <a href="mailto:legal@daftariai.com">legal@daftariai.com</a>
          </li>
          <li>
            Use the subject line: <strong>&quot;Account Deletion Request&quot;</strong>
          </li>
          <li>Include the phone number or email address associated with your account</li>
          <li>We will verify your identity and process your request within 30 days</li>
        </ol>

        <h2>What Gets Deleted</h2>
        <p>When you delete your account, we remove:</p>
        <ul>
          <li>Your account profile and login credentials</li>
          <li>Your business information</li>
          <li>All customer records you created</li>
          <li>All job and transaction records</li>
          <li>Your WhatsApp message history with our service</li>
        </ul>

        <h2>Data Retention</h2>
        <p>We perform a &quot;soft delete&quot; which means:</p>
        <ul>
          <li>Your personal information is immediately anonymized</li>
          <li>You will be logged out and cannot access the account</li>
          <li>
            Anonymized transaction data may be retained for legal compliance and analytics
          </li>
          <li>Complete data purge occurs within 90 days</li>
        </ul>

        <h2>Important Notes</h2>
        <ul>
          <li>
            <strong>This action is irreversible.</strong> Once deleted, your data cannot be recovered.
          </li>
          <li>
            If you have any outstanding business matters, please resolve them before deletion.
          </li>
          <li>
            Consider exporting your data before deletion if you need records for your business.
          </li>
        </ul>

        <h2>Contact Us</h2>
        <p>If you have questions about data deletion or need assistance:</p>
        <ul>
          <li>
            Email: <a href="mailto:legal@daftariai.com">legal@daftariai.com</a>
          </li>
          <li>Location: Nairobi, Kenya</li>
        </ul>
      </article>
    </div>
  )
}
