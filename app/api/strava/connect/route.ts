import { NextResponse, NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { saveOAuthState } from '@/lib/oauth-state'

// Signed-in user clicks "Connect Strava". Returns the Strava consent URL with
// a state value tied to this user, stored server-side so the callback can
// link the right account even if Strava returns in its own in-app browser.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = process.env.STRAVA_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Strava not configured' }, { status: 500 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.split(' ')[1])
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const state = randomBytes(16).toString('hex')
  await saveOAuthState('strava', state, { verifier: '', userId: user.id, ref: '', gym: '' })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://countfitness.app'
  const redirectUri = `${appUrl}/api/strava/callback`
  const scope = 'activity:read_all'
  const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&approval_prompt=auto&state=${state}`

  return NextResponse.json({ url })
}
