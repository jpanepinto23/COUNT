'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState(''
  const [password, setPassword] = useState('')
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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

    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      email,
      name,
      age: age ? parseInt(age) : null,
      height: height ? parseFloat(height) : null,
      weight: weight ? parseFloat(weight) : null,
      current_streak: 0,
      longest_streak: 0,
      lifetime_sessions: 0,
      tier: 'bronze',
      multiplier: 1.0,
      points_balance: 0,
      points_lifetime_earned: 0,
      free_unverified_remaining: 5,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
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
              {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
              <button
                onClick={() => {
                  if (!name || !email || password.length < 6) { setError('Please fill all fields (min 6 char password)'); return }
                  setError('')
                  setStep(2)
                }}
                style={btnStyle}
              >
                Continue →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <form onSubmit={handleSignup}>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, fontFamily: 'Archivo, sans-serif' }}>Your stats</h1>
            <p style={{ color: '#8A8478', fontSize: 15, marginBottom: 28 }}>Optional — used for your profile.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input type="number" placeholder="Age" value={age} onChange={e => setAge(e.target.value)} style={{ ...inputStyle, paddingRight: 36 }} />
                  <span style={unitStyle}>yr</span>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input type="number" placeholder="Height" value={height} onChange={e => setHeight(e.target.value)} style={{ ...inputStyle, paddingRight: 36 }} />
                  <span style={unitStyle}>ft</span>
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <input type="number" placeholder="Weight" value={weight} onChange={e => setWeight(e.target.value)} style={{ ...inputStyle, paddingRight: 36 }} />
                <span style={unitStyle}>lbs</span>
              </div>
              {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
              <button type="submit" disabled={loading} style={btnStyle}>
                {loading ? 'Creating account...' : 'Start Counting →'}
              </button>
              <button type="button" onClick={() => setStep(1)} style={{ ...btnStyle, background: 'transparent', color: '#8A8478', border: '1.5px solid #E0D9CE' }}>
                Back
              </button>
            </div>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <span style={{ color: '#8A8478', fontSize: 13 }}>Already have an account? </span>
          <Link href="/auth/login" style={{ color: '#B5593C', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
        </div>
      </div>
    </div>
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
