'use client'

import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
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
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">Last updated: March 3, 2026</p>

        <h2>1. Introduction</h2>
        <p>
          Daftari (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting
          your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard
          your information when you use our business management application and WhatsApp integration
          service.
        </p>
        <p>
          Daftari is operated from Nairobi, Kenya. By using our services, you agree to the
          collection and use of information in accordance with this policy.
        </p>

        <h2>2. Information We Collect</h2>
        <h3>2.1 Information You Provide</h3>
        <ul>
          <li>
            <strong>Account Information:</strong> Phone number, email address, and business name when
            you register
          </li>
          <li>
            <strong>Customer Data:</strong> Names and phone numbers of your customers that you add to
            the system
          </li>
          <li>
            <strong>Transaction Data:</strong> Payment records, M-Pesa transaction codes, amounts,
            and descriptions
          </li>
          <li>
            <strong>Job/Service Data:</strong> Descriptions of jobs or services, quotes, and status
          </li>
          <li>
            <strong>WhatsApp Messages:</strong> Messages you send to our WhatsApp business number for
            processing
          </li>
        </ul>

        <h3>2.2 Information Collected Automatically</h3>
        <ul>
          <li>
            <strong>Usage Data:</strong> How you interact with our application
          </li>
          <li>
            <strong>Device Information:</strong> Browser type, device type, and operating system
          </li>
          <li>
            <strong>Log Data:</strong> Access times, pages viewed, and referring URLs
          </li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>We use the collected information to:</p>
        <ul>
          <li>Provide and maintain our service</li>
          <li>Process your transactions and manage customer records</li>
          <li>
            Parse and understand your WhatsApp messages using AI to create jobs, record payments, and
            generate reports
          </li>
          <li>Send you service-related notifications via WhatsApp</li>
          <li>Authenticate your identity and secure your account</li>
          <li>Improve our services and develop new features</li>
          <li>Respond to your inquiries and provide customer support</li>
        </ul>

        <h2>4. AI Processing</h2>
        <p>
          We use artificial intelligence services (OpenAI/Google Gemini) to process your WhatsApp
          messages and convert natural language into structured data. This helps us understand your
          intent when you send messages like &quot;Job Jane 1000 Print business cards&quot; or
          forward M-Pesa confirmation messages.
        </p>
        <p>
          Your message content is sent to these AI services for processing. We do not use your data
          to train AI models. The AI providers process data according to their respective privacy
          policies.
        </p>

        <h2>5. Data Sharing and Disclosure</h2>
        <p>We may share your information with:</p>
        <ul>
          <li>
            <strong>Service Providers:</strong> Third-party companies that help us operate our
            service:
            <ul>
              <li>Supabase (database, authentication, and backend services)</li>
              <li>Vercel (application hosting)</li>
              <li>Meta/WhatsApp (messaging platform)</li>
              <li>OpenAI/Google (AI processing for message parsing)</li>
            </ul>
          </li>
          <li>
            <strong>Legal Requirements:</strong> When required by law or to protect our rights
          </li>
          <li>
            <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of
            assets
          </li>
        </ul>
        <p>We do not sell your personal information to third parties.</p>

        <h2>6. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your data,
          including:
        </p>
        <ul>
          <li>Encryption of data in transit (HTTPS/TLS)</li>
          <li>Secure authentication mechanisms</li>
          <li>Row-level security in our database</li>
          <li>Regular security assessments</li>
        </ul>
        <p>
          However, no method of transmission over the Internet is 100% secure. We cannot guarantee
          absolute security of your data.
        </p>

        <h2>7. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active or as needed to provide services.
          When you delete your account, we perform a soft delete, retaining anonymized data for legal
          and analytical purposes while removing personally identifiable information.
        </p>

        <h2>8. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>
            <strong>Access:</strong> Request a copy of your personal data
          </li>
          <li>
            <strong>Correction:</strong> Update or correct inaccurate data
          </li>
          <li>
            <strong>Deletion:</strong> Request deletion of your account and data
          </li>
          <li>
            <strong>Portability:</strong> Request your data in a portable format
          </li>
          <li>
            <strong>Objection:</strong> Object to certain processing of your data
          </li>
        </ul>
        <p>
          To exercise these rights, contact us at{' '}
          <a href="mailto:legal@daftariai.com">legal@daftariai.com</a> or use the account deletion
          feature in your profile settings.
        </p>

        <h2>9. Children&apos;s Privacy</h2>
        <p>
          Our service is not intended for individuals under 18 years of age. We do not knowingly
          collect personal information from children.
        </p>

        <h2>10. International Data Transfers</h2>
        <p>
          Your data may be transferred to and processed in countries other than Kenya, including the
          United States where our service providers operate. We ensure appropriate safeguards are in
          place for such transfers.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by
          posting the new policy on this page and updating the &quot;Last updated&quot; date.
        </p>

        <h2>12. Contact Us</h2>
        <p>If you have questions about this Privacy Policy, please contact us at:</p>
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
