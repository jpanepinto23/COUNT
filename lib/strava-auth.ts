// Shared bits for "sign up with Strava" / "continue with Garmin".
//
// Strava and Garmin do not share the user's email, so accounts created from Strava
// get a placeholder address on this domain. It is never emailed. The user is
// asked for a real address before their first redemption.
export const STRAVA_STATE_COOKIE = 'count_strava_state'
export const STRAVA_PLACEHOLDER_DOMAIN = 'strava.countfitness.app'

export function stravaPlaceholderEmail(athleteId: number | string): string {
  return `athlete-${athleteId}@${STRAVA_PLACEHOLDER_DOMAIN}`
}

export const GARMIN_PLACEHOLDER_DOMAIN = 'garmin.countfitness.app'

export function garminPlaceholderEmail(garminUserId: string): string {
  return `garmin-${garminUserId.toLowerCase()}@${GARMIN_PLACEHOLDER_DOMAIN}`
}

// True for any provider-created account that has not given us a real email yet.
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return true
  const e = email.toLowerCase()
  return e.endsWith('@' + STRAVA_PLACEHOLDER_DOMAIN) || e.endsWith('@' + GARMIN_PLACEHOLDER_DOMAIN)
}
