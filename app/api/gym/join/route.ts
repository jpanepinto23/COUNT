export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// users.gym_id is not client-writable, so joining a gym goes through the service role.
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
  const slug = typeof body.slug === 'string' ? body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64) : ''
  if (!slug) return NextResponse.json({ error: 'Missing gym' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: gym } = await admin.from('gyms').select('id').eq('slug', slug).maybeSingle()
  if (!gym) return NextResponse.json({ error: 'Gym not found' }, { status: 404 })

  const { error } = await admin.from('users').update({ gym_id: gym.id }).eq('id', user.id)
  if (error) {
    console.error('[gym/join] update failed', error.message)
    return NextResponse.json({ error: 'Could not join gym' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
