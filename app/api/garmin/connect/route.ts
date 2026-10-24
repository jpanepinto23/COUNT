import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GARMIN_STATE_COOKIE, appUrl, authorizeUrl, garminConfigured, makePkce } from '@/lib/garmin'

// Signed-in user clicks "Connect Garmin". Returns the Garmin consent URL and
// parks the PKCE verifier + state in an httpOnly cookie for the callback.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.split(' ')[1]

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!garminConfigured()) {
    return NextResponse.json(
      { error: 'Garmin is not configured yet. Add GARMIN_CLIENT_ID and GARMIN_CLIENT_SECRET in Vercel.' },
      { status: 503 }
    )
  }

  const { verifier, challenge, state } = makePkce()
  const url = authorizeUrl(challenge, state)

  const response = NextResponse.json({ url })
  response.cookies.set(GARMIN_STATE_COOKIE, `${state}.${verifier}.${user.id}`, {
    httpOnly: true,
    secure: appUrl().startsWith('https'),
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return response
}
