import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, created_at, tier, lifetime_sessions, points_balance, points_lifetime_earned, current_streak, free_unverified_remaining')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(users ?? [])
  } catch (err) {
    console.error('Admin users error:', err)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
