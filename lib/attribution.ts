// First-touch attribution.
//
// On a visitor's first landing we record where they came from (utm_source,
// else the external referrer host, else "direct") in localStorage. The UTM is
// also kept in sessionStorage so every pageview in that session carries it,
// not just the landing page. When the visitor later has an account, the
// first touch is written once to users.signup_source, which covers email,
// Strava and Garmin signups alike.

const FIRST_TOUCH_KEY = 'count_first_touch'
const SAVED_KEY = 'count_first_touch_saved'
const SESSION_UTM_KEY = 'count_session_utm'
const OWN_HOSTS = ['countfitness.app', 'www.countfitness.app', 'localhost']

export type FirstTouch = {
  source: string
  medium: string | null
  campaign: string | null
  landing: string
  at: string
}

function externalReferrerHost(): string | null {
  try {
    if (!document.referrer) return null
    const host = new URL(document.referrer).hostname
    return OWN_HOSTS.includes(host) ? null : host
  } catch {
    return null
  }
}

/** Call on every page load. Returns the utm_source for this session, if any. */
export function captureAttribution(): string | null {
  try {
    const params = new URLSearchParams(window.location.search)
    const utm = params.get('utm_source')
    if (utm) sessionStorage.setItem(SESSION_UTM_KEY, utm)

    if (!localStorage.getItem(FIRST_TOUCH_KEY)) {
      const touch: FirstTouch = {
        source: utm || externalReferrerHost() || 'direct',
        medium: params.get('utm_medium'),
        campaign: params.get('utm_campaign'),
        landing: window.location.pathname,
        at: new Date().toISOString(),
      }
      localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(touch))
    }

    return utm || sessionStorage.getItem(SESSION_UTM_KEY)
  } catch {
    return null
  }
}

/** Writes the first touch to the user's row once. Never overwrites an existing value. */
export async function saveSignupSource(
  supabase: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  userId: string,
  userCreatedAt: string | null | undefined,
) {
  try {
    if (localStorage.getItem(SAVED_KEY) === userId) return
    const raw = localStorage.getItem(FIRST_TOUCH_KEY)
    if (!raw) return
    const touch = JSON.parse(raw) as FirstTouch
    // Only attribute accounts created after this device's first touch, so
    // existing users logging in on a new device are not mislabeled.
    if (!userCreatedAt || new Date(userCreatedAt) < new Date(touch.at)) {
      localStorage.setItem(SAVED_KEY, userId)
      return
    }
    const { error } = await supabase
      .from('users')
      .update({
        signup_source: touch.source,
        signup_medium: touch.medium,
        signup_campaign: touch.campaign,
        signup_landing: touch.landing,
      })
      .eq('id', userId)
      .is('signup_source', null)
    if (!error) localStorage.setItem(SAVED_KEY, userId)
  } catch {
    // attribution must never break the app
  }
}
