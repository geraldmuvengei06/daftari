"use client"

import { useEffect, useRef } from "react"
import { createSupabaseBrowser } from "./supabase-browser"
import { getCurrentTenantId } from "./actions"

/**
 * Subscribes to INSERT events on a table, filtered by tenant_id.
 * Calls `onInsert` whenever a new row appears for the current tenant.
 * Optionally filter further by a column (e.g. customer_id).
 */
export function useRealtimeInserts(
  table: string,
  onInsert: () => void,
  filterColumn?: string,
  filterValue?: string
) {
  const onInsertRef = useRef(onInsert)
  onInsertRef.current = onInsert

  useEffect(() => {
    const supabase = createSupabaseBrowser()
    let cleanup: (() => void) | null = null
    let cancelled = false

    getCurrentTenantId().then((tenantId) => {
      if (cancelled) return

      const filter = filterColumn && filterValue
        ? `tenant_id=eq.${tenantId},${filterColumn}=eq.${filterValue}`
        : `tenant_id=eq.${tenantId}`

      const channelName = filterValue
        ? `${table}-${tenantId}-${filterValue}`
        : `${table}-${tenantId}`

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table, filter },
          () => onInsertRef.current()
        )
        .subscribe()

      cleanup = () => supabase.removeChannel(channel)
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [table, filterColumn, filterValue])
}
