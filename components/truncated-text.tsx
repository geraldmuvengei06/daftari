'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface TruncatedTextProps {
  text: string
  maxLength?: number
  title?: string
}

export function TruncatedText({
  text,
  maxLength = 40,
  title = 'Full Message',
}: TruncatedTextProps) {
  const [open, setOpen] = useState(false)

  if (!text) return <span className="text-muted-foreground">—</span>

  const truncated = text.length > maxLength

  return (
    <>
      <span className="inline-flex items-baseline gap-1">
        <span className="whitespace-normal">
          {truncated ? text.slice(0, maxLength) + '…' : text}
        </span>
        {truncated && (
          <button
            type="button"
            className="text-primary shrink-0 text-xs hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(true)
            }}
          >
            more
          </button>
        )}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm whitespace-pre-wrap">{text}</p>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  )
}
