import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

// Tier ladder: per the referral program design.
// "manual: true" tiers require Joe to ship a physical/comp reward — Slack ping flags it.
const TIERS = [
  { count: 1, name: 'Spark', points: 50, manual: false },
  { count: 3, name: 'Crew', points: 250, manual: false },
  { count: 5, name: 'Ambassador', points: 0, manual: true },
  { count: 10, name: 'Founding Crew', points: 0, manual: true },
  { count: 25, name: 'Hall of Fame', points: 0, manual: true },
]

async function pingSlack(text: string) {
  if (!SLACK_WEBHOOK_URL) return
  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch (err) {
    console.error('[Slack] referral notify error:', err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { referrer_id, referred_id } = await req.json()
    if (!referrer_id) {
      return NextResponse.json({ error: 'missing referrer_id' }, { status: 400 })
    }

    const { count, error: countError } = await supabaseAdmin
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', referrer_id)

    if (countError) {
      console.error('[referrals/award] count error:', countError)
      return NextResponse.json({ error: 'count failed' }, { status: 500 })
    }

    if (!count) {
      return NextResponse.json({ success: true, milestone: null })
    }

    const tier = TIERS.find(t => t.count === count)
    if (!tier) {
      return NextResponse.json({ success: true, milestone: null, count })
    }

    const { data: referrer } = await supabaseAdmin
      .from('users')
      .select('id, email, name, points_balance, points_lifetime_earned')
      .eq('id', referrer_id)
      .single()

    if (!referrer) {
      console.error('[referrals/award] referrer not found:', referrer_id)
      return NextResponse.json({ error: 'referrer not found' }, { status: 404 })
    }

    if (tier.points > 0) {
      const newBalance = (referrer.points_balance || 0) + tier.points
      const newLifetime = (referrer.points_lifetime_earned || 0) + tier.points
      await supabaseAdmin
        .from('users')
        .update({ points_balance: newBalance, points_lifetime_earned: newLifetime })
        .eq('id', referrer_id)
    }

    if (referred_id) {
      await supabaseAdmin
        .from('referrals')
        .update({ bonus_points: tier.points, bonus_awarded: true })
        .eq('referrer_id', referrer_id)
        .eq('referred_id', referred_id)
    }

    const who = referrer.name ? `${referrer.name} (${referrer.email})` : referrer.email
    const msg = tier.manual
      ? `🏆 *Tier unlocked: ${tier.name}*\n${who} just hit ${tier.count} referrals.\n*Manual fulfillment required* — send the reward.`
      : `🎯 *Tier unlocked: ${tier.name}*\n${who} just hit ${tier.count} referrals. Awarded ${tier.points} pts.`
    await pingSlack(msg)

    return NextResponse.json({
      success: true,
      tier: tier.name,
      points: tier.points,
      manual: tier.manual,
      count,
    })
  } catch (err) {
    console.error('[referrals/award] unexpected error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
