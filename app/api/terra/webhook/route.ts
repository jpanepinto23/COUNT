import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body)
  const expected = hmac.digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const bodyText = await req.text()
  const signature = req.headers.get('terra-signature')

  if (process.env.TERRA_SIGNING_SECRET) {
    const valid = verifySignature(bodyText, signature, process.env.TERRA_SIGNING_SECRET)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: any
  try { payload = JSON.parse(bodyText) } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, user, data } = payload

  if (type !== 'activity') {
    return NextResponse.json({ received: true })
  }

  if (!user?.reference_id || !data?.length) {
    return NextResponse.json({ received: true })
  }

  const supabase = createServiceClient()
  const userId = user.reference_id
  const terraUserId = user.user_id
  const provider = user.provider ?? 'UNKNOWN'

  for (const activity of data) {
    const metadata = activity.metadata ?? {}
    const startTime = metadata.start_time
    const endTime = metadata.end_time
    const durationSeconds = activity.active_durations_data?.activity_seconds ?? null
    const calories = activity.calories_data?.total_burned_calories ?? null
    const heartRateAvg = activity.heart_rate_data?.summary?.avg_hr_bpm ?? null
    const activityId = metadata.id ?? (terraUserId + '-' + startTime)

    if (!startTime) continue

    await supabase
      .from('terra_activities')
      .upsert(
        {
          user_id: userId,
          terra_user_id: terraUserId,
          activity_id: activityId,
          provider,
          activity_type: metadata.name ?? metadata.type ?? 'Workout',
          start_time: startTime,
          end_time: endTime,
          duration_seconds: durationSeconds,
          calories,
          heart_rate_avg: heartRateAvg,
          raw_data: activity,
        },
        { onConflict: 'activity_id' }
      )

    // Auto-verify today's unverified workout if this activity is from today
    const activityDate = new Date(startTime)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    if (activityDate >= todayStart && activityDate <= todayEnd) {
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, total_points_earned, base_points, multiplier_applied')
        .eq('user_id', userId)
        .eq('verified', false)
        .gte('logged_at', todayStart.toISOString())
        .lte('logged_at', todayEnd.toISOString())
        .order('logged_at', { ascending: false })
        .limit(1)

      if (workouts && workouts.length > 0) {
        const workout = workouts[0]
        const deviceType = getDeviceType(provider)
        const verifiedTotal = Math.round(workout.base_points * workout.multiplier_applied * 1.25)
        const pointsDiff = verifiedTotal - workout.total_points_earned

        await supabase
          .from('workouts')
          .update({
            verified: true,
            verification_method: deviceType,
            heart_rate_avg: heartRateAvg,
            calories,
            total_points_earned: verifiedTotal,
          })
          .eq('id', workout.id)

        if (pointsDiff > 0) {
          await supabase.rpc('increment_user_points', {
            p_user_id: userId,
            p_points: pointsDiff,
          })
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}

function getDeviceType(provider: string): string {
  const map: Record<string, string> = {
    APPLE: 'apple_health',
    GARMIN: 'garmin',
    FITBIT: 'fitbit',
    GOOGLE: 'google_fit',
  }
  return map[provider.toUpperCase()] ?? provider.toLowerCase()
}

