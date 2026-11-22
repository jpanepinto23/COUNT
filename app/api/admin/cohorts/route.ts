export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'jpanepinto23@gmail.com'

// Per-cohort funnel (gym and coach records alike), plus onboarding device answers and the Apple Watch waitlist.
export async function GET() {
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: cohorts }, { data: answers }, { count: waitlistCount }] = await Promise.all([
    admin.from('gyms').select('id, name, slug, kind').order('created_at'),
    admin.from('users').select('trains_with').not('trains_with', 'is', null),
    admin.from('apple_watch_waitlist').select('*', { count: 'exact', head: true }),
  ])

  const ids = (cohorts ?? []).map(c => c.id)
  const { data: members } = ids.length
    ? await admin.from('users').select('id, gym_id').in('gym_id', ids)
    : { data: [] as { id: string; gym_id: string }[] }
  const memberIds = (members ?? []).map(m => m.id)

  const [{ data: workouts }, { data: redemptions }] = memberIds.length
    ? await Promise.all([
        admin.from('workouts').select('user_id, verified').in('user_id', memberIds),
        admin.from('redemptions').select('user_id').in('user_id', memberIds),
      ])
    : [{ data: [] as { user_id: string; verified: boolean }[] }, { data: [] as { user_id: string }[] }]

  const verifiedUsers = new Set((workouts ?? []).filter(w => w.verified).map(w => w.user_id))
  const manualUsers = new Set((workouts ?? []).filter(w => !w.verified).map(w => w.user_id))

  const rows = (cohorts ?? []).map(c => {
    const ms = (members ?? []).filter(m => m.gym_id === c.id).map(m => m.id)
    const set = new Set(ms)
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      kind: c.kind,
      signups: ms.length,
      first_verified: ms.filter(id => verifiedUsers.has(id)).length,
      first_manual: ms.filter(id => manualUsers.has(id)).length,
      redemptions: (redemptions ?? []).filter(r => set.has(r.user_id)).length,
    }
  })

  const trainsWith: Record<string, number> = {}
  for (const a of answers ?? []) trainsWith[a.trains_with] = (trainsWith[a.trains_with] ?? 0) + 1

  return NextResponse.json({ cohorts: rows, trains_with: trainsWith, apple_watch_waitlist: waitlistCount ?? 0 })
}
