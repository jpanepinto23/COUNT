import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const { data: workouts, error } = await supabaseAdmin
      .from('workouts')
      .select('id, logged_at, user_id, type, verification_method, total_points_earned')
      .order('logged_at', { ascending: false })
      .limit(200)
    if (error) throw error

    const userIds = [...new Set((workouts ?? []).map((w: any) => w.user_id))]
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .in('id', userIds)

    const userMap: Record<string, any> = Object.fromEntries(
      (users ?? []).map((u: any) => [String(u.id), u])
    )

    const enriched = (workouts ?? []).map((w: any) => ({
      ...w,
      user_name: userMap[String(w.user_id)]?.name ?? 'Unknown',
      user_email: userMap[String(w.user_id)]?.email ?? 'Unknown',
      points_earned: w.total_points_earned ?? 0,
      workout_type: w.type,
      created_at: w.logged_at,
    }))

    return NextResponse.json(enriched)
  } catch (err) {
    console.error('Admin workouts error:', err)
    return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 })
  }
}
