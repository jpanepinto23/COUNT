import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the access token to revoke
  const { data: conn } = await supabase
    .from('strava_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .single()

  if (conn?.access_token) {
    // Revoke the token with Strava (best-effort)
    await fetch('https://www.strava.com/oauth/deauthorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `access_token=${conn.access_token}`,
    }).catch(() => {})
  }

  // Delete from strava_connections
  await supabase
    .from('strava_connections')
    .delete()
    .eq('user_id', user.id)

  // Delete from connected_devices
  await supabase
    .from('connected_devices')
    .delete()
    .eq('user_id', user.id)
    .eq('type', 'strava')

  return NextResponse.json({ success: true })
}
