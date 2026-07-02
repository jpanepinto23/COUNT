import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { calculatePoints, getTier, getReferralPoints } from '@/lib/points'
import type { Tier } from '@/lib/points'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function verifySignature(body: string, header: string | null, secret: string): boolean {
    if (!header || !secret) return false
    // Terra signs Stripe-style: the header is "t=<timestamp>,v1=<hex>" and the
    // signature is HMAC-SHA256 over `${timestamp}.${rawBody}` — not the body alone.
    let timestamp = ''
    const signatures: string[] = []
    for (const element of header.split(',')) {
          const idx = element.indexOf('=')
          if (idx === -1) continue
          const prefix = element.slice(0, idx).trim()
          const value = element.slice(idx + 1).trim()
          if (prefix === 't') timestamp = value
          else if (prefix === 'v1') signatures.push(value)
    }
    if (!timestamp || signatures.length === 0) {
          console.warn('Terra webhook: malformed terra-signature header')
          return false
    }
    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
    const valid = signatures.some((sig) => {
          try {
                  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
          } catch {
                  return false
          }
    })
    if (!valid) console.warn('Terra webhook: signature mismatch')
    return valid
}

const TIER_MULTIPLIERS: Record<string, number> = { bronze: 1.0, silver: 1.5, gold: 2.0, platinum: 3.0 }

function getDeviceType(provider: string): string {
  const map: Record<string, string> = {
    APPLE: 'apple_health', GARMIN: 'garmin', FITBIT: 'fitbit', GOOGLE: 'google_fit',
  }
  return map[provider.toUpperCase()] ?? provider.toLowerCase()
}

