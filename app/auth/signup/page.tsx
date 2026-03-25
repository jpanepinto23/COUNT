'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

// Generates a unique 6-char referral code (e.g. "JOE3X7")
function generateReferralCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X')
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 5)
  return prefix + suffix
}

function formatHeight(totalInches: number): string {
  const ft = Math.floor(totalInches / 12)
  const inches = totalInches % 12
  return `${ft}' ${inches}"`
}

function Stepper({ value, onChange, min, max, format, label }: {
  value: number; onChange: (v: number) => void; min: number; max: number;
  format: (v: number) => string; label: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#8A8478', fontFamily: 'Archivo, sans-serif' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E0D9CE', borderRadius: 12, overflow: 'hidden', width: '100%', background: '#FDFAF6' }}>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
          style={{ width: 48, height: 54, border: 'none', background: 'transparent', fontSize: 22, color: '#5C5346', borderRight: '1.5px solid #E0D9CE', cursor: 'pointer', flexShrink: 0 }}>&#8722;</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 800, color: '#2D2926', fontFamily: 'Archivo, sans-serif', padding: '0 4px' }}>
          {format(value)}
        </div>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
          style={{ width: 48, height: 54, border: 'none', background: 'transparent', fontSize: 22, color: '#5C5346', borderLeft: '1.5px solid #E0D9CE', cursor: 'pointer', flexShrink: 0 }}>+</button>
      </div>
    </div>
  )
}


function SignupContent() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [age, setAge] = useState(25)
  const [heightInches, setHeightInches] = useState(70)
  const [weight, setWeight] = useState('')
  const [refCode, setRefCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Pre-fill referral code from URL ?ref=CODE
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) setRefCode(ref.toUpperCase())
  }, [searchParams])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Signup failed')
      setLoading(false)
      return
    }

    const userId = data.user.id
    const myReferralCode = generateReferralCode(name)

    // Look up referrer by code (if provided)
    let referrerId: string | null = null
    if (refCode.trim()) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', refCode.trim().toUpperCase())
        .single()
      if (referrer) referrerId = referrer.id
    }

    const { error: profileError } = await supabase.from('users').insert({
      id: userId,
      email,
      name,
      age: age,
      height: heightInches,
      weight: weight ? parseFloat(weight) : null,
      current_streak: 0,
      longest_streak: 0,
      lifetime_sessions: 0,
      tier: 'bronze',
      multiplier: 1.0,
      points_balance: 0,
      points_lifetime_earned: 0,
      free_unverified_remaining: 5,
      referral_code: myReferralCode,
      referred_by: referrerId,
      referral_bonus_claimed: false,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    // Log the referral relationship so the referrer can track it
    if (referrerId) {
      await supabase.from('referrals').insert({
        referrer_id: referrerId,
        referred_id: userId,
        bonus_points: 500,
        bonus_awarded: false,
      })
    }

    router.replace('/home')
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#FAF8F4' }}>
      <div style={{ marginBottom: 36 }}>
        <TallyLogo />
      </div>

      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[1, 2].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? '#B5593C' : '#E0D9CE' }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, fontFamily: 'Archivo, sans-serif' }}>Create account</h1>
            <p style={{ color: '#8A8478', fontSize: 15, marginBottom: 28 }}>Every rep counts. Start earning today.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
              <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />

              {/* Referral code field */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Referral code (optional)"
                  value={refCode}
                  onChange={e => setRefCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  style={{ ...inputStyle, paddingRight: refCode ? 90 : 16, fontFamily: refCode ? 'JetBrains Mono, monospace' : 'Archivo, sans-serif', letterSpacing: refCode ? 2 : 0 }}
                />
                {refCode && (
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#22c55e', fontWeight: 700 }}>
                    +500 pts Ã°ÂÂÂ
                  </span>
                )}
              </div>

              {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
              <button
                onClick={() => {
                  if (!name || !email || password.length < 6) { setError('Please fill all fields (min 6 char password)'); return }
                  setError('')
                  setStep(2)
                }}
                style={btnStyle}
              >
                Continue Ã¢ÂÂ
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <form onSubmit={handleSignup}>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, fontFamily: 'Archivo, sans-serif' }}>Your stats</h1>
            <p style={{ color: '#8A8478', fontSize: 15, marginBottom: 28 }}>Optional Ã¢ÂÂ used for your profile.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <Stepper value={age} onChange={setAge} min={13} max={100} format={v => `${v} yr`} label="Age" />
                <Stepper value={heightInches} onChange={setHeightInches} min={48} max={95} format={formatHeight} label="Height" />
              </div>
              <div style={{ position: 'relative' }}>
                <input type="number" placeholder="Weight" value={weight} onChange={e => setWeight(e.target.value)} style={{ ...inputStyle, paddingRight: 36 }} />
                <span style={unitStyle}>lbs</span>
              </div>
              {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
              <button type="submit" disabled={loading} style={btnStyle}>
                {loading ? 'Creating account...' : 'Start Counting Ã¢ÂÂ'}
              </button>
              <button type="button" onClick={() => setStep(1)} style={{ ...btnStyle, background: 'transparent', color: '#8A8478', border: '1.5px solid #E0D9CE' }}>
                Back
              </button>
            </div>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <span style={{ color: '#8A8478', fontSize: 13 }}>Already have an account? </span>
          <Link href="/auth/login" style={{ color: '#B5593C', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Sign in Ã¢ÂÂ</Link>
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
          <div key={i} style={{ position: 'absolute', left, top: 4, width: 4, height: 28, background: '#111110', borderRadius: 2 }} />
        ))}
        <div style={{ position: 'absolute', top: 16, left: -2, width: 48, height: 3.5, background: '#B5593C', borderRadius: 2, transform: 'rotate(-30deg)' }} />
      </div>
      <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 22, fontWeight: 900, letterSpacing: 6, textTransform: 'uppercase', color: '#111110' }}>COUNT</span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '14px 16px',
  border: '1.5px solid #E0D9CE',
  borderRadius: 10,
  fontSize: 15,
  fontFamily: 'Archivo, sans-serif',
  background: '#fff',
  color: '#111110',
  outline: 'none',
  width: '100%',
}

const btnStyle: React.CSSProperties = {
  padding: '15px',
  background: '#111110',
  color: '#F5F0EA',
  fontFamily: 'Archivo, sans-serif',
  fontSize: 15,
  fontWeight: 800,
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
}

const unitStyle: React.CSSProperties = {
  position: 'absolute',
  right: 14,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#8A8478',
  fontSize: 12,
  fontFamily: 'JetBrains Mono, monospace',
  fontWeight: 600,
  pointerEvents: 'none',
}
