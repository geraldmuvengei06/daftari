"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { signOut } from "@/lib/actions"
import { CreditCard, Lightbulb, LogOut, User, Users } from "lucide-react"

const topNavLinks = [
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/feature-request", label: "Feature Request", icon: Lightbulb },
]

const mobileTabLinks = [
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/feature-request", label: "Requests", icon: Lightbulb },
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/customers">
            <Logo />
          </Link>

          <nav className="hidden gap-1 sm:flex">
            {topNavLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={pathname.startsWith(link.href) ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "text-white hover:text-white hover:bg-white/15",
                    pathname.startsWith(link.href) && "font-semibold bg-white/20"
                  )}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/15">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-white/20 text-white text-xs">
                    JD
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                <LogOut />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background sm:hidden">
        <div className="flex">
          {mobileTabLinks.map((link) => {
            const Icon = link.icon
            const active = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors",
                  active
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
                {link.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
