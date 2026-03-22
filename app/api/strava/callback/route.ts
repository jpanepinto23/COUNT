import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://count-fitness-app.vercel.app'

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/profile?connect=strava&status=error&msg=Authorization+denied`)
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/profile?connect=strava&status=error&msg=Token+exchange+failed`)
  }

  const { access_token, refresh_token, expires_at, athlete } = await tokenRes.json()

  // Get user from session cookie
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${appUrl}/profile?connect=strava&status=error&msg=Not+signed+in`)
  }

  // Store Strava tokens
  await supabase.from('strava_connections').upsert({
    user_id: user.id,
    athlete_id: athlete.id,
    access_token,
    refresh_token,
    token_expires_at: new Date(expires_at * 1000).toISOString(),
  }, { onConflict: 'user_id' })

  // Mark connected in connected_devices
  await supabase.from('connected_devices').upsert({
    user_id: user.id,
    type: 'strava',
    status: 'active',
  }, { onConflict: 'user_id,type' })

  return NextResponse.redirect(`${appUrl}/profile?connect=strava&status=success`)
}
