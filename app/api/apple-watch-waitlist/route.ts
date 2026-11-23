export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Apple Watch interest capture only. No integration, no email sent.
// One row per email; re-submitting is a no-op success.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : ''
  const source = body.source === 'onboarding' ? 'onboarding' : 'homepage'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  // Attach the signed-in user when there is one; anonymous entries are fine.
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await authClient.auth.getUser()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await admin
    .from('apple_watch_waitlist')
    .upsert({ email, source, user_id: user?.id ?? null }, { onConflict: 'email', ignoreDuplicates: true })
  if (error) {
    console.error('[apple-watch-waitlist] insert failed', error.message)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
