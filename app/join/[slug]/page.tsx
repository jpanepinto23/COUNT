'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const BG = '#0E0E0D'
const TEXT = '#F5F0EA'
const MUTED = '#8A8680'
const COPPER = '#B5593C'
const BORDER = 'rgba(245,240,234,0.10)'

interface Gym {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

function TallyLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 36, height: 28 }}>
        {[4, 10, 16, 22].map((left, i) => (
          <div key={i} style={{ position: 'absolute', left, top: 3, width: 3, height: 22, background: TEXT, borderRadius: 2 }} />
        ))}
        <div style={{ position: 'absolute', top: 11, left: -1, width: 38, height: 3, background: COPPER, borderRadius: 2, transform: 'rotate(-30deg)' }} />
      </div>
      <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 20, fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', color: TEXT }}>
        COUNT
      </span>
    </div>
  )
}

export default function JoinPage({ params }: { params: { slug: string } }) {
  const [gym, setGym] = useState<Gym | null>(null)
  const [notFound, setNotFound] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('gyms')
      .select('id, name, slug, logo_url')
      .eq('slug', params.slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); return }
        setGym(data as Gym)
      })
  }, [params.slug])

  if (notFound) {
    return (
      <div style={{ minHeight: '100dvh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, color: TEXT, fontFamily: 'Archivo, sans-serif' }}>
        <TallyLogo />
        <p style={{ color: MUTED, fontSize: 14, textAlign: 'center' }}>This gym link is no longer active.</p>
        <Link href="/" style={{ color: COPPER, fontSize: 14, textDecoration: 'none', fontWeight: 700 }}>Go to COUNT →</Link>
      </div>
    )
  }

  if (!gym) {
    return (
      <div style={{ minHeight: '100dvh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: `2px solid #2a2a29`, borderTopColor: COPPER, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const signupUrl = `/auth/signup?gym=${encodeURIComponent(gym.slug)}`

  return (
    <div style={{ minHeight: '100dvh', background: BG, display: 'flex', flexDirection: 'column', fontFamily: 'Archivo, sans-serif' }}>
      {/* Top bar */}
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TallyLogo />
        <Link href="/auth/login" style={{ fontSize: 13, fontWeight: 700, color: MUTED, textDecoration: 'none', border: `1px solid ${BORDER}`, padding: '8px 14px', borderRadius: 8 }}>
          Log in
        </Link>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: 0 }}>
        {/* Gym badge */}
        <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {gym.logo_url ? (
            <img
              src={gym.logo_url}
              alt={gym.name}
              style={{ width: 72, height: 72, borderRadius: 18, objectFit: 'contain', border: `1px solid ${BORDER}`, background: '#141413' }}
            />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 18, background: `rgba(181,89,60,0.12)`, border: `1.5px solid rgba(181,89,60,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 28, color: COPPER, fontWeight: 900 }}>{gym.name.charAt(0)}</span>
            </div>
          )}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(181,89,60,0.10)', border: `1px solid rgba(181,89,60,0.25)`, borderRadius: 20, padding: '5px 14px' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: COPPER }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: COPPER, letterSpacing: 0.5 }}>{gym.name}</span>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(28px, 8vw, 44px)', fontWeight: 900, color: TEXT, textAlign: 'center', lineHeight: 1.1, marginBottom: 14, maxWidth: 320 }}>
          Your workouts<br />
          should <span style={{ color: COPPER }}>pay you back.</span>
        </h1>
        <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.65, textAlign: 'center', maxWidth: 300, marginBottom: 36 }}>
          Connect Garmin or Strava, earn 250 coins per session, and redeem discounts on protein, pre-workout, and gear — completely free.
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 0, width: '100%', maxWidth: 340, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', marginBottom: 28 }}>
          {[
            { num: '$0',   label: 'to join' },
            { num: '250',  label: 'coins/sync' },
            { num: '6×',   label: 'max boost' },
          ].map(({ num, label }, i) => (
            <div key={label} style={{ flex: 1, textAlign: 'center', padding: '14px 8px', borderRight: i < 2 ? `1px solid ${BORDER}` : 'none' }}>
              <p style={{ fontSize: 20, fontWeight: 900, color: COPPER, marginBottom: 2 }}>{num}</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1.2 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href={signupUrl}
          style={{ display: 'block', width: '100%', maxWidth: 340, textAlign: 'center', padding: '17px 24px', background: COPPER, color: TEXT, textDecoration: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, letterSpacing: 0.3, marginBottom: 12, boxShadow: '0 4px 20px rgba(181,89,60,0.4)' }}
        >
          Join {gym.name} on COUNT →
        </Link>
        <p style={{ color: '#444', fontSize: 12, textAlign: 'center' }}>No subscription. Cancel any time.</p>
      </div>
    </div>
  )
}
