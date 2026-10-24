// Shared "a tracker says the user worked out" logic, used by the Terra and
// Garmin webhook receivers. Mirrors the client-side commitWorkout in
// app/(app)/log/page.tsx (points, streak, tier, referral) and enforces COUNT's
// one-credited-session-per-day rule server-side.

import { calculatePoints, getTier, getReferralPoints } from '@/lib/points'
import type { Tier } from '@/lib/points'

/* eslint-disable @typescript-eslint/no-explicit-any */

const TIER_MULTIPLIERS: Record<string, number> = { bronze: 1.0, silver: 1.5, gold: 2.0, platinum: 3.0 }

export interface TrackedActivity {
  /** ISO start time of the activity */
  startTime: string
  durationSeconds: number | null
  heartRateAvg: number | null
  calories: number | null
  /** COUNT workout type */
  workoutType: 'cardio' | 'hiit' | 'full_body' | 'custom'
  /** connected_devices.type / workouts.verification_method value, e.g. 'garmin' */
  deviceType: string
  /** Display name used in the workout note */
  activityName: string
}

export type CreditOutcome = 'not_today' | 'already_verified' | 'upgraded' | 'minted' | 'no_user'

/**
 * Credit a tracker activity against today's workout:
 *   - activity not from today            → nothing (one credit per day, today only)
 *   - today's workout already verified   → nothing
 *   - today's workout logged unverified  → upgrade to verified (+25%)
 *   - no workout today                   → create a verified workout + award coins
 */
export async function creditActivity(supabase: any, userId: string, a: TrackedActivity): Promise<CreditOutcome> {
  const activityDate = new Date(a.startTime)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  if (activityDate < todayStart || activityDate > todayEnd) return 'not_today'

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
    if (existing.verified) return 'already_verified'
    const verifiedTotal = Math.round(existing.total_points_earned * 1.25)
    const diff = verifiedTotal - existing.total_points_earned
    await supabase.from('workouts').update({
      verified: true,
      verification_method: a.deviceType,
      heart_rate_avg: a.heartRateAvg,
      calories: a.calories,
      total_points_earned: verifiedTotal,
    }).eq('id', existing.id)
    if (diff > 0) {
      await supabase.rpc('increment_user_points', { p_user_id: userId, p_points: diff })
    }
    return 'upgraded'
  }

  const ok = await mintFromActivity(supabase, userId, {
    type: a.workoutType,
    durationMinutes: a.durationSeconds ? Math.max(1, Math.round(a.durationSeconds / 60)) : 60,
    heartRateAvg: a.heartRateAvg,
    calories: a.calories,
    loggedAt: a.startTime,
    deviceType: a.deviceType,
    activityName: a.activityName,
  })
  return ok ? 'minted' : 'no_user'
}

function providerLabel(deviceType: string): string {
  const map: Record<string, string> = { garmin: 'Garmin', strava: 'Strava', fitbit: 'Fitbit', apple_health: 'Apple Health', google_fit: 'Google Fit' }
  return map[deviceType] ?? deviceType
}

// Server-side mint. Deliberately omits the mystery bonus, which is a UI
// reveal tied to actively logging in the app.
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
): Promise<boolean> {
  const { data: u } = await supabase
    .from('users')
    .select('multiplier, lifetime_sessions, current_streak, longest_streak, points_balance, points_lifetime_earned, referred_by, referral_bonus_claimed')
    .eq('id', userId)
    .single()
  if (!u) return false

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
    notes: `Auto-synced from ${providerLabel(opts.deviceType)}: ${opts.activityName}`,
  })
  if (insErr) return false

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
  return true
}
