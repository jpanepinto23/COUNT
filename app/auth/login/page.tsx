'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.replace('/home')
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#FAF8F4' }}>
      {/* Logo */}
      <div style={{ marginBottom: 40 }}>
        <TallyLogo />
      </div>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, fontFamily: 'Archivo, sans-serif', color: '#111110' }}>Welcome back</h1>
        <p style={{ color: '#8A8478', fontSize: 15, marginBottom: 28 }}>Sign in to keep your streak alive.</p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link href="/auth/forgot-password" style={{ color: '#8A8478', fontSize: 13, textDecoration: 'none' }}>Forgot password?</Link>
        </div>
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <span style={{ color: '#8A8478', fontSize: 13 }}>No account? </span>
          <Link href="/auth/signup" style={{ color: '#B5593C', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Create one →</Link>
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
  letterSpacing: 0.5,
}
