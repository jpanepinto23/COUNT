'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/home')
  }, [loading, user])

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F4' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #E0D9CE', borderTopColor: '#B5593C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (user) return null

  return (
    <div style={{ minHeight: '100dvh', background: '#FAF8F4', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px 32px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="8" width="4" height="16" rx="2" fill="#B5593C"/>
            <rect x="9" y="8" width="4" height="16" rx="2" fill="#B5593C"/>
            <rect x="16" y="8" width="4" height="16" rx="2" fill="#B5593C"/>
            <rect x="23" y="8" width="4" height="16" rx="2" fill="#B5593C" opacity="0.4"/>
          </svg>
          <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 26, fontWeight: 900, letterSpacing: 3, color: '#111110' }}>COUNT</span>
        </div>
        <h1 style={{ fontFamily: 'Archivo, sans-serif', fontSize: 36, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1, marginBottom: 16, color: '#111110', maxWidth: 320 }}>
          Every rep<br/>counts.
        </h1>
        <p style={{ color: '#8A8478', fontSize: 16, lineHeight: 1.5, maxWidth: 280, marginBottom: 48 }}>
          Log workouts, earn points, climb tiers. The more consistent you are, the more you earn.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 48 }}>
          {[
            { label: 'Bronze', color: '#B5593C', mult: '1x' },
            { label: 'Silver', color: '#6B7280', mult: '1.5x' },
            { label: 'Gold', color: '#D97706', mult: '2x' },
            { label: 'Platinum', color: '#7C3AED', mult: '3x' },
          ].map(t => (
            <div key={t.label} style={{ background: t.color + '18', border: `1.5px solid ${t.color}40`, borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 900, color: t.color }}>{t.mult}</div>
              <div style={{ fontSize: 9, color: t.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{t.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
          <Link href="/auth/signup" style={{ display: 'block', background: '#111110', color: '#F5F0EA', padding: '16px 24px', borderRadius: 12, fontSize: 15, fontWeight: 800, textDecoration: 'none', textAlign: 'center' }}>Start earning →</Link>
          <Link href="/auth/login" style={{ display: 'block', color: '#8A8478', padding: '14px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>Sign in</Link>
        </div>
      </div>
      <div style={{ padding: '16px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: '#C4BDB3' }}>Track consistently. Earn more. Make it count.</p>
      </div>
    </div>
  )
}
