// Server-side OAuth state, shared by the Strava and Garmin flows.
//
// On iOS, a provider's authorize URL can be a universal link that opens the
// provider's own app (Strava, Garmin Connect). The provider then sends the
// user back to our callback in that app's in-app browser, which has none of
// our cookies, so cookie-only state checks fail. We also park the state here,
// keyed by the random state value, so the callback works from any browser.
import { createClient } from '@supabase/supabase-js'

export type PendingOAuthState = { verifier: string; userId: string; ref: string; gym: string }

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function saveOAuthState(provider: string, state: string, s: PendingOAuthState): Promise<void> {
  const { error } = await serviceClient().from('oauth_states').insert({
    state, provider, verifier: s.verifier || '-', user_id: s.userId, ref: s.ref || null, gym: s.gym || null,
  })
  if (error) console.error(`[${provider}] save state failed`, error.message)
}

// One-time read: returns the row (if under 15 min old) and deletes it.
export async function takeOAuthState(provider: string, state: string): Promise<PendingOAuthState | null> {
  const { data } = await serviceClient()
    .from('oauth_states')
    .delete()
    .eq('state', state)
    .eq('provider', provider)
    .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .select('verifier, user_id, ref, gym')
    .maybeSingle()
  if (!data) return null
  return { verifier: data.verifier, userId: data.user_id, ref: data.ref ?? '', gym: data.gym ?? '' }
}
