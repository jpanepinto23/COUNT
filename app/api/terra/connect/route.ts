import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.split(' ')[1]

  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const provider = searchParams.get('provider')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://count-app-joe.vercel.app'

  const res = await fetch('https://api.tryterra.co/v2/auth/generateWidgetSession', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.TERRA_API_KEY!,
      'dev-id': process.env.TERRA_DEV_ID!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      providers: provider ?? 'GARMIN,FITBIT,APPLE',
      language: 'EN',
      auth_success_redirect_url: appUrl + '/api/terra/callback',
      reference_id: user.id,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to create Terra session', details: data }, { status: 500 })
  }

  return NextResponse.json({ url: data.url, session_id: data.session_id })
}
