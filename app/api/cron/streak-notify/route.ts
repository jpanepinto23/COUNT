import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Requires: npm install web-push
// Requires env vars: VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET
// Vercel cron runs this at 18:00 UTC daily (vercel.json)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let webpush: typeof import('web-push')
  try {
    webpush = await import('web-push')
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    )
  } catch {
    return NextResponse.json({ error: 'web-push not installed. Run: npm install web-push' }, { status: 500 })
  }

  const supabase = createClient()

  // Get all users with active streaks who have push subscriptions
  // and haven't logged a workout today
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth, users(current_streak, name, last_workout_date)')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: { userId: string; sent: boolean; reason?: string }[] = []

  for (const sub of subs ?? []) {
    const user = (sub as any).users
    if (!user || user.current_streak < 1) continue

    // Skip if they already logged today
    if (user.last_workout_date) {
      const lastDate = new Date(user.last_workout_date)
      lastDate.setUTCHours(0, 0, 0, 0)
      if (lastDate.getTime() === today.getTime()) {
        results.push({ userId: sub.user_id, sent: false, reason: 'already_logged' })
        continue
      }
    }

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: `${user.current_streak}-day streak at risk!`,
          body: 'Log a workout today to keep your streak alive. Tap to open COUNT.',
          url: '/home',
        }),
      )
      results.push({ userId: sub.user_id, sent: true })
    } catch (e) {
      results.push({ userId: sub.user_id, sent: false, reason: String(e) })
    }
  }

  return NextResponse.json({ notified: results.filter(r => r.sent).length, total: results.length, results })
}
