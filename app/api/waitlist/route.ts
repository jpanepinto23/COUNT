import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

async function pingSlack(email: string) {
    if (!SLACK_WEBHOOK_URL) return
    try {
          await fetch(SLACK_WEBHOOK_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                            text: `New COUNT signup: ${email}`,
                            blocks: [
                              {
                                            type: 'section',
                                            text: {
                                                            type: 'mrkdwn',
                                                            text: `*New COUNT signup*\n\`${email}\`\nTime: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`,
                                            },
                              },
                                      ],
                  }),
          })
    } catch (err) {
          console.error('[Slack] webhook error:', err)
    }
}

export async function POST(req: NextRequest) {
    try {
          const { email } = await req.json()

      if (!email || typeof email !== 'string') {
              return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
      }

      const normalized = email.trim().toLowerCase()
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
                  return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
          }

      const { error } = await supabaseAdmin
            .from('waitlist')
            .upsert({ email: normalized, created_at: new Date().toISOString() }, { onConflict: 'email' })

      if (error) {
              console.error('Waitlist insert error:', error)
              return NextResponse.json({ error: 'Failed to save email' }, { status: 500 })
      }

      // Ping Slack — has try/catch inside, won't fail the signup if Slack is down
      await pingSlack(normalized)

      return NextResponse.json({ success: true })
    } catch (err) {
          console.error('Waitlist route error:', err)
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
