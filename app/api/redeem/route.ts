import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: 'COUNT Rewards <onboarding@resend.dev>',
      to,
      subject,
      html,
    }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { reward_id, user_id, points_spent, product_name, brand_name, user_email, user_name } =
      await req.json()

    if (!reward_id || !user_id || !points_spent || !user_email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Insert redemption record
    const { error: insertError } = await supabaseAdmin.from('redemptions').insert({
      user_id,
      reward_id,
      points_spent,
    })
    if (insertError) {
      console.error('Redemption insert error:', insertError)
      return NextResponse.json({ error: 'Failed to record redemption' }, { status: 500 })
    }

    // 2. Deduct points from user balance
    const { error: pointsError } = await supabaseAdmin.rpc('deduct_points', {
      p_user_id: user_id,
      p_amount: points_spent,
    })
    if (pointsError) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('points_balance')
        .eq('id', user_id)
        .single()
      if (userData) {
        await supabaseAdmin
          .from('users')
          .update({ points_balance: Math.max(0, (userData.points_balance ?? 0) - points_spent) })
          .eq('id', user_id)
      }
    }

    // 3. Send admin notification email
    await sendEmail(
      'jpanepinto23@gmail.com',
      `🎁 New Redemption: ${product_name} for ${user_name}`,
      `
      <h2 style="font-family:sans-serif">New Gift Card Redemption</h2>
      <p style="font-family:sans-serif"><strong>User:</strong> ${user_name}<br>
      <strong>Email:</strong> <a href="mailto:${user_email}">${user_email}</a></p>
      <p style="font-family:sans-serif"><strong>Reward:</strong> ${product_name} from ${brand_name}<br>
      <strong>Points spent:</strong> ${points_spent}</p>
      <p style="font-family:sans-serif;margin-top:20px">
        <a href="https://www.amazon.com/gift-cards/" target="_blank"
           style="background:#FF9900;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
          Buy Amazon Gift Card &#8594;
        </a>
      </p>
      <p style="font-family:sans-serif;margin-top:16px;font-size:13px;color:#666">
        Then email the code to <a href="mailto:${user_email}">${user_email}</a>
      </p>
      <p style="font-family:sans-serif;margin-top:24px;font-size:13px">
        <a href="https://count-fitness-app.vercel.app/admin">View all redemptions &#8594;</a>
      </p>
      `
    )

    // 4. Send user confirmation email
    await sendEmail(
      user_email,
      `Your ${product_name} gift card is on its way! 🎉`,
      `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#B5593C">Your gift card is coming, ${user_name}! 🎁</h2>
        <p>We've received your redemption for a <strong>${product_name}</strong> from <strong>${brand_name}</strong>.</p>
        <p>Your gift card code will be sent to this email address within <strong>24-48 hours</strong>.</p>
        <div style="background:#FFF8F5;border:1.5px solid #F0D5C8;border-radius:12px;padding:16px;margin:20px 0">
          <p style="margin:0;color:#8A8478;font-size:13px">Points redeemed: <strong style="color:#B5593C">${points_spent} pts</strong></p>
        </div>
        <p style="color:#8A8478;font-size:12px">Questions? Reply to this email and we'll help you out.</p>
        <p style="color:#8A8478;font-size:12px">- The COUNT team</p>
      </div>
      `
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Redeem route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
