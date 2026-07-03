// Shared Strava verification logic — used by /api/strava/today (UI preview)
// and /api/workouts/log (authoritative server-side verification).
import type { SupabaseClient } from '@supabase/supabase-js'

export function mapSportType(sportType: string): { type: string; customName: string | null } {
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
  return { type: 'custom', customName: sportType.replace(/([a-z])([A-Z])/g, '$1 $2') }
}

export type StravaSummary = {
  manual?: boolean
  sport_type?: string
  type?: string
  name?: string
  moving_time?: number
  distance?: number
  has_heartrate?: boolean
  average_heartrate?: number
}

export function isSensorBacked(a: StravaSummary): boolean {
  if (a.manual) return false
  return Boolean(a.has_heartrate) || (a.distance ?? 0) > 0
}

export type StravaTodayResult =
  | { found: false; connected: boolean; reason?: string }
  | {
      found: true
      connected: true
      activity: {
        type: string
        custom_name: string | null
        name: string | null
        duration_minutes: number
        heart_rate_avg: number | null
      }
    }

export async function getTodaysStravaActivity(
  supabase: SupabaseClient,
  userId: string
): Promise<StravaTodayResult> {
  const { data: conn } = await supabase
    .from('strava_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .single()

  if (!conn) return { found: false, connected: false }

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
    if (!refreshRes.ok) return { found: false, connected: true, reason: 'Token refresh failed' }
    const refreshed = await refreshRes.json()
    accessToken = refreshed.access_token
    await supabase.from('strava_connections').update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      token_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    }).eq('user_id', userId)
  }

  const now = new Date()
  const after = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000)
  const before = after + 86400

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=30`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return { found: false, connected: true, reason: 'Failed to fetch activities' }

  const activities: StravaSummary[] = await res.json()
  const activity = Array.isArray(activities) ? activities.find(isSensorBacked) : undefined

  if (!activity) {
    const hadManualOnly = Array.isArray(activities) && activities.length > 0
    return {
      found: false,
      connected: true,
      reason: hadManualOnly ? 'Only manual entries found today' : 'No Strava activity today',
    }
  }

  const { type, customName } = mapSportType(activity.sport_type ?? activity.type ?? 'Workout')
  return {
    found: true,
    connected: true,
    activity: {
      type,
      custom_name: customName,
      name: activity.name ?? null,
      duration_minutes: activity.moving_time ? Math.max(1, Math.round(activity.moving_time / 60)) : 60,
      heart_rate_avg: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
    },
  }
}
