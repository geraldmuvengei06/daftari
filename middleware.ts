import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Skip auth check for RSC/prefetch requests — they carry cookies already
  // and don't need a round-trip to Supabase on every navigation prefetch.
  const isRSC =
    request.headers.has('next-router-state-tree') || request.nextUrl.searchParams.has('_rsc')
  if (isRSC) return supabaseResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((cookie) => request.cookies.set(cookie.name, cookie.value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname === '/login'
  const isPublicPage = ['/privacy-policy', '/terms-of-service', '/data-deletion'].includes(pathname)

  // Not logged in and not on login/public page → redirect to login
  if (!user && !isLoginPage && !isPublicPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Logged in and on login page → redirect to app
  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/customers'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Only run on page navigations — skip static assets, RSC payloads,
     * prefetches, api routes, and auth routes.
     */
    '/((?!_next/static|_next/image|_next/data|api/|auth/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
