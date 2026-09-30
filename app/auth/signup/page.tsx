'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

// Base 200 + 50 verified bonus (lib/points.ts), before tier and streak.
const VERIFIED_WORKOUT_COINS = 250

const STRAVA_ERRORS: Record<string, string> = {
  denied: 'Strava was not connected. Try again, or sign up with email below.',
  limit: 'Strava is limiting new connections to COUNT right now. Sign up with email below and connect Strava later from your profile.',
  state: 'That took too long and the link expired. Try again.',
  config: 'Strava sign up is not available right now. Sign up with email below.',
  failed: 'Something went wrong connecting Strava. Try again, or sign up with email below.',
}

function SignupContent() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [goingToStrava, setGoingToStrava] = useState(false)
  const [firstReward, setFirstReward] = useState<{ brand_name: string; point_cost: number } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const stravaError = searchParams.get('strava_error')
  // Pre-fill referral code from URL ?ref=CODE. Open the email form when Strava is the thing that failed.
  const [refCode, setRefCode] = useState(() => (searchParams.get('ref') ?? '').toUpperCase())
  const [showEmail, setShowEmail] = useState(() => Boolean(stravaError && stravaError !== 'denied' && stravaError !== 'state'))

  // Cheapest live reward, so the page can say exactly what the first win is.
  useEffect(() => {
    supabase
      .from('rewards')
      .select('brand_name, point_cost')
      .eq('is_active', true)
      .order('point_cost', { ascending: true })
      .limit(1)
      .then(({ data }) => {
        if (data && data[0]) setFirstReward(data[0])
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || password.length < 6) {
      setError('Please fill all fields (min 6 char password)')
      return
    }
    setLoading(true)
    setError('')

    // The profile row, referral code, and referral link-up are all created
    // server-side by the on_auth_user_created trigger — the client just passes
    // signup details along as auth metadata.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          referred_by_code: refCode.trim().toUpperCase() || null,
        },
      },
    })
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Signup failed')
      setLoading(false)
      return
    }

    router.replace('/connect')
  }

  const cleanRef = refCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  const stravaHref = '/api/strava/start' + (cleanRef ? `?ref=${cleanRef}` : '')
  const cost = firstReward?.point_cost ?? 600
  const workoutsNeeded = Math.max(1, Math.ceil(cost / VERIFIED_WORKOUT_COINS))
  const steps = [
    'Connect Strava',
    ...Array.from({ length: workoutsNeeded }, (_, i) => `Workout ${i + 1}`),
  ]

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#0E0E0D' }}>
      <div style={{ marginBottom: 36 }}>
        <TallyLogo />
      </div>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, fontFamily: 'Archivo, sans-serif', color: '#F5F0EA' }}>Get paid for your workouts</h1>
        <p style={{ color: '#8A8680', fontSize: 15, marginBottom: 22, lineHeight: 1.5 }}>
          One tap. Your Strava activities earn coins, and coins buy rewards. No forms, no password.
        </p>

        {/* Path to the first reward */}
        <div style={{ background: '#181714', border: '1.5px solid #2E2C29', borderRadius: 14, padding: '16px 16px 14px', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#8A8680', fontFamily: 'Archivo, sans-serif' }}>Your first reward</span>
            <span style={{ fontSize: 12, color: '#B5593C', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>0 / {cost} coins</span>
          </div>
          <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
            {steps.map((label, i) => (
              <div key={label} style={{ flex: 1 }}>
                <div style={{ height: 6, borderRadius: 3, background: '#2E2C29', marginBottom: 6 }} />
                <div style={{ fontSize: 10.5, color: i === 0 ? '#F5F0EA' : '#8A8680', fontFamily: 'Archivo, sans-serif', fontWeight: i === 0 ? 800 : 600, lineHeight: 1.2 }}>{label}</div>
              </div>
            ))}
          </div>
          <p style={{ color: '#B0A89E', fontSize: 13, lineHeight: 1.45, margin: 0 }}>
            {workoutsNeeded} {workoutsNeeded === 1 ? 'workout' : 'workouts'} gets you a {firstReward ? firstReward.brand_name : 'brand'} discount. They can be workouts you were doing anyway.
          </p>
        </div>

        {stravaError && (
          <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, lineHeight: 1.45 }}>{STRAVA_ERRORS[stravaError] ?? STRAVA_ERRORS.failed}</p>
        )}

        <a
          href={stravaHref}
          onClick={() => setGoingToStrava(true)}
          style={{ ...btnStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#FC4C02', color: '#fff', textDecoration: 'none', fontSize: 16, padding: '17px', opacity: goingToStrava ? 0.7 : 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          {goingToStrava ? 'Opening Strava...' : 'Connect with Strava'}
        </a>
        <p style={{ color: '#8A8680', fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
          We only read your activities. We never post. You must be 13 or older.
        </p>

        {!showEmail ? (
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            style={{ display: 'block', width: '100%', marginTop: 14, padding: 10, background: 'transparent', border: 'none', color: '#8A8680', fontSize: 13, fontFamily: 'Archivo, sans-serif', cursor: 'pointer', textDecoration: 'underline' }}
          >
            No Strava? Sign up with email
          </button>
        ) : (
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 22, paddingTop: 22, borderTop: '1.5px solid #2E2C29' }}>
            <input type="text" placeholder="First name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} autoComplete="given-name" />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} autoComplete="email" />
            <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} autoComplete="new-password" />
            <input
              type="text"
              placeholder="Referral code (optional)"
              value={refCode}
              onChange={e => setRefCode(e.target.value.toUpperCase())}
              maxLength={8}
              style={{ ...inputStyle, fontFamily: refCode ? 'JetBrains Mono, monospace' : 'Archivo, sans-serif', letterSpacing: refCode ? 2 : 0 }}
            />
            {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ ...btnStyle, background: 'transparent', border: '1.5px solid #B5593C', color: '#F5F0EA' }}>
              {loading ? 'Creating account...' : 'Create account with email'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <span style={{ color: '#8A8680', fontSize: 13 }}>Already have an account? </span>
          <Link href="/auth/login" style={{ color: '#B5593C', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
        </div>
      </div>
    </div>
  )
}
export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  )
}

function TallyLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 44, height: 36 }}>
        {[6, 14, 22, 30].map((left, i) => (
          <div key={i} style={{ position: 'absolute', left, top: 4, width: 4, height: 28, background: '#F5F0EA', borderRadius: 2 }} />
        ))}
        <div style={{ position: 'absolute', top: 16, left: -2, width: 48, height: 3.5, background: '#B5593C', borderRadius: 2, transform: 'rotate(-30deg)' }} />
      </div>
      <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 22, fontWeight: 900, letterSpacing: 6, textTransform: 'uppercase', color: '#F5F0EA' }}>COUNT</span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '14px 16px',
  border: '1.5px solid #2E2C29',
  borderRadius: 10,
  fontSize: 15,
  fontFamily: 'Archivo, sans-serif',
  background: '#181714',
  color: '#F5F0EA',
  outline: 'none',
  width: '100%',
}

const btnStyle: React.CSSProperties = {
  padding: '15px',
  background: '#B5593C',
  color: '#F5F0EA',
  fontFamily: 'Archivo, sans-serif',
  fontSize: 15,
  fontWeight: 800,
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
}
