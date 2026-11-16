export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await req.json().catch(() => ({}))
  const { selected_brands = [], other_brands = '', local_shops = '', skipped = false } = body

  // Look up the user's gym_id
  const { data: profile } = await admin
    .from('users')
    .select('gym_id')
    .eq('id', user.id)
    .single()

  // If not skipped, store the response
  if (!skipped) {
    await admin.from('brand_survey_responses').insert({
      user_id: user.id,
      gym_id: profile?.gym_id ?? null,
      selected_brands,
      other_brands: other_brands.trim() || null,
      local_shops: local_shops.trim() || null,
    })
  }

  // Always mark as shown; mark completed only if answered
  await admin.from('users').update({
    brand_survey_shown: true,
    ...(skipped ? {} : { brand_survey_completed: true }),
  }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
