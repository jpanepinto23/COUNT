import { NextResponse, NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { STRAVA_STATE_COOKIE } from '@/lib/strava-auth'

// Public entry point for "Connect Strava" on the signup and login pages.
// No COUNT session is needed: the callback creates the account (or signs the
// athlete back in) from the Strava identity. A random state value is stored
// in an httpOnly cookie and checked in the callback.
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://countfitness.app'
  const clientId = process.env.STRAVA_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/auth/signup?strava_error=config`)
  }

  const ref = (new URL(request.url).searchParams.get('ref') ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)

  const nonce = randomBytes(16).toString('hex')
  const redirectUri = `${appUrl}/api/strava/callback`
  const url =
    'https://www.strava.com/oauth/authorize' +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    '&response_type=code&scope=activity:read_all&approval_prompt=auto' +
    `&state=${nonce}`

  const response = NextResponse.redirect(url)
  response.cookies.set(STRAVA_STATE_COOKIE, `${nonce}.${ref}`, {
    httpOnly: true,
    secure: appUrl.startsWith('https'),
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return response
}
