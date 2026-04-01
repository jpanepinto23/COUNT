import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// SQL to run in Supabase SQL editor ONCE:
// CREATE TABLE IF NOT EXISTS push_subscriptions (
//   user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
//   endpoint text NOT NULL,
//   p256dh text NOT NULL,
//   auth text NOT NULL,
//   updated_at timestamptz DEFAULT now()
// );

export async function POST(req: NextRequest) {
  try {
    const { subscription, userId } = await req.json()

    if (!subscription?.endpoint || !userId) {
      return NextResponse.json({ error: 'Missing subscription or userId' }, { status: 400 })
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh ?? '',
        auth: subscription.keys?.auth ?? '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('push subscribe error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
