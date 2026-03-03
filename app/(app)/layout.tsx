import { Header } from '@/components/header'
import { SetupPhoneModal } from '@/components/setup-phone-modal'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:pb-6">{children}</main>
      <SetupPhoneModal />
    </div>
  )
}
