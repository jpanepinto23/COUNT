import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { garminPlaceholderEmail } from '@/lib/strava-auth'
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
  const [cookieState, verifier, cookieUser, cookieRef, cookieGym] = (cookieStore.get(GARMIN_STATE_COOKIE)?.value ?? '').split('.')
  // "new" = signed-out sign up / sign in from /api/garmin/start
  const signupFlow = cookieUser === 'new'
  let userId: string | null = signupFlow ? null : cookieUser

  // Session cookies minted for the signed-out flow, applied to the redirect.
  const pendingCookies: { name: string; value: string; options?: Record<string, unknown> }[] = []

  function finish(path: string) {
    const res = NextResponse.redirect(`${appUrl()}${path}`)
    pendingCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    res.cookies.delete(GARMIN_STATE_COOKIE)
    return res
  }
  const fail = (reason: string) =>
    finish(signupFlow ? `/auth/signup?garmin_error=${reason}` : `/profile?error=garmin_${reason}`)

  if (oauthError || !code) return fail('denied')
  if (!state || !cookieState || !verifier || !cookieUser || state !== cookieState) return fail('state')

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

  // ---- Signed-out flow: find the COUNT account for this Garmin user, or create one ----
  let loginEmail: string | null = null
  let isNew = false
  if (signupFlow) {
    const { data: existing } = await supabase
      .from('garmin_connections')
      .select('user_id')
      .eq('garmin_user_id', garminUserId)
      .maybeSingle()
    if (existing?.user_id) {
      userId = existing.user_id
      const { data: found } = await supabase.auth.admin.getUserById(existing.user_id)
      loginEmail = found?.user?.email ?? null
    } else {
      const placeholder = garminPlaceholderEmail(garminUserId)
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: placeholder,
        email_confirm: true,
        user_metadata: { name: 'Athlete', referred_by_code: cookieRef || null, signup_source: 'garmin' },
      })
      if (created?.user) {
        userId = created.user.id
        loginEmail = placeholder
        isNew = true
      } else {
        // Account from an earlier attempt that never stored the connection. Reuse it.
        const { data: prior } = await supabase.from('users').select('id').eq('email', placeholder).maybeSingle()
        if (prior?.id) {
          userId = prior.id
          loginEmail = placeholder
        } else {
          console.error('[garmin/callback] createUser failed', createError?.message)
        }
      }
    }
    if (!userId || !loginEmail) return fail('signup')
  }
  if (!userId) return fail('state')

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

  if (!signupFlow) return finish('/profile?connected=true')

  if (cookieGym) {
    const { data: gym } = await supabase.from('gyms').select('id').eq('slug', cookieGym).maybeSingle()
    if (gym) await supabase.from('users').update({ gym_id: gym.id }).eq('id', userId).is('gym_id', null)
  }
  if (isNew) {
    await supabase.from('funnel_events').insert({ user_id: userId, event: 'signup_garmin' })
  }

  // Mint a one-time login token and redeem it here so the session cookies land
  // on the redirect response (same approach as Strava sign up). No email is sent.
  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({ type: 'magiclink', email: loginEmail! })
  const tokenHash = link?.properties?.hashed_token
  if (linkError || !tokenHash) {
    console.error('[garmin/callback] generateLink failed', linkError?.message)
    return fail('signin')
  }
  const sessionClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { pendingCookies.push(...cookiesToSet) },
      },
    }
  )
  const { error: verifyError } = await sessionClient.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash })
  if (verifyError) {
    console.error('[garmin/callback] verifyOtp failed', verifyError.message)
    return fail('signin')
  }
  return finish(isNew ? '/home?welcome=garmin' : '/home')
}
