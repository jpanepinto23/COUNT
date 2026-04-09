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
    body: JSON.stringify({ from: 'COUNT Rewards <onboarding@resend.dev>', to, subject, html }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const {
      reward_id, user_id, points_spent, product_name, brand_name,
      user_email, user_name,
      reward_type = 'gift_card',
      fulfillment_value,
      affiliate_url,
    } = await req.json()

    if (!reward_id || !user_id || !points_spent || !user_email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Insert redemption record
    const { error: insertError } = await supabaseAdmin.from('redemptions').insert({
      user_id, reward_id, points_spent,
    })
    if (insertError) {
      console.error('Redemption insert error:', insertError)
      return NextResponse.json({ error: 'Failed to record redemption' }, { status: 500 })
    }

    // 2. Deduct points
    const { error: pointsError } = await supabaseAdmin.rpc('deduct_points', {
      p_user_id: user_id, p_amount: points_spent,
    })
    if (pointsError) {
      const { data: userData } = await supabaseAdmin.from('users').select('points_balance').eq('id', user_id).single()
      if (userData) {
        await supabaseAdmin.from('users').update({
          points_balance: Math.max(0, (userData.points_balance ?? 0) - points_spent),
        }).eq('id', user_id)
      }
    }

    // 3. Build fulfillment content
    const isAutoFulfilled = reward_type === 'discount_code' || reward_type === 'affiliate_link'

    let adminFulfillmentHtml = ''
    let userFulfillmentHtml = ''

    if (reward_type === 'discount_code' && fulfillment_value) {
      adminFulfillmentHtml = `
        <p style="font-family:sans-serif;color:#16a34a;font-weight:bold">
          ✅ Auto-fulfilled — promo code sent to user automatically.
        </p>
        <p style="font-family:sans-serif">Code: <strong>${fulfillment_value}</strong></p>
      `
      userFulfillmentHtml = `
        <div style="background:#F0FAF0;border:1.5px solid #B2DFB2;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
          <p style="margin:0 0 8px;color:#166534;font-size:13px;font-weight:600;letter-spacing:1px">YOUR PROMO CODE</p>
          <p style="margin:0;font-size:26px;font-weight:900;letter-spacing:4px;color:#111110;font-family:monospace">
            ${fulfillment_value}
          </p>
        </div>
        <p style="font-family:sans-serif;color:#666;font-size:13px;text-align:center">
          Apply this code at checkout on ${brand_name}'s website.
        </p>
      `
    } else if (reward_type === 'affiliate_link' && affiliate_url) {
      adminFulfillmentHtml = `
        <p style="font-family:sans-serif;color:#16a34a;font-weight:bold">
          ✅ Auto-fulfilled — affiliate link sent to user automatically.
        </p>
      `
      userFulfillmentHtml = `
        <div style="margin:24px 0;text-align:center">
          <a href="${affiliate_url}" target="_blank"
            style="background:#111110;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block">
            Claim Your ${brand_name} Reward →
          </a>
        </div>
        <p style="font-family:sans-serif;color:#666;font-size:13px;text-align:center">
          This is your exclusive link — use it to access your reward on ${brand_name}'s site.
        </p>
      `
    } else {
      adminFulfillmentHtml = `
        <p style="font-family:sans-serif;margin-top:20px">
          <a href="https://www.amazon.com/gift-cards/" target="_blank"
            style="background:#FF9900;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
            Buy Amazon Gift Card &#8594;
          </a>
        </p>
        <p style="font-family:sans-serif;margin-top:16px;font-size:13px;color:#666">
          Then email the code to <a href="mailto:${user_email}">${user_email}</a>
        </p>
      `
      userFulfillmentHtml = `
        <div style="background:#FFF8F5;border:1.5px solid #F0D5C8;border-radius:12px;padding:16px;margin:20px 0">
          <p style="margin:0;color:#8A8478;font-size:13px">
            Your gift card code will arrive within <strong style="color:#B5593C">24-48 hours</strong>.
          </p>
        </div>
      `
    }

    // 4. Admin notification
    await sendEmail(
      'jpanepinto23@gmail.com',
      `${isAutoFulfilled ? '✅ Auto-fulfilled' : '🎁 Action needed'}: ${product_name} for ${user_name}`,
      `
        <h2 style="font-family:sans-serif">${isAutoFulfilled ? 'Auto-Fulfilled Redemption' : 'New Gift Card Redemption'}</h2>
        <p style="font-family:sans-serif">
          <strong>User:</strong> ${user_name}<br>
          <strong>Email:</strong> <a href="mailto:${user_email}">${user_email}</a>
        </p>
        <p style="font-family:sans-serif">
          <strong>Reward:</strong> ${product_name} from ${brand_name}<br>
          <strong>Type:</strong> ${reward_type.replace(/_/g, ' ')}<br>
          <strong>Points spent:</strong> ${points_spent}
        </p>
        ${adminFulfillmentHtml}
        <p style="font-family:sans-serif;margin-top:24px;font-size:13px">
          <a href="https://countfitness.app/admin">View all redemptions &#8594;</a>
        </p>
      `
    )

    // 5. User confirmation
    const userSubject = reward_type === 'discount_code'
      ? `Your ${brand_name} promo code is here! 🎉`
      : reward_type === 'affiliate_link'
      ? `Your ${brand_name} reward is ready! 🎉`
      : `Your ${product_name} gift card is on its way! 🎉`

    await sendEmail(
      user_email,
      userSubject,
      `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#B5593C">
            ${reward_type === 'gift_card' ? 'Your gift card is coming' : 'Your reward is ready'}, ${user_name}! 🎁
          </h2>
          <p>You redeemed <strong>${points_spent.toLocaleString()} pts</strong> for
          <strong>${product_name}</strong> from <strong>${brand_name}</strong>.</p>
          ${userFulfillmentHtml}
          <p style="color:#8A8478;font-size:12px">Questions? Reply to this email and we'll help you out.</p>
          <p style="color:#8A8478;font-size:12px">- The COUNT team</p>
        </div>
      `
    )

    return NextResponse.json({ success: true, reward_type, fulfillment_value, affiliate_url })
  } catch (err) {
    console.error('Redeem route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
