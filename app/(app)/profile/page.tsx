"use client"

import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/stat-card"
import { ProfileCardSkeleton, StatCardSkeleton } from "@/components/skeletons"
import { getProfileStats } from "@/lib/actions"
import { Users, Receipt, TrendingUp, TrendingDown, LogOut } from "lucide-react"

interface Stats {
  totalCustomers: number
  totalTransactions: number
  totalCredits: number
  totalDebits: number
}

export default function ProfilePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const data = await getProfileStats()
      setStats(data)
    } catch (err) {
      console.error("Failed to load profile stats:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Your account and business overview" />

      {loading ? (
        <>
          <ProfileCardSkeleton />
          <StatCardSkeleton count={4} />
        </>
      ) : (
        <>
          <Card>
            <CardContent className="flex items-center gap-4 pt-2">
              <Avatar size="lg">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  JD
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">John Doe</p>
                <p className="text-sm text-muted-foreground">+254 700 000 000</p>
                <p className="text-xs text-muted-foreground">Daftari Business</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Total Customers" value={(stats?.totalCustomers ?? 0).toString()} icon={Users} variant="muted" />
            <StatCard label="Total Transactions" value={(stats?.totalTransactions ?? 0).toString()} icon={Receipt} variant="muted" />
            <StatCard label="Money In (Credits)" value={`KES ${(stats?.totalCredits ?? 0).toLocaleString()}`} icon={TrendingUp} variant="primary" />
            <StatCard label="Money Out (Debits)" value={`KES ${(stats?.totalDebits ?? 0).toLocaleString()}`} icon={TrendingDown} variant="destructive" />
          </div>
        </>
      )}

      <Separator />

      <Button variant="destructive" className="w-full sm:w-auto">
        <LogOut />
        Logout
      </Button>
    </div>
  )
}
