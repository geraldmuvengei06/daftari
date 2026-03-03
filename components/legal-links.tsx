import Link from 'next/link'

export function LegalLinks({ className }: { className?: string }) {
  return (
    <div className={`text-muted-foreground flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs ${className ?? ''}`}>
      <Link href="/privacy-policy" className="hover:text-foreground transition-colors">
        Privacy Policy
      </Link>
      <Link href="/terms-of-service" className="hover:text-foreground transition-colors">
        Terms of Service
      </Link>
      <Link href="/data-deletion" className="hover:text-foreground transition-colors">
        Data Deletion
      </Link>
    </div>
  )
}

export function StickyFooter() {
  return (
    <footer className="bg-background/80 sticky bottom-0 z-40 w-full border-t py-3 backdrop-blur-sm">
      <LegalLinks />
    </footer>
  )
}
