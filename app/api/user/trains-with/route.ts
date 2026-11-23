export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const ANSWERS = ['garmin', 'strava', 'apple_watch', 'fitbit', 'manual', 'other'] as const

// Onboarding question "What do you train with?". users.trains_with is not client-writable.
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
  const answer = ANSWERS.find(a => a === body.answer)
  if (!answer) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await admin.from('users').update({ trains_with: answer }).eq('id', user.id)
  if (error) {
    console.error('[user/trains-with] update failed', error.message)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
