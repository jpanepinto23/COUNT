import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const PROVIDER_MAP: Record<string, string> = {
  APPLE: 'apple_health',
  GARMIN: 'garmin',
  FITBIT: 'fitbit',
  GOOGLE: 'google_fit',
  POLAR: 'polar',
  WHOOP: 'whoop',
  OURA: 'oura',
}

// Terra redirects here after user successfully authenticates
// URL params: user_id (terra), reference_id (our user_id), resource (provider name)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const terraUserId = searchParams.get('user_id')
  const referenceId = searchParams.get('reference_id')
  const resource = searchParams.get('resource')

  if (!terraUserId || !referenceId || !resource) {
    return NextResponse.redirect(
      new URL('/profile?error=missing_params', process.env.NEXT_PUBLIC_APP_URL!)
    )
  }

  const supabase = createServiceClient()
  const deviceType = PROVIDER_MAP[resource.toUpperCase()] ?? resource.toLowerCase()

  const { error } = await supabase
    .from('connected_devices')
    .upsert(
      {
        user_id: referenceId,
        type: deviceType,
        provider: resource.toUpperCase(),
        terra_user_id: terraUserId,
        status: 'active',
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,type' }
    )

  if (error) {
    console.error('Error saving connected device:', error)
    return NextResponse.redirect(
      new URL('/profile?error=connection_failed', process.env.NEXT_PUBLIC_APP_URL!)
    )
  }

  // Historical-by-default: right after connecting, ask Terra to push the last
  // 2 days of activity to our webhook. This backfills a workout the user did
  // earlier today (before connecting) so it still gets credited. Best-effort —
  // depends on the user granting historical scope on the provider's consent screen.
  const terraDevId = process.env.TERRA_DEV_ID
  const terraApiKey = process.env.TERRA_API_KEY
  if (terraDevId && terraApiKey) {
    const end = new Date()
    const start = new Date(end.getTime() - 2 * 24 * 60 * 60 * 1000)
    fetch(
      `https://api.tryterra.co/v2/activity?user_id=${terraUserId}` +
        `&start_date=${encodeURIComponent(start.toISOString())}` +
        `&end_date=${encodeURIComponent(end.toISOString())}&to_webhook=true`,
      { headers: { 'dev-id': terraDevId, 'x-api-key': terraApiKey } }
    ).catch(() => {})
  }

  return NextResponse.redirect(
    new URL('/profile?connected=true', process.env.NEXT_PUBLIC_APP_URL!)
  )
}

