import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL
const RESEND_API_KEY = process.env.RESEND_API_KEY

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

async function sendWelcomeEmail(email: string) {
  if (!RESEND_API_KEY) return
  try {
    const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#FAF8F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111110;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF8F4;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:14px;padding:36px 32px;border:1px solid #E0D9CE;">
            <tr><td>
              <p style="margin:0 0 24px 0;font-size:14px;font-weight:700;letter-spacing:2px;color:#B5593C;text-transform:uppercase;">COUNT</p>
              <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:800;color:#111110;line-height:1.25;">You're in. Here's the playbook.</h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">Hey,</p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">Welcome to COUNT. Quick version: log workouts &rarr; earn points &rarr; redeem for real stuff from brands you already use. NOBULL, Thorne, Momentous, Kane, and Amazon are live in the catalog right now, with more rolling in monthly.</p>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#3A3530;">I put together a 2-page guide that walks through how points, streaks, and rewards work. Pin it to your phone for reference.</p>
              <p style="margin:24px 0;text-align:center;">
                <a href="https://countfitness.app/COUNT-getting-started.pdf" style="display:inline-block;padding:14px 28px;background:#111110;color:#F5F0EA;text-decoration:none;border-radius:10px;font-weight:800;font-size:15px;">Download the Starter Guide</a>
              </p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">After that, the only thing left is to log your first workout. Walk, lift, run, ride &mdash; anything counts. Day 1 of your streak starts the moment you log it.</p>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#3A3530;">You've got this.</p>
              <p style="margin:0 0 4px 0;font-size:15px;line-height:1.6;color:#3A3530;">&mdash;Joe</p>
              <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#7A6F62;">P.S. Stuck on something or have a brand you want to see? Reply to this email. It comes straight to me.</p>
            </td></tr>
          </table>
          <p style="margin:18px 0 0 0;font-size:11px;color:#7A6F62;">COUNT &middot; countfitness.app</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Joe from COUNT <joe@countfitness.app>',
        to: [email],
        subject: "You're in. Here's the playbook.",
        html,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[Resend] welcome send failed:', res.status, text)
    }
  } catch (err) {
    console.error('[Resend] unexpected error:', err)
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

    // Fire welcome email + Slack ping in parallel; both have try/catch inside
    await Promise.all([
      sendWelcomeEmail(normalized),
      pingSlack(normalized),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Waitlist route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
