import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// New #feedback channel webhook if set, otherwise falls back to the #signups one
const SLACK_WEBHOOK_URL = process.env.SLACK_FEEDBACK_WEBHOOK_URL ?? process.env.SLACK_WEBHOOK_URL

const ALLOWED_SOURCES = ['web_form', 'in_app', 'reddit', 'dm', 'other']
const ALLOWED_WOULD_USE = ['yes', 'maybe', 'no']

type FeedbackRow = {
  source: string
  user_id: string | null
  trying_to_do: string | null
  what_got_in_way: string | null
  would_use: string | null
  rating: number | null
  contact: string | null
  page: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
}

async function pingSlack(row: FeedbackRow) {
  if (!SLACK_WEBHOOK_URL) return
  const wouldUse = row.would_use === 'yes' ? 'Yes ✅' : row.would_use === 'maybe' ? 'Maybe 🤔' : row.would_use === 'no' ? 'No ❌' : '—'
  const stars = row.rating ? '⭐️'.repeat(row.rating) : '—'
  const lines = [
    `*New COUNT feedback* _(${row.source})_`,
    row.trying_to_do ? `*Trying to do:* ${row.trying_to_do}` : null,
    row.what_got_in_way ? `*Got in the way:* ${row.what_got_in_way}` : null,
    `*Would use:* ${wouldUse}   *Rating:* ${stars}`,
    row.contact ? `*Contact:* ${row.contact}` : null,
    `${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`,
  ].filter(Boolean)
  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `New COUNT feedback (${row.source})`,
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } }],
      }),
    })
  } catch (err) {
    console.error('[Slack] feedback webhook error:', err)
  }
}

function clamp(v: unknown, max = 4000): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const source = ALLOWED_SOURCES.includes(body.source) ? body.source : 'web_form'
    const would_use = ALLOWED_WOULD_USE.includes(body.would_use) ? body.would_use : null
    const ratingNum = Number(body.rating)
    const rating = Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? ratingNum : null

    const row: FeedbackRow = {
      source,
      user_id: typeof body.user_id === 'string' && body.user_id ? body.user_id : null,
      trying_to_do: clamp(body.trying_to_do),
      what_got_in_way: clamp(body.what_got_in_way),
      would_use,
      rating,
      contact: clamp(body.contact, 320),
      page: clamp(body.page, 500),
      user_agent: clamp(req.headers.get('user-agent'), 500),
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : null,
    }

    // Require at least one substantive field so empty submits don't pollute the table
    if (!row.trying_to_do && !row.what_got_in_way && !row.would_use && !row.rating) {
      return NextResponse.json({ error: 'Feedback is empty' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('feedback').insert([row])
    if (error) {
      console.error('Feedback insert error:', error)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    // Fire-and-forget the Slack ping; don't block the user's response
    pingSlack(row)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Feedback route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
