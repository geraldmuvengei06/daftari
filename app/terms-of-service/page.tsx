'use client'

import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TermsOfServicePage() {
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
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground text-sm">Last updated: March 3, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Daftari (&quot;the Service&quot;), you agree to be bound by these
          Terms of Service. If you do not agree to these terms, please do not use our Service.
        </p>
        <p>
          Daftari is a business management application operated from Nairobi, Kenya, that helps small
          businesses manage customers, jobs, and payments through a web interface and WhatsApp
          integration.
        </p>

        <h2>2. Description of Service</h2>
        <p>Daftari provides:</p>
        <ul>
          <li>Customer relationship management</li>
          <li>Job and service tracking</li>
          <li>Payment recording and balance tracking</li>
          <li>WhatsApp-based business management through natural language processing</li>
          <li>Business reports and analytics</li>
        </ul>

        <h2>3. Account Registration</h2>
        <p>
          To use Daftari, you must create an account by providing your phone number or email address.
          You agree to:
        </p>
        <ul>
          <li>Provide accurate and complete information</li>
          <li>Maintain the security of your account credentials</li>
          <li>Notify us immediately of any unauthorized access</li>
          <li>Accept responsibility for all activities under your account</li>
        </ul>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any illegal purpose</li>
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe on the rights of others</li>
          <li>Transmit harmful code or interfere with the Service</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Use the Service to send spam or unsolicited messages</li>
          <li>Impersonate any person or entity</li>
          <li>Use automated systems to access the Service without permission</li>
        </ul>

        <h2>5. User Content and Data</h2>
        <p>
          You retain ownership of the data you input into Daftari, including customer information,
          transaction records, and job details. By using our Service, you grant us a license to:
        </p>
        <ul>
          <li>Store and process your data to provide the Service</li>
          <li>Use AI services to parse and understand your WhatsApp messages</li>
          <li>Generate reports and analytics from your data</li>
          <li>Back up your data for disaster recovery</li>
        </ul>
        <p>
          You are responsible for ensuring you have the right to input any data into our system,
          including obtaining necessary consent from your customers for storing their information.
        </p>

        <h2>6. WhatsApp Integration</h2>
        <p>
          Our WhatsApp integration allows you to manage your business through messaging. By using
          this feature, you acknowledge that:
        </p>
        <ul>
          <li>Messages are processed by AI to understand your intent</li>
          <li>Message content is shared with AI service providers for processing</li>
          <li>WhatsApp&apos;s own terms of service also apply</li>
          <li>We are not responsible for WhatsApp service availability</li>
        </ul>

        <h2>7. Payment Processing</h2>
        <p>
          Daftari helps you record and track payments but does not process payments directly. We are
          not responsible for:
        </p>
        <ul>
          <li>Accuracy of M-Pesa or other payment confirmations you forward</li>
          <li>Disputes between you and your customers</li>
          <li>Any financial losses from incorrect data entry</li>
        </ul>

        <h2>8. Service Availability</h2>
        <p>
          We strive to maintain high availability but do not guarantee uninterrupted service. We may:
        </p>
        <ul>
          <li>Perform maintenance that temporarily affects availability</li>
          <li>Modify or discontinue features with reasonable notice</li>
          <li>Suspend accounts that violate these terms</li>
        </ul>

        <h2>9. Intellectual Property</h2>
        <p>
          The Daftari name, logo, and all related software, designs, and content are our intellectual
          property. You may not:
        </p>
        <ul>
          <li>Copy, modify, or distribute our software</li>
          <li>Use our branding without permission</li>
          <li>Reverse engineer our systems</li>
        </ul>

        <h2>10. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Daftari and its operators shall not be liable for:
        </p>
        <ul>
          <li>Any indirect, incidental, or consequential damages</li>
          <li>Loss of profits, data, or business opportunities</li>
          <li>Damages exceeding the amount you paid us in the past 12 months</li>
        </ul>
        <p>
          The Service is provided &quot;as is&quot; without warranties of any kind, either express or
          implied.
        </p>

        <h2>11. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Daftari and its operators from any claims,
          damages, or expenses arising from:
        </p>
        <ul>
          <li>Your use of the Service</li>
          <li>Your violation of these terms</li>
          <li>Your violation of any third-party rights</li>
        </ul>

        <h2>12. Account Termination</h2>
        <p>
          You may delete your account at any time through the profile settings. We may terminate or
          suspend your account if you violate these terms. Upon termination:
        </p>
        <ul>
          <li>Your access to the Service will be revoked</li>
          <li>Your data will be handled according to our Privacy Policy</li>
          <li>Provisions that should survive termination will remain in effect</li>
        </ul>

        <h2>13. Governing Law</h2>
        <p>
          These terms are governed by the laws of Kenya. Any disputes shall be resolved in the courts
          of Nairobi, Kenya.
        </p>

        <h2>14. Changes to Terms</h2>
        <p>
          We may modify these terms at any time. We will notify users of significant changes through
          the Service or via email. Continued use after changes constitutes acceptance of the new
          terms.
        </p>

        <h2>15. Contact Information</h2>
        <p>For questions about these Terms of Service, contact us at:</p>
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
