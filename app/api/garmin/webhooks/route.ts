import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { creditActivity } from '@/lib/auto-verify'
import { mapGarminWorkoutType, prettyActivityType } from '@/lib/garmin'

// Garmin Health API push receiver.
// Developer Portal → API Tools → Endpoint Configuration:
//   Activities:                 https://countfitness.app/api/garmin/webhooks
//   Manually Updated Activities: (same URL, optional)
//   Deregistrations:            (same URL, optional)
//   User Permissions Change:    (same URL, optional)
//
// Garmin does not sign pushes. We trust a payload only to the extent that its
// userId matches a stored connection; unknown users are ignored. Garmin expects
// a 200 within ~30s and retries on failure, so dedupe on summaryId makes the
// handler safe to replay.

/* eslint-disable @typescript-eslint/no-explicit-any */

export const maxDuration = 30

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Garmin may GET the endpoint when you save it in the portal.
export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!payload || typeof payload !== 'object') return NextResponse.json({ received: true })

  const supabase = admin()

  const activities: any[] = [
    ...(Array.isArray(payload.activities) ? payload.activities : []),
    ...(Array.isArray(payload.manuallyUpdatedActivities) ? payload.manuallyUpdatedActivities : []),
  ]
  const deregistrations: any[] = Array.isArray(payload.deregistrations) ? payload.deregistrations : []
  const permissionChanges: any[] = Array.isArray(payload.userPermissionsChange) ? payload.userPermissionsChange : []

  // --- Deregistrations: user revoked COUNT from Garmin Connect ---
  for (const d of deregistrations) {
    const gid = d?.userId ? String(d.userId) : null
    if (!gid) continue
    const { data: conn } = await supabase.from('garmin_connections').select('user_id').eq('garmin_user_id', gid).maybeSingle()
    if (!conn) continue
    await supabase.from('garmin_connections').delete().eq('garmin_user_id', gid)
    await supabase.from('connected_devices').delete().eq('user_id', conn.user_id).eq('type', 'garmin')
  }

  // --- Permission changes: if ACTIVITY_EXPORT was removed, treat like a disconnect ---
  for (const p of permissionChanges) {
    const gid = p?.userId ? String(p.userId) : null
    const perms: string[] = Array.isArray(p?.permissions) ? p.permissions : []
    if (!gid || perms.includes('ACTIVITY_EXPORT')) continue
    const { data: conn } = await supabase.from('garmin_connections').select('user_id').eq('garmin_user_id', gid).maybeSingle()
    if (!conn) continue
    await supabase.from('connected_devices').update({ status: 'disconnected' }).eq('user_id', conn.user_id).eq('type', 'garmin')
  }

  // --- Activities ---
  let credited = 0
  let skipped = 0
  for (const a of activities) {
    const gid = a?.userId ? String(a.userId) : null
    const summaryId = a?.summaryId ? String(a.summaryId) : null
    const startSec = Number(a?.startTimeInSeconds)
    if (!gid || !summaryId || !Number.isFinite(startSec)) { skipped++; continue }

    const { data: conn } = await supabase
      .from('garmin_connections')
      .select('user_id')
      .eq('garmin_user_id', gid)
      .maybeSingle()
    if (!conn) { skipped++; continue }
    const userId: string = conn.user_id

    const startTime = new Date(startSec * 1000).toISOString()
    const durationSeconds = Number.isFinite(Number(a.durationInSeconds)) ? Math.round(Number(a.durationInSeconds)) : null
    const calories = Number.isFinite(Number(a.activeKilocalories)) ? Math.round(Number(a.activeKilocalories)) : null
    const heartRateAvg = Number.isFinite(Number(a.averageHeartRateInBeatsPerMinute))
      ? Math.round(Number(a.averageHeartRateInBeatsPerMinute)) : null
    const activityType: string = String(a.activityType ?? 'UNKNOWN')
    const activityName: string = typeof a.activityName === 'string' && a.activityName.trim()
      ? a.activityName.trim()
      : prettyActivityType(activityType)

    // Dedupe: insert the ledger row first. A unique violation on summary_id
    // means we've already handled this activity (Garmin retry, manual edit,
    // or backfill overlap) — never credit it again.
    const { error: ledgerErr } = await supabase.from('garmin_activities').insert({
      user_id: userId,
      garmin_user_id: gid,
      summary_id: summaryId,
      activity_id: Number.isFinite(Number(a.activityId)) ? Number(a.activityId) : null,
      activity_type: activityType,
      activity_name: activityName,
      start_time: startTime,
      duration_seconds: durationSeconds,
      calories,
      heart_rate_avg: heartRateAvg,
      raw_data: a,
    })
    if (ledgerErr) {
      if (ledgerErr.code !== '23505') console.error('[garmin/webhooks] ledger insert failed', ledgerErr.message)
      skipped++
      continue
    }

    // Ignore sub-minute blips (watch tapped by accident).
    if (durationSeconds !== null && durationSeconds < 60) { skipped++; continue }

    const outcome = await creditActivity(supabase, userId, {
      startTime,
      durationSeconds,
      heartRateAvg,
      calories,
      workoutType: mapGarminWorkoutType(activityType, activityName),
      deviceType: 'garmin',
      activityName,
    })

    if (outcome === 'minted' || outcome === 'upgraded') {
      credited++
      await supabase.from('garmin_activities').update({ credited: true }).eq('summary_id', summaryId)
    }
  }

  return NextResponse.json({ received: true, activities: activities.length, credited, skipped })
}
