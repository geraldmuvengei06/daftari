"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/stat-card"
import { ProfileCardSkeleton, StatCardSkeleton } from "@/components/skeletons"
import { getTenant, getProfileStats, signOut } from "@/lib/actions"
import type { Tenant } from "@/lib/types"
import { TrendingUp, TrendingDown, Clock, LogOut, User, Users, Receipt } from "lucide-react"

interface Stats {
  totalCustomers: number
  totalTransactions: number
  totalCredits: number
  totalDebits: number
  moneyOwed: number
}

export default function ProfilePage() {
  const router = useRouter()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([getTenant(), getProfileStats()])
      setTenant(t)
      setStats(s)
    } catch (err) {
      console.error("Failed to load profile:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut()
      router.push("/login")
    } catch {
      setLoggingOut(false)
    }
  }

  const initials = tenant?.business_name
    ? tenant.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : ""

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
            <CardContent className="flex items-center gap-4 pt-2">
              <Avatar size="lg">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {initials || <User className="size-5" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{tenant?.business_name}</p>
                <p className="text-sm text-muted-foreground">{tenant?.owner_phone || "No phone"}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Total Customers" value={(stats?.totalCustomers ?? 0).toString()} icon={Users} variant="muted" />
            <StatCard label="Total Transactions" value={(stats?.totalTransactions ?? 0).toString()} icon={Receipt} variant="muted" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Money In" value={`KES ${(stats?.totalCredits ?? 0).toLocaleString()}`} icon={TrendingUp} variant="primary" />
            <StatCard label="Money Out" value={`KES ${(stats?.totalDebits ?? 0).toLocaleString()}`} icon={TrendingDown} variant="destructive" />
            <StatCard label="Money Owed" value={`KES ${(stats?.moneyOwed ?? 0).toLocaleString()}`} icon={Clock} variant="muted" />
          </div>
        </>
      )}

      <Separator />

      <Button variant="destructive" className="w-full sm:w-auto" onClick={handleLogout} disabled={loggingOut}>
        <LogOut />
        {loggingOut ? "Logging out…" : "Logout"}
      </Button>
    </div>
  )
}
