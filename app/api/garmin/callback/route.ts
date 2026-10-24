import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  GARMIN_STATE_COOKIE,
  appUrl,
  exchangeCode,
  fetchGarminUserId,
  requestActivityBackfill,
} from '@/lib/garmin'

// Garmin sends the user back here after the consent screen.
// Query: code, state  (or error)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const cookieStore = await cookies()
  const [cookieState, verifier, userId] = (cookieStore.get(GARMIN_STATE_COOKIE)?.value ?? '').split('.')

  function finish(path: string) {
    const res = NextResponse.redirect(`${appUrl()}${path}`)
    res.cookies.delete(GARMIN_STATE_COOKIE)
    return res
  }
  const fail = (reason: string) => finish(`/profile?error=garmin_${reason}`)

  if (oauthError || !code) return fail('denied')
  if (!state || !cookieState || !verifier || !userId || state !== cookieState) return fail('state')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let tokens
  try {
    tokens = await exchangeCode(code, verifier)
  } catch (err) {
    console.error('[garmin/callback] token exchange failed', err instanceof Error ? err.message : err)
    return fail('token')
  }

  let garminUserId: string
  try {
    garminUserId = await fetchGarminUserId(tokens.access_token)
  } catch (err) {
    console.error('[garmin/callback] user id lookup failed', err instanceof Error ? err.message : err)
    return fail('userid')
  }

  // One Garmin account ↔ one COUNT account. If this Garmin user is already
  // linked to a different COUNT user, move it (the person re-connected from a
  // new account) rather than failing.
  await supabase.from('garmin_connections').delete().eq('garmin_user_id', garminUserId).neq('user_id', userId)

  const { error: upsertErr } = await supabase.from('garmin_connections').upsert(
    {
      user_id: userId,
      garmin_user_id: garminUserId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.token_expires_at,
      refresh_expires_at: tokens.refresh_expires_at,
      connected_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (upsertErr) {
    console.error('[garmin/callback] save failed', upsertErr.message)
    return fail('save')
  }

  await supabase.from('connected_devices').upsert(
    { user_id: userId, type: 'garmin', provider: 'GARMIN', status: 'active', connected_at: new Date().toISOString() },
    { onConflict: 'user_id,type' }
  )

  // Backfill the last 2 days so a workout done earlier today still gets credited.
  // Garmin pushes the results to /api/garmin/webhooks asynchronously.
  const end = Math.floor(Date.now() / 1000)
  requestActivityBackfill(tokens.access_token, end - 2 * 86400, end).catch(() => {})

  return finish('/profile?connected=true')
}