// Map a Terra/Garmin activity name to a valid COUNT workout type.
function mapWorkoutType(name: string): 'cardio' | 'hiit' | 'full_body' | 'custom' {
  const n = (name || '').toLowerCase()
  if (/hiit|crossfit|interval/.test(n)) return 'hiit'
  if (/strength|weight|gym|lifting/.test(n)) return 'full_body'
  // most Garmin activities (run/ride/swim/walk/row/etc.) are cardio — safe default
  return 'cardio'
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  const bodyText = await req.text()
  const signature = req.headers.get('terra-signature')

  if (process.env.TERRA_SIGNING_SECRET) {
    if (!verifySignature(bodyText, signature, process.env.TERRA_SIGNING_SECRET)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: any
  try { payload = JSON.parse(bodyText) } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, user, data } = payload
  if (type !== 'activity') return NextResponse.json({ received: true })
  if (!user?.reference_id || !Array.isArray(data) || !data.length) {
    return NextResponse.json({ received: true })
  }

  const supabase = createServiceClient()
  const userId: string = user.reference_id
  const terraUserId: string = user.user_id
  const provider: string = user.provider ?? 'UNKNOWN'
  const deviceType = getDeviceType(provider)

  for (const activity of data) {
    const metadata = activity.metadata ?? {}
    const startTime = metadata.start_time
    if (!startTime) continue

    const endTime = metadata.end_time ?? null
    const durationSeconds = activity.active_durations_data?.activity_seconds ?? null
    const calories = activity.calories_data?.total_burned_calories != null
      ? Math.round(activity.calories_data.total_burned_calories) : null
    const heartRateAvg = activity.heart_rate_data?.summary?.avg_hr_bpm != null
      ? Math.round(activity.heart_rate_data.summary.avg_hr_bpm) : null
    const activityName: string = metadata.name ?? String(metadata.type ?? 'Workout')
    const activityId: string = String(metadata.id ?? (terraUserId + '-' + startTime))

    // Record the raw activity (idempotent on activity_id).
    await supabase.from('terra_activities').upsert({
      user_id: userId,
      terra_user_id: terraUserId,
      activity_id: activityId,
      provider,
      activity_type: activityName,
      start_time: startTime,
      end_time: endTime,
      duration_seconds: durationSeconds,
      calories,
      heart_rate_avg: heartRateAvg,
      raw_data: activity,
    }, { onConflict: 'activity_id' })

    // COUNT credits one session per day — only act on activities from today.
    const activityDate = new Date(startTime)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    if (activityDate < todayStart || activityDate > todayEnd) continue

    const { data: todayWorkouts } = await supabase
      .from('workouts')
      .select('id, verified, total_points_earned')
      .eq('user_id', userId)
      .gte('logged_at', todayStart.toISOString())
      .lte('logged_at', todayEnd.toISOString())
      .order('logged_at', { ascending: false })
      .limit(1)

    const existing = todayWorkouts?.[0]

    if (existing) {
      // Upgrade an unverified manual log to verified (+25% = the verified bonus).
      if (!existing.verified) {
        const verifiedTotal = Math.round(existing.total_points_earned * 1.25)
        const diff = verifiedTotal - existing.total_points_earned
        await supabase.from('workouts').update({
          verified: true,
          verification_method: deviceType,
          heart_rate_avg: heartRateAvg,
          calories,
          total_points_earned: verifiedTotal,
        }).eq('id', existing.id)
        if (diff > 0) {
          await supabase.rpc('increment_user_points', { p_user_id: userId, p_points: diff })
        }
      }
      // else: already have a verified workout today — one per day, nothing to do.
      continue
    }

    // No workout today → auto-create a verified workout from this activity + award coins.
    await mintFromActivity(supabase, userId, {
      type: mapWorkoutType(activityName),
      durationMinutes: durationSeconds ? Math.max(1, Math.round(durationSeconds / 60)) : 60,
      heartRateAvg,
      calories,
      loggedAt: startTime,
      deviceType,
      activityName,
    })
  }

  return NextResponse.json({ received: true })
}

// Server-side mint — mirrors the client-side commitWorkout in app/(app)/log/page.tsx
// (points, streak, tier, referral). Deliberately omits the mystery bonus, which is
// a UI reveal tied to actively logging in the app.
async function mintFromActivity(
  supabase: any,
  userId: string,
  opts: {
    type: string
    durationMinutes: number
    heartRateAvg: number | null
    calories: number | null
    loggedAt: string
    deviceType: string
    activityName: string
  }
) {
  const { data: u } = await supabase
    .from('users')
    .select('multiplier, lifetime_sessions, current_streak, longest_streak, points_balance, points_lifetime_earned, referred_by, referral_bonus_claimed')
    .eq('id', userId)
    .single()
  if (!u) return

  const pts = calculatePoints({
    verified: true,
    lifetimeSessions: u.lifetime_sessions,
    currentStreak: u.current_streak,
  })

  const { error: insErr } = await supabase.from('workouts').insert({
    user_id: userId,
    type: opts.type,
    custom_name: null,
    duration_minutes: opts.durationMinutes,
    verification_method: opts.deviceType,
    verified: true,
    heart_rate_avg: opts.heartRateAvg,
    calories: opts.calories,
    base_points: pts.base,
    multiplier_applied: pts.multiplier,
    total_points_earned: pts.total,
    logged_at: opts.loggedAt,
    notes: `Auto-synced from ${opts.deviceType === 'garmin' ? 'Garmin' : opts.deviceType}: ${opts.activityName}`,
  })
  if (insErr) return

  // Streak: +1 if there was a workout yesterday, else reset to 1.
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0, 0, 0, 0)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const { data: y } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', userId)
    .gte('logged_at', yesterday.toISOString())
    .lt('logged_at', todayStart.toISOString())
    .limit(1)

  const newStreak = y && y.length > 0 ? u.current_streak + 1 : 1
  const newLongest = Math.max(u.longest_streak ?? 0, newStreak)
  const newSessions = u.lifetime_sessions + 1
  const newTier = getTier(newSessions)

  await supabase.from('users').update({
    lifetime_sessions: newSessions,
    tier: newTier,
    multiplier: TIER_MULTIPLIERS[newTier],
    points_balance: (u.points_balance ?? 0) + pts.total,
    points_lifetime_earned: (u.points_lifetime_earned ?? 0) + pts.total,
    current_streak: newStreak,
    longest_streak: newLongest,
  }).eq('id', userId)

  // Referral bonus on the user's first-ever session.
  if (u.lifetime_sessions === 0 && u.referred_by && !u.referral_bonus_claimed) {
    const { data: referrer } = await supabase
      .from('users')
      .select('id, points_balance, points_lifetime_earned, tier')
      .eq('id', u.referred_by)
      .single()
    if (referrer) {
      const bonus = getReferralPoints(referrer.tier as Tier)
      await supabase.from('users').update({
        points_balance: referrer.points_balance + bonus,
        points_lifetime_earned: referrer.points_lifetime_earned + bonus,
      }).eq('id', referrer.id)
      await supabase.from('users').update({ referral_bonus_claimed: true }).eq('id', userId)
      await supabase.from('referrals')
        .update({ bonus_awarded: true, bonus_awarded_at: new Date().toISOString() })
        .eq('referred_id', userId)
    }
  }
}
