import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Maps a Strava sport_type to a COUNT workout type.
function mapSportType(sportType: string): { type: string; customName: string | null } {
  const cardio = new Set([
    'Run', 'TrailRun', 'VirtualRun', 'Ride', 'VirtualRide', 'MountainBikeRide',
    'GravelRide', 'EBikeRide', 'Swim', 'Walk', 'Hike', 'Rowing', 'Elliptical',
    'StairStepper', 'Canoeing', 'Kayaking', 'Velomobile',
  ])
  const hiit = new Set(['Crossfit', 'HighIntensityIntervalTraining', 'HIIT'])
  const strength = new Set(['WeightTraining', 'Workout'])
  if (cardio.has(sportType)) return { type: 'cardio', customName: null }
  if (hiit.has(sportType)) return { type: 'hiit', customName: null }
  if (strength.has(sportType)) return { type: 'full_body', customName: null }
  // Yoga, Pilates, Soccer, Tennis, etc. -> custom, carry the Strava label through
  return { type: 'custom', customName: sportType.replace(/([a-z])([A-Z])/g, '$1 $2') }
}

// A Strava activity only "counts" as a real, sensor-backed session — never a
// manually keyed-in entry, which is as fakeable as a manual COUNT log.
type StravaSummary = {
  manual?: boolean
  sport_type?: string
  type?: string
  name?: string
  moving_time?: number
  distance?: number
  has_heartrate?: boolean
  average_heartrate?: number
}

function isSensorBacked(a: StravaSummary): boolean {
  if (a.manual) return false
  return Boolean(a.has_heartrate) || (a.distance ?? 0) > 0
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: conn } = await supabase
    .from('strava_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', user.id)
    .single()

  if (!conn) {
    return NextResponse.json({ found: false, connected: false })
  }

  // Refresh the access token if it has expired (Strava tokens last ~6h).
  let accessToken = conn.access_token
  if (new Date(conn.token_expires_at) <= new Date()) {
    const refreshRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: conn.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    if (!refreshRes.ok) {
      return NextResponse.json({ found: false, connected: true, reason: 'Token refresh failed' })
    }
    const refreshed = await refreshRes.json()
    accessToken = refreshed.access_token
    await supabase.from('strava_connections').update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      token_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    }).eq('user_id', user.id)
  }

  // Today's activities (local midnight -> now).
  const now = new Date()
  const after = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000)
  const before = after + 86400

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=30`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) {
    return NextResponse.json({ found: false, connected: true, reason: 'Failed to fetch activities' })
  }

  const activities: StravaSummary[] = await res.json()
  // Most recent sensor-backed activity today.
  const activity = Array.isArray(activities)
    ? activities.find(isSensorBacked)
    : undefined

  if (!activity) {
    const hadManualOnly = Array.isArray(activities) && activities.length > 0
    return NextResponse.json({
      found: false,
      connected: true,
      reason: hadManualOnly ? 'Only manual entries found today' : 'No Strava activity today',
    })
  }

  const { type, customName } = mapSportType(activity.sport_type ?? activity.type ?? 'Workout')

  return NextResponse.json({
    found: true,
    connected: true,
    activity: {
      type,
      custom_name: customName,
      name: activity.name ?? null,
      duration_minutes: activity.moving_time ? Math.max(1, Math.round(activity.moving_time / 60)) : 60,
      heart_rate_avg: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
    },
  })
}
