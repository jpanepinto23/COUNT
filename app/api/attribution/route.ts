export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// users.signup_* columns are not client-writable (authenticated can only
// update name, age, height, weight, avatar_url), so the first touch is
// written here with the service role, once, and never overwritten.

function clean(v: unknown, max = 64): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase().replace(/[^a-z0-9._\-]/g, '').slice(0, max)
  return s || null
}

function cleanPath(v: unknown): string | null {
  if (typeof v !== 'string' || !v.startsWith('/')) return null
  return v.replace(/[^A-Za-z0-9/_\-.]/g, '').slice(0, 128) || null
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const source = clean(body.source)
  if (!source) return NextResponse.json({ error: 'Missing source' }, { status: 400 })

  // Only attribute accounts created after this device's first touch, so an
  // existing user logging in on a new device is not mislabeled.
  const touchedAt = typeof body.at === 'string' ? Date.parse(body.at) : NaN
  const createdAt = user.created_at ? Date.parse(user.created_at) : NaN
  if (Number.isNaN(touchedAt) || Number.isNaN(createdAt) || createdAt < touchedAt) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await admin
    .from('users')
    .update({
      signup_source: source,
      signup_medium: clean(body.medium),
      signup_campaign: clean(body.campaign),
      signup_landing: cleanPath(body.landing),
    })
    .eq('id', user.id)
    .is('signup_source', null)
  if (error) {
    console.error('[attribution] update failed', error.message)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
