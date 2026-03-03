'use client'

export function BackgroundPattern() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <svg className="absolute h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="ledger-pattern"
            x="0"
            y="0"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            {/* Ledger/Book icon */}
            <g
              className="fill-none stroke-primary/[0.07] dark:stroke-primary/12"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(10, 10) scale(0.9)"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <path d="M8 7h6" />
              <path d="M8 11h8" />
            </g>

            {/* Wallet/Payment icon */}
            <g
              className="fill-none stroke-primary/[0.07] dark:stroke-primary/12"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(70, 60) scale(0.9)"
            >
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </g>

            {/* Coins/Money icon */}
            <g
              className="fill-none stroke-primary/[0.07] dark:stroke-primary/12"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(65, 10) scale(0.85)"
            >
              <circle cx="8" cy="8" r="6" />
              <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
              <path d="M7 6h2v4" />
            </g>

            {/* Receipt icon */}
            <g
              className="fill-none stroke-primary/[0.07] dark:stroke-primary/12"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(15, 65) scale(0.85)"
            >
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
              <path d="M8 10h8" />
              <path d="M8 14h4" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ledger-pattern)" />
      </svg>
    </div>
  )
}
