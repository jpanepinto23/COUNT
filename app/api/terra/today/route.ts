import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapWorkoutType(name: string): { type: string; customName: string | null } {
  const n = (name || '').toLowerCase()
  if (/hiit|crossfit|interval/.test(n)) return { type: 'hiit', customName: null }
  if (/strength|weight|gym|lifting/.test(n)) return { type: 'full_body', customName: null }
  return { type: 'cardio', customName: null }
}

// On-demand pull of today's activity from a Terra-connected wearable (Garmin, etc.).
export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find any Terra-linked device for this user (Garmin, etc.).
  const { data: dev } = await supabase
    .from('connected_devices')
    .select('terra_user_id, type')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .not('terra_user_id', 'is', null)
    .limit(1)
    .maybeSingle()

  if (!dev?.terra_user_id) {
    return NextResponse.json({ found: false, connected: false })
  }

  const devId = process.env.TERRA_DEV_ID
  const apiKey = process.env.TERRA_API_KEY
  if (!devId || !apiKey) {
    return NextResponse.json({ found: false, connected: true, reason: 'Terra not configured' })
  }

  // Look back a rolling ~36h window (robust to the user's timezone vs the
  // server's UTC clock, and to Garmin's sync lag) and take the most recent
  // workout. The one-per-day guard lives in commitWorkout on the client.
  const now = new Date()
  const start = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString()
  const end = now.toISOString()

  const res = await fetch(
    `https://api.tryterra.co/v2/activity?user_id=${dev.terra_user_id}` +
      `&start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}&to_webhook=false`,
    { headers: { 'dev-id': devId, 'x-api-key': apiKey } }
  )
  if (!res.ok) {
    return NextResponse.json({ found: false, connected: true, reason: 'Failed to fetch activity' })
  }

  const json: any = await res.json().catch(() => ({}))
  const activities: any[] = Array.isArray(json?.data) ? json.data : []
  // Most recent by start_time (Terra doesn't guarantee ordering).
  activities.sort((a, b) => {
    const ta = new Date(a?.metadata?.start_time ?? 0).getTime()
    const tb = new Date(b?.metadata?.start_time ?? 0).getTime()
    return ta - tb
  })
  const activity = activities[activities.length - 1]
  if (!activity) {
    return NextResponse.json({ found: false, connected: true, reason: 'No recent activity found' })
  }

  const metadata = activity.metadata ?? {}
  const name: string = metadata.name ?? 'Workout'
  const { type, customName } = mapWorkoutType(name)
  const durationSeconds = activity.active_durations_data?.activity_seconds ?? null
  const hr = activity.heart_rate_data?.summary?.avg_hr_bpm ?? null
  const cals = activity.calories_data?.total_burned_calories ?? null

  return NextResponse.json({
    found: true,
    connected: true,
    activity: {
      type,
      custom_name: customName,
      name,
      duration_minutes: durationSeconds ? Math.max(1, Math.round(durationSeconds / 60)) : 60,
      heart_rate_avg: hr != null ? Math.round(hr) : null,
      calories: cals != null ? Math.round(cals) : null,
    },
  })
}
