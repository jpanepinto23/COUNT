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

// ----------------------------------------------------------------------------
// Email content for the 5-stage onboarding drip.
// Day 0 fires immediately; Days 2/5/8/12 are scheduled via Resend's scheduled_at.
// Brand voice: direct, gym-buddy, no corporate filler.
// ----------------------------------------------------------------------------

function emailShell(headline: string, bodyHtml: string, ctaLabel: string, ctaHref: string) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#FAF8F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111110;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF8F4;padding:40px 20px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:14px;padding:36px 32px;border:1px solid #E0D9CE;">
          <tr><td>
            <p style="margin:0 0 24px 0;font-size:14px;font-weight:700;letter-spacing:2px;color:#B5593C;text-transform:uppercase;">COUNT</p>
            <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:800;color:#111110;line-height:1.25;">${headline}</h1>
            ${bodyHtml}
            <p style="margin:24px 0;text-align:center;">
              <a href="${ctaHref}" style="display:inline-block;padding:14px 28px;background:#111110;color:#F5F0EA;text-decoration:none;border-radius:10px;font-weight:800;font-size:15px;">${ctaLabel}</a>
            </p>
            <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#7A6F62;">&mdash;Joe</p>
          </td></tr>
        </table>
        <p style="margin:18px 0 0 0;font-size:11px;color:#7A6F62;">COUNT &middot; countfitness.app</p>
      </td></tr>
    </table>
  </body>
</html>`
}

const APP_URL = 'https://countfitness.app/app'
const PDF_URL = 'https://countfitness.app/COUNT-getting-started.pdf'

const dripSchedule = [
  // Day 0 — Welcome
  {
    delayDays: 0,
    subject: "You're in. Here's the playbook.",
    headline: "You're in. Here's the playbook.",
    body: `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">Hey,</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">Welcome to COUNT. Quick version: log workouts &rarr; earn points &rarr; redeem for real stuff from brands you already use. NOBULL, Thorne, Momentous, Kane, and Amazon are live in the catalog right now, with more rolling in monthly.</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">I put together a 2-page guide that walks through how points, streaks, and rewards work. Pin it to your phone for reference.</p>`,
    ctaLabel: 'Download the Starter Guide',
    ctaHref: PDF_URL,
  },
  // Day 2 — How it works
  {
    delayDays: 2,
    subject: 'How to turn workouts into rewards',
    headline: 'The streak is everything.',
    body: `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">Quick walkthrough of how COUNT actually works:</p>
      <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#3A3530;"><strong>Log.</strong> Every workout you log is 1 point baseline. Walk, lift, run, ride &mdash; any movement counts.</p>
      <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#3A3530;"><strong>Earn.</strong> Streaks multiply your points. Two days in a row = 1.5x. Five days = 2x. Ten days = 2.5x.</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;"><strong>Redeem.</strong> Points trade for actual products from brands we partner with.</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">The hook: consistency pays off. Literally. Day 1 of your streak starts the moment you log a workout.</p>`,
    ctaLabel: 'Start Your Streak',
    ctaHref: APP_URL,
  },
  // Day 5 — Rewards spotlight
  {
    delayDays: 5,
    subject: 'The rewards are already live (and growing)',
    headline: 'What you can actually earn.',
    body: `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;"><strong>Live in the catalog right now:</strong></p>
      <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#3A3530;"><strong>NOBULL</strong> &middot; training shoes and apparel built for serious work.<br/>
      <strong>Thorne</strong> &middot; supplements backed by their research.<br/>
      <strong>Momentous</strong> &middot; athlete-grade protein and recovery.<br/>
      <strong>Kane</strong> &middot; recovery footwear for the days you don&rsquo;t train.<br/>
      <strong>Amazon</strong> &middot; for everything else you need.</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">More brands rolling in monthly. Vuori and AG1 are next in the pipeline.</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">We&rsquo;re picky about partners &mdash; only brands we&rsquo;d actually use. If there&rsquo;s a brand you want to see, hit reply and tell me.</p>`,
    ctaLabel: 'View Rewards Catalog',
    ctaHref: APP_URL + '/rewards',
  },
  // Day 8 — Community / FOMO
  {
    delayDays: 8,
    subject: 'Early members are already stacking points',
    headline: 'See where you rank.',
    body: `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">This is the part where I tell you something&rsquo;s working.</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">People who signed up early are building real streaks &mdash; some past 20 days. Bronze tier members are grinding. We&rsquo;re seeing serious consistency.</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">Real talk: working out is harder when no one&rsquo;s watching. But when other members are logging workouts and climbing the leaderboard, it changes things. You start showing up.</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">The leaderboard&rsquo;s in the app. Bronze, Silver, Gold tiers. Space at the top isn&rsquo;t unlimited.</p>`,
    ctaLabel: 'Check Your Rank',
    ctaHref: APP_URL + '/leaderboard',
  },
  // Day 12 — Founder note
  {
    delayDays: 12,
    subject: 'Why I built COUNT',
    headline: 'This one is from me.',
    body: `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">Hey,</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">12 days in, and I wanted to say this directly.</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">I built COUNT because I was tired of the exchange being one-way. Years of grinding in the gym, spending money on supplements and gear, and the apps on my phone just tracked me. No one was paying me back.</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">So I built something where they do.</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">If you&rsquo;ve got feedback &mdash; brands you want, features you need, anything &mdash; reply to this email. I read every one.</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3A3530;">P.S. Hit a 30-day streak and I&rsquo;m sending you something. Just saying.</p>`,
    ctaLabel: 'Tell Me What You Want',
    ctaHref: 'mailto:joe@countfitness.app?subject=COUNT%20feedback',
  },
]

async function sendDripStage(email: string, stage: typeof dripSchedule[number]) {
  if (!RESEND_API_KEY) return
  try {
    const body: Record<string, unknown> = {
      from: 'Joe from COUNT <joe@countfitness.app>',
      to: [email],
      subject: stage.subject,
      html: emailShell(stage.headline, stage.body, stage.ctaLabel, stage.ctaHref),
    }
    if (stage.delayDays > 0) {
      const sendAt = new Date(Date.now() + stage.delayDays * 24 * 60 * 60 * 1000)
      body.scheduled_at = sendAt.toISOString()
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error(`[Resend] day ${stage.delayDays} send failed:`, res.status, text)
    }
  } catch (err) {
    console.error(`[Resend] day ${stage.delayDays} unexpected error:`, err)
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

    // Idempotency: if email already exists, do not re-trigger the drip
    const { data: existing } = await supabaseAdmin
      .from('waitlist')
      .select('email')
      .eq('email', normalized)
      .maybeSingle()

    const isNewSignup = !existing

    const { error } = await supabaseAdmin
      .from('waitlist')
      .upsert({ email: normalized, created_at: new Date().toISOString() }, { onConflict: 'email' })

    if (error) {
      console.error('Waitlist insert error:', error)
      return NextResponse.json({ error: 'Failed to save email' }, { status: 500 })
    }

    // Slack ping for every signup attempt; drip only on new signups
    const work: Promise<unknown>[] = [pingSlack(normalized)]
    if (isNewSignup) {
      for (const stage of dripSchedule) {
        work.push(sendDripStage(normalized, stage))
      }
    }
    await Promise.all(work)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Waitlist route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
