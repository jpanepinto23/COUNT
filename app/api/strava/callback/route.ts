import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { STRAVA_STATE_COOKIE, stravaPlaceholderEmail } from '@/lib/strava-auth'

// Strava sends the athlete back here in two situations:
//   1. Already signed in to COUNT (Connect page / Profile): link Strava to
//      the current account.
//   2. Not signed in (the "Connect Strava" button on signup / login): find
//      the COUNT account that owns this Strava athlete, or create one, then
//      sign them in.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')
  const state = searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://countfitness.app'

  const cookieStore = await cookies()
  const pendingCookies: { name: string; value: string; options?: Record<string, unknown> }[] = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet)
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  function finish(path: string) {
    const response = NextResponse.redirect(`${appUrl}${path}`)
    pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    response.cookies.delete(STRAVA_STATE_COOKIE)
    return response
  }
  function fail(reason: 'denied' | 'limit' | 'failed' | 'state', legacyMsg: string) {
    return user
      ? finish(`/profile?connect=strava&status=error&msg=${encodeURIComponent(legacyMsg)}`)
      : finish(`/auth/signup?strava_error=${reason}`)
  }

  if (oauthError || !code) return fail('denied', 'Authorization denied')

  // Signed-out flow must come from our own /api/strava/start (state cookie).
  const [cookieNonce, cookieRef] = (cookieStore.get(STRAVA_STATE_COOKIE)?.value ?? '').split('.')
  if (!user && (!state || !cookieNonce || state !== cookieNonce)) {
    return fail('state', 'Session expired')
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
    // Strava returns 403 when the app is at its connected-athlete cap.
    const body = await tokenRes.text().catch(() => '')
    const atCap = tokenRes.status === 403 || /limit|exceed|capacity/i.test(body)
    console.error('[strava/callback] token exchange failed', tokenRes.status, body.slice(0, 300))
    return fail(atCap ? 'limit' : 'failed', 'Token exchange failed')
  }

  const { access_token, refresh_token, expires_at, athlete } = await tokenRes.json()
  if (!athlete?.id) return fail('failed', 'Token exchange failed')

  const connection = {
    athlete_id: athlete.id,
    access_token,
    refresh_token,
    token_expires_at: new Date(expires_at * 1000).toISOString(),
  }

  // ---- 1. Already signed in: link Strava to this account ----
  if (user) {
    await supabase.from('strava_connections').upsert({ user_id: user.id, ...connection }, { onConflict: 'user_id' })
    await supabase.from('connected_devices').upsert(
      { user_id: user.id, type: 'strava', status: 'active' },
      { onConflict: 'user_id,type' }
    )
    return finish('/profile?connect=strava&status=success')
  }

  // ---- 2. Signed out: sign in or create the account from Strava ----
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[strava/callback] SUPABASE_SERVICE_ROLE_KEY missing')
    return fail('failed', 'Not configured')
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let userId: string | null = null
  let loginEmail: string | null = null
  let isNew = false

  const { data: existing } = await admin
    .from('strava_connections')
    .select('user_id')
    .eq('athlete_id', athlete.id)
    .order('connected_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing?.user_id) {
    userId = existing.user_id
    const { data: found } = await admin.auth.admin.getUserById(existing.user_id)
    loginEmail = found?.user?.email ?? null
  } else {
    const placeholder = stravaPlaceholderEmail(athlete.id)
    const firstName = typeof athlete.firstname === 'string' ? athlete.firstname.trim() : ''
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: placeholder,
      email_confirm: true,
      user_metadata: {
        name: firstName || 'Athlete',
        referred_by_code: cookieRef || null,
        signup_source: 'strava',
      },
    })
    if (created?.user) {
      userId = created.user.id
      loginEmail = placeholder
      isNew = true
    } else {
      // Account exists from an earlier attempt that never stored the
      // connection (or the athlete disconnected Strava). Reuse it.
      const { data: prior } = await admin.from('users').select('id').eq('email', placeholder).maybeSingle()
      if (prior?.id) {
        const { data: found } = await admin.auth.admin.getUserById(prior.id)
        userId = prior.id
        loginEmail = found?.user?.email ?? null
      } else {
        console.error('[strava/callback] createUser failed', createError?.message)
      }
    }
  }

  if (!userId || !loginEmail) return fail('failed', 'Signup failed')

  await admin.from('strava_connections').upsert({ user_id: userId, ...connection }, { onConflict: 'user_id' })
  await admin.from('connected_devices').upsert(
    { user_id: userId, type: 'strava', status: 'active' },
    { onConflict: 'user_id,type' }
  )
  if (isNew) {
    await admin.from('funnel_events').insert({ user_id: userId, event: 'signup_strava' })
  }

  // Mint a one-time login token for this user and redeem it right here so the
  // session cookies land on the redirect response. No email is sent.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: loginEmail,
  })
  const tokenHash = link?.properties?.hashed_token
  if (linkError || !tokenHash) {
    console.error('[strava/callback] generateLink failed', linkError?.message)
    return fail('failed', 'Sign-in failed')
  }
  const { error: verifyError } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash })
  if (verifyError) {
    console.error('[strava/callback] verifyOtp failed', verifyError.message)
    return fail('failed', 'Sign-in failed')
  }

  return finish(isNew ? '/home?welcome=strava' : '/home')
}
