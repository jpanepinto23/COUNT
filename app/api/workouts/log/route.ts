import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  calculatePoints,
  generateMysteryBonus,
  getTier,
  getTierMultiplier,
  getReferralPoints,
  type Tier,
} from '@/lib/points'
import { getTodaysStravaActivity } from '@/lib/strava'

// The ONLY path that awards workout points. The client sends what the user did
// (type, duration, effort, notes) — never how many points it's worth and never
// whether it was verified. Verification is re-checked here against Terra and
// Strava, and all point math runs server-side.

const VALID_TYPES = new Set([
  'push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'cardio', 'hiit', 'custom',
])

const MAX_DURATION_MINUTES = 360

export async function POST(req: NextRequest) {
  // 1. Authenticate the caller from the session cookie.
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )
  const { data: { user: authUser } } = await authClient.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Validate and clamp input. Nothing here affects points except duration
  //    bounds — points come from server state, not the request.
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const type = typeof body.type === 'string' && VALID_TYPES.has(body.type) ? body.type : null
  if (!type) {
    return NextResponse.json({ error: 'Invalid workout type' }, { status: 400 })
  }
  const duration = Math.min(
    Math.max(Math.round(Number(body.duration) || 60), 1),
    MAX_DURATION_MINUTES
  )
  const effortRaw = Math.round(Number(body.effortRating) || 0)
  const effortRating = effortRaw >= 1 && effortRaw <= 5 ? effortRaw : null
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) || null : null
  const customName =
    type === 'custom' && typeof body.customName === 'string'
      ? body.customName.trim().slice(0, 80) || null
      : null

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 3. Load the caller's profile (server-trusted state).
  const { data: profile, error: profileErr } = await admin
    .from('users')
    .select('id, lifetime_sessions, current_streak, longest_streak, points_balance, points_lifetime_earned, referred_by, referral_bonus_claimed')
    .eq('id', authUser.id)
    .single()
  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
  }

  // 4. One session per day.
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { data: todaySession } = await admin
    .from('workouts')
    .select('id')
    .eq('user_id', authUser.id)
    .gte('logged_at', todayStart.toISOString())
    .limit(1)
  if (todaySession && todaySession.length > 0) {
    return NextResponse.json(
      { error: 'You’ve already logged a session today. One per day.' },
      { status: 409 }
    )
  }

  // 5. Server-side verification. The client's claim is ignored; we check the
  //    tracker sources ourselves.
  let verified = false
  let verificationMethod = 'unverified'
  let heartRateAvg: number | null = null
  let calories: number | null = null

  const { data: terraActivity } = await admin
    .from('terra_activities')
    .select('provider, heart_rate_avg, calories')
    .eq('user_id', authUser.id)
    .gte('start_time', todayStart.toISOString())
    .order('start_time', { ascending: false })
    .limit(1)

  if (terraActivity && terraActivity.length > 0) {
    verified = true
    const provider = terraActivity[0].provider?.toUpperCase()
    verificationMethod =
      provider === 'APPLE' ? 'apple_health' :
      provider === 'GARMIN' ? 'garmin' :
      provider === 'FITBIT' ? 'fitbit' :
      provider === 'GOOGLE' ? 'google_fit' :
      provider?.toLowerCase() ?? 'unverified'
    heartRateAvg = terraActivity[0].heart_rate_avg
    calories = terraActivity[0].calories
  }

  if (!verified) {
    try {
      const strava = await getTodaysStravaActivity(admin, authUser.id)
      if (strava.found) {
        verified = true
        verificationMethod = 'strava'
        heartRateAvg = strava.activity.heart_rate_avg ?? heartRateAvg
      }
    } catch {
      /* strava check is best-effort */
    }
  }

  // 6. Compute points from server state only.
  const pts = calculatePoints({
    verified,
    lifetimeSessions: profile.lifetime_sessions,
    currentStreak: profile.current_streak,
  })

  // 7. Insert the workout.
  const { error: workoutError } = await admin.from('workouts').insert({
    user_id: authUser.id,
    type,
    custom_name: customName,
    duration_minutes: duration,
    verification_method: verificationMethod,
    verified,
    heart_rate_avg: heartRateAvg,
    calories,
    base_points: pts.base,
    multiplier_applied: pts.multiplier,
    total_points_earned: pts.total,
    effort_rating: effortRating,
    notes,
  })
  if (workoutError) {
    return NextResponse.json({ error: workoutError.message }, { status: 500 })
  }

  // 8. Streak, tier, mystery bonus — same math as before, now server-side.
  const newSessions = profile.lifetime_sessions + 1
  const newTier = getTier(newSessions)

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const { data: yesterdaySession } = await admin
    .from('workouts')
    .select('id')
    .eq('user_id', authUser.id)
    .gte('logged_at', yesterday.toISOString())
    .lt('logged_at', todayStart.toISOString())
    .limit(1)

  const newStreak = yesterdaySession && yesterdaySession.length > 0 ? profile.current_streak + 1 : 1
  const newLongest = Math.max(profile.longest_streak, newStreak)

  const bonus = generateMysteryBonus(newStreak)
  const totalWithBonus = pts.total + bonus.amount

  const { error: updateError } = await admin
    .from('users')
    .update({
      lifetime_sessions: newSessions,
      tier: newTier,
      multiplier: getTierMultiplier(newTier),
      points_balance: profile.points_balance + totalWithBonus,
      points_lifetime_earned: profile.points_lifetime_earned + totalWithBonus,
      current_streak: newStreak,
      longest_streak: newLongest,
    })
    .eq('id', authUser.id)
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // 9. First-workout referral bonus.
  if (profile.lifetime_sessions === 0 && profile.referred_by && !profile.referral_bonus_claimed) {
    const { data: referrer } = await admin
      .from('users')
      .select('id, points_balance, points_lifetime_earned, tier')
      .eq('id', profile.referred_by)
      .single()
    if (referrer) {
      const referralPts = getReferralPoints(referrer.tier as Tier)
      await admin
        .from('users')
        .update({
          points_balance: referrer.points_balance + referralPts,
          points_lifetime_earned: referrer.points_lifetime_earned + referralPts,
        })
        .eq('id', referrer.id)
      await admin.from('users').update({ referral_bonus_claimed: true }).eq('id', authUser.id)
      await admin.from('referrals').update({ bonus_awarded: true }).eq('referred_id', authUser.id)
    }
  }

  // 10. Everything the success screen needs.
  return NextResponse.json({
    ok: true,
    points: pts.total,
    bonus,
    newSessions,
    newStreak,
    newTier,
    verified,
    verificationMethod,
  })
}
