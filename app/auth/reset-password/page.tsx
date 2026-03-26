'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function ResetPasswordForm() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [ready, setReady]         = useState(false)
  const router                    = useRouter()
  const searchParams              = useSearchParams()
  const supabase                  = createClient()

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      // PKCE flow — Supabase emails a link with ?code=... that must be exchanged first
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError('This reset link is invalid or has already been used. Please request a new one.')
        } else {
          setReady(true)
        }
      })
    } else {
      // Fallback: implicit / hash-based flow
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') setReady(true)
      })
      return () => subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm)  { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false) }
    else       { setDone(true); setTimeout(() => router.replace('/home'), 2000) }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#FAF8F4' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <TallyLogo />
        <div style={{ marginTop: 36 }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 40, marginBottom: 16 }}>✅</p>
              <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, fontFamily: 'Archivo, sans-serif' }}>Password updated!</h2>
              <p style={{ color: '#8A8478', fontSize: 14 }}>Taking you to the app...</p>
            </div>
          ) : error && !ready ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 40, marginBottom: 16 }}>⚠️</p>
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8, fontFamily: 'Archivo, sans-serif' }}>Link expired</h2>
              <p style={{ color: '#8A8478', fontSize: 14, marginBottom: 24 }}>{error}</p>
              <a href="/auth/forgot-password" style={{ color: '#B5593C', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Request a new link →</a>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#8A8478', fontSize: 15 }}>Verifying reset link…</p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, fontFamily: 'Archivo, sans-serif' }}>New Password</h1>
              <p style={{ color: '#8A8478', fontSize: 15, marginBottom: 28 }}>Choose a new password for your account.</p>
              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input type="password" placeholder="New password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
                <input type="password" placeholder="Confirm new password"        value={confirm}  onChange={e => setConfirm(e.target.value)}  required style={inputStyle} />
                {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
                <button type="submit" disabled={loading} style={btnStyle}>
                  {loading ? 'Updating…' : 'Set New Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#FAF8F4' }} />}>
      <ResetPasswordForm />
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
  padding: '14px 16px', border: '1.5px solid #E0D9CE', borderRadius: 10,
  fontSize: 15, fontFamily: 'Archivo, sans-serif', background: '#fff',
  color: '#111110', outline: 'none', width: '100%',
}
const btnStyle: React.CSSProperties = {
  padding: '15px', background: '#111110', color: '#F5F0EA',
  fontFamily: 'Archivo, sans-serif', fontSize: 15, fontWeight: 800,
  border: 'none', borderRadius: 10, cursor: 'pointer',
}
