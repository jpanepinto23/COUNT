'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#FAF8F4' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 40, marginBottom: 16 }}>📬</p>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, fontFamily: 'Archivo, sans-serif' }}>Check your email</h2>
            <p style={{ color: '#8A8478', marginBottom: 24 }}>We sent a reset link to <strong>{email}</strong></p>
            <Link href="/auth/login" style={{ color: '#B5593C', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>← Back to login</Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, fontFamily: 'Archivo, sans-serif' }}>Reset Password</h1>
            <p style={{ color: '#8A8478', fontSize: 15, marginBottom: 28 }}>Enter your email and we&apos;ll send a reset link.</p>
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
              <button type="submit" disabled={loading} style={btnStyle}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Link href="/auth/login" style={{ color: '#8A8478', fontSize: 13, textDecoration: 'none' }}>← Back to login</Link>
            </div>
          </>
        )}
      </div>
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
