import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
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

  const { workout_id, workout_date } = await request.json()
  if (!workout_id || !workout_date) {
    return NextResponse.json({ error: 'Missing workout_id or workout_date' }, { status: 400 })
  }

  // Get Strava connection for this user
  const { data: conn } = await supabase
    .from('strava_connections')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!conn) {
    return NextResponse.json({ verified: false, reason: 'No Strava connection' })
  }

  // Refresh token if expired
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
      return NextResponse.json({ verified: false, reason: 'Token refresh failed' })
    }
    const refreshed = await refreshRes.json()
    accessToken = refreshed.access_token
    await supabase.from('strava_connections').update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      token_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    }).eq('user_id', user.id)
  }

  // Fetch Strava activities for the workout day
  const date = new Date(workout_date)
  const after = Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000
  )
  const before = after + 86400

  const activitiesRes = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=10`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!activitiesRes.ok) {
    return NextResponse.json({ verified: false, reason: 'Failed to fetch Strava activities' })
  }

  const activities = await activitiesRes.json()

  if (activities.length > 0) {
    await supabase
      .from('workouts')
      .update({ verification_method: 'strava' })
      .eq('id', workout_id)
      .eq('user_id', user.id)
    return NextResponse.json({ verified: true, activity_count: activities.length })
  }

  return NextResponse.json({ verified: false, reason: 'No Strava activities found on that day' })
}
