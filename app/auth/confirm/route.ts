import { type EmailOtpType } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

// GET renders an interstitial "Continue" page. Email link prefetchers (Gmail
// safe-link scanners, antivirus, etc.) typically issue GET requests but do not
// submit forms — so the recovery token is only consumed when the actual user
// clicks the Continue button, which POSTs back to this same route.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash') ?? ''
  const type = searchParams.get('type') ?? ''
  const next = searchParams.get('next') ?? '/'

  if (!token_hash || !type) {
    const errorUrl = new URL('/auth/forgot-password', request.url)
    errorUrl.searchParams.set('error', 'invalid_link')
    return NextResponse.redirect(errorUrl)
  }

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Confirm Password Reset — COUNT</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FAF8F4; color: #111110; min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { width: 100%; max-width: 380px; text-align: center; }
    .logo { display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 36px; }
    .tally { position: relative; width: 44px; height: 36px; }
    .tally span { position: absolute; top: 4px; width: 4px; height: 28px; background: #111110; border-radius: 2px; }
    .tally span:nth-child(1) { left: 6px; } .tally span:nth-child(2) { left: 14px; }
    .tally span:nth-child(3) { left: 22px; } .tally span:nth-child(4) { left: 30px; }
    .tally .slash { top: 16px; left: -2px; width: 48px; height: 3.5px; background: #B5593C; border-radius: 2px; transform: rotate(-30deg); }
    .brand { font-size: 22px; font-weight: 900; letter-spacing: 6px; text-transform: uppercase; }
    h1 { font-size: 26px; font-weight: 900; letter-spacing: -1px; margin: 0 0 6px; }
    p { color: #8A8478; font-size: 15px; margin: 0 0 28px; }
    button { width: 100%; padding: 15px; background: #111110; color: #F5F0EA; font-size: 15px; font-weight: 800; border: none; border-radius: 10px; cursor: pointer; }
    button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="tally"><span></span><span></span><span></span><span></span><div class="slash"></div></div>
      <div class="brand">COUNT</div>
    </div>
    <h1>Confirm Password Reset</h1>
    <p>Click below to continue and choose a new password.</p>
    <form method="POST" action="/auth/confirm">
      <input type="hidden" name="token_hash" value="${escape(token_hash)}" />
      <input type="hidden" name="type" value="${escape(type)}" />
      <input type="hidden" name="next" value="${escape(next)}" />
      <button type="submit">Continue</button>
    </form>
  </div>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

// POST consumes the recovery token, sets the session cookie, and redirects to
// `next`. Only triggered by the user actually clicking the Continue button.
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const token_hash = formData.get('token_hash')?.toString() ?? ''
  const type = (formData.get('type')?.toString() ?? '') as EmailOtpType
  const next = formData.get('next')?.toString() || '/'

  const errorUrl = new URL('/auth/forgot-password', request.url)
  errorUrl.searchParams.set('error', 'invalid_link')

  if (!token_hash || !type) {
    return NextResponse.redirect(errorUrl, { status: 303 })
  }

  const cookieStore = await cookies()
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.verifyOtp({ type, token_hash })
  if (error) {
    return NextResponse.redirect(errorUrl, { status: 303 })
  }

  return response
}
