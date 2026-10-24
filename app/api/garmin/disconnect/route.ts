import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deregisterUser } from '@/lib/garmin'

export async function DELETE(req: NextRequest) {
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

  const { data: conn } = await supabase
    .from('garmin_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .maybeSingle()

  // Revoke on Garmin's side (best-effort), then drop our records.
  if (conn?.access_token) await deregisterUser(conn.access_token)

  await supabase.from('garmin_connections').delete().eq('user_id', user.id)
  const { error: devErr } = await supabase
    .from('connected_devices')
    .delete()
    .eq('user_id', user.id)
    .eq('type', 'garmin')
  if (devErr) {
    return NextResponse.json({ error: devErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
