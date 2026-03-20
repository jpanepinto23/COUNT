import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function DELETE(req: NextRequest) {
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
  const deviceType = searchParams.get('type')
  if (!deviceType) {
    return NextResponse.json({ error: 'Missing type param' }, { status: 400 })
  }

  // Get terra_user_id so we can deregister from Terra
  const { data: device } = await supabase
    .from('connected_devices')
    .select('terra_user_id, provider')
    .eq('user_id', user.id)
    .eq('type', deviceType)
    .single()

  // Tell Terra to deauthenticate this user (non-critical)
  if (device?.terra_user_id) {
    await fetch('https://api.tryterra.co/v2/auth/deauthenticateUser?id=' + device.terra_user_id, {
      method: 'DELETE',
      headers: {
        'x-api-key': process.env.TERRA_API_KEY!,
        'dev-id': process.env.TERRA_DEV_ID!,
      },
    }).catch(() => {})
  }

  const { error: deleteError } = await supabase
    .from('connected_devices')
    .delete()
    .eq('user_id', user.id)
    .eq('type', deviceType)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

