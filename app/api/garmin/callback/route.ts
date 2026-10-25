import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  GARMIN_STATE_COOKIE,
  appUrl,
  exchangeCode,
  fetchGarminUserId,
  requestActivityBackfill,
  type GarminTokens,
} from '@/lib/garmin'
import { garminPlaceholderEmail } from '@/lib/strava-auth'

// Garmin sends the user back here after the consent screen, in two situations:
//   1. Already signed in to COUNT (Connect page / Profile, or the signup page
//      while a session exists): link Garmin to the current account.
//   2. Not signed in ("Continue with Garmin" on signup / login): find the COUNT
//      account that owns this Garmin user, or create one, then sign them in.
// Query: code, state  (or error)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')
  const base = appUrl()

  const cookieStore = await cookies()
  // Format: state.verifier.userId.ref (userId/ref may be empty)
  const [cookieState, verifier, cookieUserId = '', cookieRef = ''] =
    (cookieStore.get(GARMIN_STATE_COOKIE)?.value ?? '').split('.')

  // SSR client so we can see an existing session and, in the signed-out flow,
  // set the new session cookies on the redirect response.
  const pendingCookies: { name: string; value: string; options?: Record<string, unknown> }[] = []
  const ssr = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { pendingCookies.push(...cookiesToSet) },
      },
    }
  )
  const { data: { user: sessionUser } } = await ssr.auth.getUser()

  // Who are we linking to? A session wins; otherwise the user id the Connect
  // button parked in the cookie; otherwise this is the signed-out flow.
  const linkUserId: string | null = sessionUser?.id ?? (cookieUserId || null)

  function finish(path: string) {
    const res = NextResponse.redirect(`${base}${path}`)
    pendingCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    res.cookies.delete(GARMIN_STATE_COOKIE)
    return res
  }
  const fail = (reason: string) =>
    linkUserId
      ? finish(`/profile?error=garmin_${reason}`)
      : finish(`/auth/signup?garmin_error=${reason}`)

  if (oauthError || !code) return fail('denied')
  if (!state || !cookieState || !verifier || state !== cookieState) return fail('state')

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let tokens: GarminTokens
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

  const connection = {
    garmin_user_id: garminUserId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: tokens.token_expires_at,
    refresh_expires_at: tokens.refresh_expires_at,
    connected_at: new Date().toISOString(),
  }

  async function saveConnection(userId: string): Promise<boolean> {
    // One Garmin account ↔ one COUNT account. If this Garmin user was linked to
    // a different COUNT user, move it rather than failing.
    await admin.from('garmin_connections').delete().eq('garmin_user_id', garminUserId).neq('user_id', userId)
    const { error } = await admin.from('garmin_connections').upsert({ user_id: userId, ...connection }, { onConflict: 'user_id' })
    if (error) {
      console.error('[garmin/callback] save failed', error.message)
      return false
    }
    await admin.from('connected_devices').upsert(
      { user_id: userId, type: 'garmin', provider: 'GARMIN', status: 'active', connected_at: new Date().toISOString() },
      { onConflict: 'user_id,type' }
    )
    // Best-effort 2-day backfill (no-op on Starter tier, which has no historical data).
    const end = Math.floor(Date.now() / 1000)
    requestActivityBackfill(tokens.access_token, end - 2 * 86400, end).catch(() => {})
    return true
  }

  // ---- 1. Link to an existing, identified account ----
  if (linkUserId) {
    const ok = await saveConnection(linkUserId)
    return ok ? finish('/profile?connected=true') : fail('save')
  }

  // ---- 2. Signed out: sign in or create the account from Garmin ----
  let userId: string | null = null
  let loginEmail: string | null = null
  let isNew = false

  const { data: existing } = await admin
    .from('garmin_connections')
    .select('user_id')
    .eq('garmin_user_id', garminUserId)
    .maybeSingle()

  if (existing?.user_id) {
    userId = existing.user_id
    const { data: found } = await admin.auth.admin.getUserById(existing.user_id)
    loginEmail = found?.user?.email ?? null
  } else {
    const placeholder = garminPlaceholderEmail(garminUserId)
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: placeholder,
      email_confirm: true,
      user_metadata: {
        name: 'Athlete',
        referred_by_code: cookieRef || null,
        signup_source: 'garmin',
      },
    })
    if (created?.user) {
      userId = created.user.id
      loginEmail = placeholder
      isNew = true
    } else {
      // Account exists from an earlier attempt that never stored the
      // connection (or the user disconnected Garmin). Reuse it.
      const { data: prior } = await admin.from('users').select('id').eq('email', placeholder).maybeSingle()
      if (prior?.id) {
        const { data: found } = await admin.auth.admin.getUserById(prior.id)
        userId = prior.id
        loginEmail = found?.user?.email ?? null
      } else {
        console.error('[garmin/callback] createUser failed', createError?.message)
      }
    }
  }

  if (!userId || !loginEmail) return fail('failed')

  const saved = await saveConnection(userId)
  if (!saved) return fail('save')
  if (isNew) {
    await admin.from('funnel_events').insert({ user_id: userId, event: 'signup_garmin' })
  }

  // Mint a one-time login token for this user and redeem it right here so the
  // session cookies land on the redirect response. No email is sent.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: loginEmail,
  })
  const tokenHash = link?.properties?.hashed_token
  if (linkError || !tokenHash) {
    console.error('[garmin/callback] generateLink failed', linkError?.message)
    return fail('failed')
  }
  const { error: verifyError } = await ssr.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash })
  if (verifyError) {
    console.error('[garmin/callback] verifyOtp failed', verifyError.message)
    return fail('failed')
  }

  return finish(isNew ? '/home?welcome=garmin' : '/home')
}
