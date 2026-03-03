'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/stat-card'
import { ProfileCardSkeleton, StatCardSkeleton } from '@/components/skeletons'
import { EditTenantModal } from '@/components/edit-tenant-modal'
import { DeleteAccountModal } from '@/components/delete-account-modal'
import { getTenant, getProfileStats, getUserProfile, signOut, deleteAccount } from '@/lib/actions'
import type { Tenant } from '@/lib/types'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  LogOut,
  Trash2,
  User,
  Users,
  Receipt,
  Phone,
  Mail,
  Building,
  Calendar,
  Pencil,
} from 'lucide-react'

interface Stats {
  totalCustomers: number
  totalTransactions: number
  totalCredits: number
  totalDebits: number
  outstandingBalance: number
}

interface UserProfileData {
  id: string
  email: string | null
  phone: string | null
  lastSignIn: string | null
  createdAt: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getRegistrationBadge(state: Tenant['registration_state']) {
  switch (state) {
    case 'complete':
      return <Badge variant="default">Verified</Badge>
    case 'awaiting_verification':
      return <Badge variant="secondary">Pending Verification</Badge>
    case 'awaiting_email':
      return <Badge variant="destructive">Email Required</Badge>
    default:
      return null
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [editingTenant, setEditingTenant] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [t, s, u] = await Promise.all([getTenant(), getProfileStats(), getUserProfile()])
      setTenant(t)
      setStats(s)
      setUserProfile(u)
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut()
      router.push('/login')
    } catch {
      setLoggingOut(false)
    }
  }

  const handleDeleteAccount = async () => {
    await deleteAccount()
    router.push('/login')
  }

  const initials = tenant?.business_name
    ? tenant.business_name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : ''

  // Use email from session (userProfile) as primary, fallback to tenant
  const displayEmail = userProfile?.email || tenant?.owner_email || 'Not set'

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Your account and business overview" />

      {loading ? (
        <>
          <ProfileCardSkeleton />
          <StatCardSkeleton count={3} />
        </>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Business Profile</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditingTenant(true)}>
                <Pencil className="size-4" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar size="lg">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {initials || <User className="size-5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{tenant?.business_name}</p>
                    {tenant && getRegistrationBadge(tenant.registration_state)}
                  </div>
                  <p className="text-muted-foreground text-sm">Business Account</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-3 sm:grid-cols-2">
                <KycField
                  icon={<Phone className="size-4" />}
                  label="Phone Number"
                  value={tenant?.owner_phone || 'Not set'}
                />
                <KycField
                  icon={<Mail className="size-4" />}
                  label="Email Address"
                  value={displayEmail}
                />
                <KycField
                  icon={<Building className="size-4" />}
                  label="Business Name"
                  value={tenant?.business_name || 'Not set'}
                />
                <KycField
                  icon={<Calendar className="size-4" />}
                  label="Member Since"
                  value={tenant?.created_at ? formatDate(tenant.created_at) : 'Unknown'}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Total Customers"
              value={(stats?.totalCustomers ?? 0).toString()}
              icon={Users}
              variant="muted"
            />
            <StatCard
              label="Total Transactions"
              value={(stats?.totalTransactions ?? 0).toString()}
              icon={Receipt}
              variant="muted"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Money In"
              value={`KES ${(stats?.totalCredits ?? 0).toLocaleString()}`}
              icon={TrendingUp}
              variant="primary"
            />
            <StatCard
              label="Money Out"
              value={`KES ${(stats?.totalDebits ?? 0).toLocaleString()}`}
              icon={TrendingDown}
              variant="destructive"
            />
            <StatCard
              label="Outstanding Balance"
              value={`KES ${(stats?.outstandingBalance ?? 0).toLocaleString()}`}
              icon={Clock}
              variant="muted"
            />
          </div>
        </>
      )}

      <Separator />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut />
          {loggingOut ? 'Logging out…' : 'Logout'}
        </Button>

        <Button
          variant="destructive"
          className="w-full sm:w-auto"
          onClick={() => setDeletingAccount(true)}
        >
          <Trash2 />
          Delete Account
        </Button>
      </div>

      {tenant && (
        <EditTenantModal
          tenant={tenant}
          open={editingTenant}
          onOpenChange={setEditingTenant}
          onSuccess={fetchData}
        />
      )}

      <DeleteAccountModal
        open={deletingAccount}
        onOpenChange={setDeletingAccount}
        onConfirm={handleDeleteAccount}
      />
    </div>
  )
}

function KycField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
