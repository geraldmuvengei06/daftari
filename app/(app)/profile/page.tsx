"use client"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/stat-card"
import { customers, payments } from "@/lib/mock-data"
import { Users, Receipt, TrendingUp, TrendingDown, LogOut } from "lucide-react"

const totalCustomers = customers.length
const totalTransactions = payments.length
const totalCredits = payments
  .filter((p) => p.type === "credit")
  .reduce((sum, p) => sum + p.amount, 0)
const totalDebits = payments
  .filter((p) => p.type === "debit")
  .reduce((sum, p) => sum + p.amount, 0)

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Your account and business overview" />

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
        <StatCard label="Total Customers" value={totalCustomers.toString()} icon={Users} variant="muted" />
        <StatCard label="Total Transactions" value={totalTransactions.toString()} icon={Receipt} variant="muted" />
        <StatCard label="Money In (Credits)" value={`KES ${totalCredits.toLocaleString()}`} icon={TrendingUp} variant="primary" />
        <StatCard label="Money Out (Debits)" value={`KES ${totalDebits.toLocaleString()}`} icon={TrendingDown} variant="destructive" />
      </div>

      <Separator />

      <Button variant="destructive" className="w-full sm:w-auto">
        <LogOut />
        Logout
      </Button>
    </div>
  )
}
