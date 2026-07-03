import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Redemption is fully server-trusted: the client sends ONLY reward_id.
// Cost, reward type, fulfillment value, and the user's identity all come from
// the database — never from the request body.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    // 1. Authenticate the caller.
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    )
    const { data: { user: authUser } } = await authClient.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reward_id } = await req.json()
    if (!reward_id) {
      return NextResponse.json({ error: 'Missing reward_id' }, { status: 400 })
    }

    // 2. Load the reward and the user's profile from the database.
    const [{ data: reward }, { data: profile }] = await Promise.all([
      supabaseAdmin.from('rewards').select('*').eq('id', reward_id).single(),
      supabaseAdmin.from('users').select('id, email, name, points_balance').eq('id', authUser.id).single(),
    ])

    if (!reward || reward.is_active === false) {
      return NextResponse.json({ error: 'Reward not available' }, { status: 404 })
    }
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    const pointCost: number = reward.point_cost
    if ((profile.points_balance ?? 0) < pointCost) {
      return NextResponse.json({ error: 'Not enough coins for this reward' }, { status: 400 })
    }

    // 3. Deduct points FIRST (atomic, guarded so balance can't go negative),
    //    then record the redemption.
    const { data: deducted, error: deductErr } = await supabaseAdmin
      .from('users')
      .update({ points_balance: profile.points_balance - pointCost })
      .eq('id', profile.id)
      .gte('points_balance', pointCost)
      .select('id')
    if (deductErr || !deducted || deducted.length === 0) {
      return NextResponse.json({ error: 'Not enough coins for this reward' }, { status: 400 })
    }

    const { error: insertError } = await supabaseAdmin.from('redemptions').insert({
      user_id: profile.id,
      reward_id: reward.id,
      points_spent: pointCost,
    })
    if (insertError) {
      // Refund the deduction if the record failed to write.
      await supabaseAdmin
        .from('users')
        .update({ points_balance: profile.points_balance })
        .eq('id', profile.id)
      console.error('Redemption insert error:', insertError)
      return NextResponse.json({ error: 'Failed to record redemption' }, { status: 500 })
    }

    // 4. Build fulfillment content from DB values only.
    const rewardType: string = reward.reward_type ?? 'gift_card'
    const fulfillmentValue: string | null = reward.fulfillment_value ?? null
    const affiliateUrl: string | null = reward.affiliate_url ?? null
    const brandName: string = reward.brand_name
    const productName: string = reward.product_name
    const userEmail: string = profile.email
    const userName: string = profile.name ?? 'there'

    const isAutoFulfilled = rewardType === 'discount_code' || rewardType === 'affiliate_link'

    let adminFulfillmentHtml = ''
    let userFulfillmentHtml = ''

    if (rewardType === 'discount_code' && fulfillmentValue) {
      adminFulfillmentHtml = `
        <p style="font-family:sans-serif;color:#16a34a;font-weight:bold">
          Auto-fulfilled — promo code sent to user automatically.
        </p>
        <p style="font-family:sans-serif">Code: <strong>${fulfillmentValue}</strong></p>
      `
      userFulfillmentHtml = `
        <div style="background:#F0FAF0;border:1.5px solid #B2DFB2;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
          <p style="margin:0 0 8px;color:#166534;font-size:13px;font-weight:600;letter-spacing:1px">YOUR PROMO CODE</p>
          <p style="margin:0;font-size:26px;font-weight:900;letter-spacing:4px;color:#111110;font-family:monospace">
            ${fulfillmentValue}
          </p>
        </div>
        <p style="font-family:sans-serif;color:#666;font-size:13px;text-align:center">
          Apply this code at checkout on ${brandName}'s website.
        </p>
      `
    } else if (rewardType === 'affiliate_link' && affiliateUrl) {
      adminFulfillmentHtml = `
        <p style="font-family:sans-serif;color:#16a34a;font-weight:bold">
          Auto-fulfilled — affiliate link sent to user automatically.
        </p>
      `
      userFulfillmentHtml = `
        <div style="margin:24px 0;text-align:center">
          <a href="${affiliateUrl}" target="_blank"
            style="background:#111110;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block">
            Claim Your ${brandName} Reward →
          </a>
        </div>
        <p style="font-family:sans-serif;color:#666;font-size:13px;text-align:center">
          This is your exclusive link — use it to access your reward on ${brandName}'s site.
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
          Then email the code to <a href="mailto:${userEmail}">${userEmail}</a>
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

    // 5. Admin notification
    await sendEmail(
      'jpanepinto23@gmail.com',
      `${isAutoFulfilled ? 'Auto-fulfilled' : 'Action needed'}: ${productName} for ${userName}`,
      `
        <h2 style="font-family:sans-serif">${isAutoFulfilled ? 'Auto-Fulfilled Redemption' : 'New Gift Card Redemption'}</h2>
        <p style="font-family:sans-serif">
          <strong>User:</strong> ${userName}<br>
          <strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a>
        </p>
        <p style="font-family:sans-serif">
          <strong>Reward:</strong> ${productName} from ${brandName}<br>
          <strong>Type:</strong> ${rewardType.replace(/_/g, ' ')}<br>
          <strong>Points spent:</strong> ${pointCost}
        </p>
        ${adminFulfillmentHtml}
        <p style="font-family:sans-serif;margin-top:24px;font-size:13px">
          <a href="https://countfitness.app/admin">View all redemptions &#8594;</a>
        </p>
      `
    )

    // 6. User confirmation
    const userSubject = rewardType === 'discount_code'
      ? `Your ${brandName} promo code is here!`
      : rewardType === 'affiliate_link'
      ? `Your ${brandName} reward is ready!`
      : `Your ${productName} gift card is on its way!`

    await sendEmail(
      userEmail,
      userSubject,
      `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#B5593C">
            ${rewardType === 'gift_card' ? 'Your gift card is coming' : 'Your reward is ready'}, ${userName}!
          </h2>
          <p>You redeemed <strong>${pointCost.toLocaleString()} pts</strong> for
          <strong>${productName}</strong> from <strong>${brandName}</strong>.</p>
          ${userFulfillmentHtml}
          <p style="color:#8A8478;font-size:12px">Questions? Reply to this email and we'll help you out.</p>
          <p style="color:#8A8478;font-size:12px">- The COUNT team</p>
        </div>
      `
    )

    return NextResponse.json({
      success: true,
      reward_type: rewardType,
      fulfillment_value: isAutoFulfilled ? fulfillmentValue : null,
      affiliate_url: rewardType === 'affiliate_link' ? affiliateUrl : null,
    })
  } catch (err) {
    console.error('Redeem route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
