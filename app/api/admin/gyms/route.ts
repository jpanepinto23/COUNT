export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'jpanepinto23@gmail.com'

export async function GET() {
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // All gyms
  const { data: gyms } = await admin.from('gyms').select('id, name, slug').eq('kind', 'gym').order('created_at')
  if (!gyms?.length) return NextResponse.json([])

  const gymIds = gyms.map(g => g.id)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)

  // Members connected = signed up via gym link AND have Strava or Garmin connected
  const { data: gymUsers } = await admin
    .from('users')
    .select('id, name, email, tier, lifetime_sessions, points_balance, gym_id, created_at')
    .in('gym_id', gymIds)

  const { data: stravaConns } = await admin
    .from('strava_connections')
    .select('user_id')
  const stravaSet = new Set((stravaConns ?? []).map((c: any) => c.user_id))

  const { data: garminConns } = await admin
    .from('garmin_connections')
    .select('user_id')
  const terraSet = new Set((garminConns ?? []).map((c: any) => c.user_id))

  // Weekly active: at least one workout in last 7 days
  const { data: recentWorkouts } = await admin
    .from('workouts')
    .select('user_id')
    .gte('logged_at', weekAgo.toISOString())
  const activeSet = new Set((recentWorkouts ?? []).map((w: any) => w.user_id))

  // Total redemptions per user
  const { data: redemptions } = await admin
    .from('redemptions')
    .select('user_id')
  const redemptionCount: Record<string, number> = {}
  for (const r of redemptions ?? []) {
    redemptionCount[r.user_id] = (redemptionCount[r.user_id] ?? 0) + 1
  }

  // Brand survey responses per gym
  const { data: surveyRows } = await admin
    .from('brand_survey_responses')
    .select('gym_id, selected_brands, other_brands, local_shops')
    .in('gym_id', gymIds)

  const result = gyms.map(gym => {
    const members = (gymUsers ?? []).filter(u => u.gym_id === gym.id)
    const memberIds = new Set(members.map(m => m.id))

    const connected = members.filter(m => stravaSet.has(m.id) || terraSet.has(m.id))
    const weeklyActive = members.filter(m => activeSet.has(m.id))
    const totalRedemptions = members.reduce((acc, m) => acc + (redemptionCount[m.id] ?? 0), 0)

    // Brand survey aggregation
    const gymSurveys = (surveyRows ?? []).filter(s => s.gym_id === gym.id)
    const brandCounts: Record<string, number> = {}
    const otherBrandsList: string[] = []
    const localShopsList: string[] = []
    for (const s of gymSurveys) {
      for (const b of s.selected_brands ?? []) {
        brandCounts[b] = (brandCounts[b] ?? 0) + 1
      }
      if (s.other_brands?.trim()) otherBrandsList.push(s.other_brands.trim())
      if (s.local_shops?.trim()) localShopsList.push(s.local_shops.trim())
    }

    return {
      id: gym.id,
      name: gym.name,
      slug: gym.slug,
      total_members: members.length,
      connected_members: connected.length,
      weekly_active: weeklyActive.length,
      total_redemptions: totalRedemptions,
      members: members.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        tier: m.tier,
        lifetime_sessions: m.lifetime_sessions,
        points_balance: m.points_balance,
        connected: stravaSet.has(m.id) || terraSet.has(m.id),
        active_this_week: activeSet.has(m.id),
        created_at: m.created_at,
      })),
      survey: {
        responses: gymSurveys.length,
        brand_counts: brandCounts,
        other_brands: otherBrandsList,
        local_shops: localShopsList,
      },
    }
  })

  return NextResponse.json(result)
}
