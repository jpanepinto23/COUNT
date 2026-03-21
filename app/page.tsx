'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const HERO_PHOTO = 'https://images.pexels.com/photos/2261481/pexels-photo-2261481.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
const STRIP_PHOTOS = [
  { id: '3916766', label: 'Lift' },
  { id: '4164515', label: 'Grind' },
  { id: '6389886', label: 'Push' },
]
const TIERS = [
  { tier: 'Bronze', mult: '1x', sessions: 'Start here', color: '#CD7F32' },
  { tier: 'Silver', mult: '1.5x', sessions: '30 sessions', color: '#A8A9AD' },
  { tier: 'Gold', mult: '2x', sessions: '100 sessions', color: '#FFD700' },
  { tier: 'Platinum', mult: '3x', sessions: '500 sessions', color: '#E5E4E2' },
]

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/home')
  }, [loading, user])

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111110' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #2a2a29', borderTopColor: '#B5593C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (user) return null

  return (
    <div style={{ minHeight: '100dvh', background: '#111110', display: 'flex', flexDirection: 'column' }}>

      {/* Hero */}
      <div style={{ position: 'relative', minHeight: '72dvh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
        <img
          src={HERO_PHOTO}
          alt="Athlete training"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(17,17,16,0.25) 0%, rgba(17,17,16,0.7) 55%, #111110 100%)' }} />

        <div style={{ position: 'relative', padding: '0 24px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ position: 'relative', width: 36, height: 30 }}>
              {[5, 12, 19, 26].map((left, i) => (
                <div key={i} style={{ position: 'absolute', left, top: 3, width: 3.5, height: 24, background: '#F5F0EA', borderRadius: 2 }} />
              ))}
              <div style={{ position: 'absolute', top: 13, left: -2, width: 40, height: 3, background: '#B5593C', borderRadius: 2, transform: 'rotate(-30deg)' }} />
            </div>
            <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 18, fontWeight: 900, letterSpacing: 6, textTransform: 'uppercase', color: '#F5F0EA' }}>COUNT</span>
          </div>

          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.5, color: '#F5F0EA', fontFamily: 'Archivo, sans-serif', lineHeight: 1.05, marginBottom: 14 }}>
            Every rep<br />earns you more.
          </h1>
          <p style={{ color: '#C4BDB3', fontSize: 15, lineHeight: 1.6, marginBottom: 32, maxWidth: 320 }}>
            Log workouts. Earn points. Move up tiers.<br />Get rewarded for actually showing up.
          </p>

          <Link href="/auth/signup" style={{ display: 'block', textAlign: 'center', padding: '16px 24px', background: '#B5593C', color: '#F5F0EA', textDecoration: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, fontFamily: 'Archivo, sans-serif', marginBottom: 12 }}>
            Start earning free →
          </Link>
          <Link href="/auth/login" style={{ display: 'block', textAlign: 'center', padding: '14px 24px', background: 'rgba(255,255,255,0.06)', color: '#C4BDB3', textDecoration: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, border: '1px solid #2a2a29' }}>
            Sign in
          </Link>
        </div>
      </div>

      {/* Photo strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, margin: '2px 0 32px' }}>
        {STRIP_PHOTOS.map(({ id, label }) => (
          <div key={id} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}>
            <img
              src={`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400&dpr=1`}
              alt={label}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,17,16,0.35)' }} />
            <span style={{ position: 'absolute', bottom: 10, left: 12, color: '#F5F0EA', fontSize: 12, fontWeight: 800, fontFamily: 'Archivo, sans-serif', letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Tier preview */}
      <div style={{ padding: '0 20px 48px' }}>
        <p style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14, fontFamily: 'JetBrains Mono, monospace' }}>The more you show up</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {TIERS.map(t => (
            <div key={t.tier} style={{ background: '#1A1A19', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 10, color: '#555', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>{t.sessions}</p>
              <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 15, fontWeight: 800, color: t.color, marginBottom: 2 }}>{t.tier}</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 900, color: '#F5F0EA', lineHeight: 1 }}>{t.mult}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 24px 32px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: '#333', fontFamily: 'JetBrains Mono, monospace' }}>Track consistently. Earn more. Make it count.</p>
      </div>

    </div>
  )
}
