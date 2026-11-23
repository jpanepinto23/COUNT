// Shared bits for "sign up with Strava".
//
// Strava does not share an athlete's email, so accounts created from Strava
// get a placeholder address on this domain. It is never emailed. The user is
// asked for a real address before their first redemption.
export const STRAVA_STATE_COOKIE = 'count_strava_state'
export const STRAVA_PLACEHOLDER_DOMAIN = 'strava.countfitness.app'

export function stravaPlaceholderEmail(athleteId: number | string): string {
  return `athlete-${athleteId}@${STRAVA_PLACEHOLDER_DOMAIN}`
}

// Garmin does not share email either; same treatment, its own subdomain.
export const GARMIN_PLACEHOLDER_DOMAIN = 'garmin.countfitness.app'

export function garminPlaceholderEmail(garminUserId: string): string {
  return `garmin-${garminUserId.toLowerCase().replace(/[^a-z0-9-]/g, '')}@${GARMIN_PLACEHOLDER_DOMAIN}`
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return true
  const e = email.toLowerCase()
  return e.endsWith('@' + STRAVA_PLACEHOLDER_DOMAIN) || e.endsWith('@' + GARMIN_PLACEHOLDER_DOMAIN)
}
