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

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !email || email.toLowerCase().endsWith('@' + STRAVA_PLACEHOLDER_DOMAIN)
}
