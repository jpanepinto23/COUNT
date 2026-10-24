import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { creditActivity } from '@/lib/auto-verify'

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

    // One credited session per day; shared logic with the Garmin receiver.
    await creditActivity(supabase, userId, {
      startTime,
      durationSeconds,
      heartRateAvg,
      calories,
      workoutType: mapWorkoutType(activityName),
      deviceType,
      activityName,
    })
  }

  return NextResponse.json({ received: true })
}
