import { NextRequest, NextResponse } from 'next/server'
import { GARMIN_STATE_COOKIE, appUrl, authorizeUrl, garminConfigured, makePkce } from '@/lib/garmin'

// Public entry point for "Sign up / Continue with Garmin" on the signup and
// login pages. No COUNT session is needed: the callback finds the COUNT
// account linked to this Garmin user, or creates one, then signs them in.
// The cookie carries user id "new" so the callback knows it is this flow.
export async function GET(request: NextRequest) {
  if (!garminConfigured()) {
    return NextResponse.redirect(`${appUrl()}/auth/signup?garmin_error=config`)
  }
  const params = new URL(request.url).searchParams
  const ref = (params.get('ref') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  const gym = (params.get('gym') ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64)

  const { verifier, challenge, state } = makePkce()
  const response = NextResponse.redirect(authorizeUrl(challenge, state))
  response.cookies.set(GARMIN_STATE_COOKIE, `${state}.${verifier}.new.${ref}.${gym}`, {
    httpOnly: true,
    secure: appUrl().startsWith('https'),
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return response
}
