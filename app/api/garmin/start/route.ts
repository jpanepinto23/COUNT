import { NextRequest, NextResponse } from 'next/server'
import { GARMIN_STATE_COOKIE, appUrl, authorizeUrl, garminConfigured, makePkce } from '@/lib/garmin'

// Public entry point for "Continue with Garmin" on the signup and login pages.
// No COUNT session is needed: the callback links Garmin to the signed-in
// account if there is one, otherwise it finds or creates the COUNT account
// that owns this Garmin user and signs them in. PKCE verifier + state (+ an
// optional referral code) ride along in an httpOnly cookie.
export async function GET(request: NextRequest) {
  const base = appUrl()
  if (!garminConfigured()) {
    return NextResponse.redirect(`${base}/auth/signup?garmin_error=config`)
  }

  const ref = (new URL(request.url).searchParams.get('ref') ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)

  const { verifier, challenge, state } = makePkce()
  const response = NextResponse.redirect(authorizeUrl(challenge, state))
  // Format: state.verifier.userId.ref — userId is empty for the signed-out flow.
  response.cookies.set(GARMIN_STATE_COOKIE, `${state}.${verifier}..${ref}`, {
    httpOnly: true,
    secure: base.startsWith('https'),
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return response
}
