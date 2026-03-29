import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const { data: redemptions, error } = await supabaseAdmin
      .from('redemptions')
      .select('id, points_spent, redeemed_at, user_id, reward_id')
      .order('redeemed_at', { ascending: false })

    if (error) throw error

    const userIds = [...new Set((redemptions ?? []).map((r: any) => r.user_id))]
    const rewardIds = [...new Set((redemptions ?? []).map((r: any) => r.reward_id))]

    const [{ data: users }, { data: rewards }] = await Promise.all([
      supabaseAdmin.from('users').select('*').in('id', userIds),
      supabaseAdmin.from('rewards').select('*').in('id', rewardIds),
    ])

    const userMap: Record<string, any> = Object.fromEntries((users ?? []).map((u: any) => [String(u.id), u]))
    const rewardMap: Record<string, any> = Object.fromEntries((rewards ?? []).map((r: any) => [String(r.id), r]))

    const enriched = (redemptions ?? []).map((r: any) => ({
      id: r.id,
      redeemed_at: r.redeemed_at,
      points_spent: r.points_spent,
      user_name: userMap[String(r.user_id)]?.name ?? userMap[String(r.user_id)]?.full_name ?? 'Unknown',
      user_email: userMap[String(r.user_id)]?.email ?? 'Unknown',
      product_name: rewardMap[String(r.reward_id)]?.name ?? rewardMap[String(r.reward_id)]?.product_name ?? 'Unknown',
      brand_name: rewardMap[String(r.reward_id)]?.brand_name ?? '',
      retail_value: rewardMap[String(r.reward_id)]?.retail_value ?? 0,
    }))

    return NextResponse.json(enriched)
  } catch (err) {
    console.error('Admin redemptions error:', err)
    return NextResponse.json({ error: 'Failed to fetch redemptions' }, { status: 500 })
  }
}
