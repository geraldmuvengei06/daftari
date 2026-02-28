import { redirect } from "next/navigation"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const tokenHash = params.token_hash
  const type = params.type
  const code = params.code

  // If magic link lands here, forward to auth callback
  if (tokenHash || code) {
    const qs = new URLSearchParams()
    if (tokenHash) qs.set("token_hash", tokenHash)
    if (type) qs.set("type", type)
    if (code) qs.set("code", code)
    redirect(`/auth/callback?${qs.toString()}`)
  }

  redirect("/customers")
}
