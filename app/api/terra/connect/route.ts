import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text()
  if (!text) return {}
  try { return JSON.parse(text) } catch { return { raw: text } }
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

  const terraApiKey = process.env.TERRA_API_KEY
  const terraDevId  = process.env.TERRA_DEV_ID
  if (!terraApiKey || !terraDevId) {
    return NextResponse.json({ error: 'Terra API keys not configured. Add TERRA_API_KEY and TERRA_DEV_ID to your Vercel environment variables.' }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const provider = searchParams.get('provider')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://countfitness.app'

  try {
    const res = await fetch('https://api.tryterra.co/v2/auth/generateWidgetSession', {
      method: 'POST',
      headers: {
        'x-api-key': terraApiKey,
        'dev-id': terraDevId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        providers: provider ?? 'GARMIN,FITBIT,APPLE',
        language: 'EN',
        auth_success_redirect_url: appUrl + '/api/terra/callback',
        reference_id: user.id,
      }),
    })

    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json({ error: 'Terra API error', details: data }, { status: 502 })
    }
    if (!data.url) {
      return NextResponse.json({ error: 'Terra did not return a widget URL', details: data }, { status: 502 })
    }

    return NextResponse.json({ url: data.url, session_id: data.session_id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unexpected error' }, { status: 500 })
  }
}
