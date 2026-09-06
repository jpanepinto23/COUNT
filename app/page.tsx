'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const SANS = 'Archivo, sans-serif'
const MONO = 'JetBrains Mono, monospace'
const COPPER = '#B5593C'
const INK = '#F5F0EA'
const MUTED = '#9A9087'
const LINE = '#222220'

/* Live rewards. Keep in sync with the rewards table. */
const REWARDS = [
  { brand: 'NOBULL',    what: '30% off shoes and gear',           coins: 600,  note: '3 workouts',  logo: 'https://cdn.brandfetch.io/nobullproject.com/w/256/h/256' },
  { brand: 'Momentous', what: 'Creatine, free, shipped to you',   coins: 1500, note: '6 workouts',  logo: 'https://cdn.brandfetch.io/livemomentous.com/w/256/h/256' },
  { brand: 'Momentous', what: 'Essential Protein, free, shipped', coins: 2500, note: '10 workouts', logo: 'https://cdn.brandfetch.io/livemomentous.com/w/256/h/256' },
  { brand: 'Trifecta',  what: '50% off first meal order',         coins: 500,  note: '2 workouts',  logo: 'https://cdn.brandfetch.io/trifectanutrition.com/w/256/h/256' },
  { brand: 'Momentous', what: '20% off supplements',              coins: 600,  note: '3 workouts',  logo: 'https://cdn.brandfetch.io/livemomentous.com/w/256/h/256' },
  { brand: 'Thorne',    what: '15% off supplements',              coins: 600,  note: '3 workouts',  logo: 'https://cdn.brandfetch.io/thorne.com/w/256/h/256' },
]

function Tally({ size = 1 }: { size?: number }) {
  return (
    <div style={{ position: 'relative', width: 57 * size, height: 44 * size }}>
      {[0, 13, 26, 39].map(left => (
        <div key={left} style={{ position: 'absolute', top: 0, width: 5 * size, height: 44 * size, background: INK, borderRadius: 3, left: left * size }} />
      ))}
      <div style={{ position: 'absolute', top: 14 * size, left: -2 * size, width: 52 * size, height: 4 * size, background: COPPER, borderRadius: 2, transform: 'rotate(-30deg)' }} />
    </div>
  )
}

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/home')
  }, [loading, user, router])

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111110' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #2a2a29', borderTopColor: COPPER, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (user) return null

  const cta = (
    <Link href="/auth/signup" style={{ display: 'inline-block', padding: '16px 36px', background: COPPER, color: INK, textDecoration: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, fontFamily: SANS, letterSpacing: 0.3, boxShadow: '0 4px 20px rgba(181,89,60,0.45)' }}>
      Start earning &rarr;
    </Link>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#111110', color: INK }}>

      {/* Full-bleed video hero */}
      <div style={{ position: 'relative', overflow: 'hidden', background: '#0E0D0C', height: '72vw', minHeight: 420, maxHeight: 620 }}>
        <video src="/hero.mp4" autoPlay muted loop playsInline preload="auto" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,8,7,0.5)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom, transparent, #111110)' }} />

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/auth/login" style={{ color: INK, fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: SANS, background: 'rgba(0,0,0,0.45)', padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)' }}>
            Log in
          </Link>
        </div>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center' }}>
          <Tally />
          <span style={{ fontFamily: SANS, fontSize: 'clamp(52px, 12vw, 96px)', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', lineHeight: 1, textShadow: '0 2px 24px rgba(0,0,0,0.6)', margin: '14px 0 12px' }}>
            COUNT
          </span>
          <p style={{ fontFamily: SANS, fontSize: 'clamp(17px, 3.2vw, 22px)', fontWeight: 600, color: INK, opacity: 0.9, marginBottom: 26, textShadow: '0 1px 12px rgba(0,0,0,0.6)' }}>
            Strava claps for you. COUNT pays you.
          </p>
          {cta}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[['Strava', 'https://cdn.brandfetch.io/strava.com/w/256/h/256']].map(([name, logo]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10, padding: '8px 14px' }}>
                <img src={logo} alt={name} style={{ width: 20, height: 20, borderRadius: 5, objectFit: 'contain' }} />
                <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700 }}>{name}</span>
              </div>
            ))}
            <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(245,240,234,0.8)' }}>syncs and verifies</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '8px 24px 56px' }}>

        {/* Pitch */}
        <div style={{ padding: '28px 0 36px' }}>
          <h1 style={{ fontFamily: SANS, fontSize: 'clamp(30px, 7vw, 40px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -0.5, marginBottom: 16 }}>
            Your workouts should pay you back.
          </h1>
          <p style={{ color: MUTED, fontSize: 17, lineHeight: 1.6, maxWidth: 480 }}>
            Log a workout or sync one from Strava. Every session earns coins. Three sessions gets you 30% off at NOBULL. Six gets you a tub of Momentous creatine, shipped, free. No card. No subscription. The brands pay, not you.
          </p>
        </div>

        {/* Store */}
        <div style={{ borderTop: `1px solid ${LINE}`, padding: '32px 0' }}>
          <h2 style={{ fontFamily: SANS, fontSize: 22, fontWeight: 900, marginBottom: 18 }}>What&rsquo;s in the store</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {REWARDS.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: '#171716', border: `1px solid ${LINE}`, borderRadius: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: '#0E0E0D', border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src={r.logo} alt={r.brand} style={{ width: '62%', height: '62%', objectFit: 'contain', borderRadius: 4 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{r.brand}</p>
                  <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.4 }}>{r.what}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: COPPER }}>{r.coins.toLocaleString()}</p>
                  <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{r.note}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: MONO, fontSize: 12, color: MUTED, marginTop: 14 }}>Prices in coins. A logged workout is 200, a Strava-synced one is 250. Streaks and tiers multiply from there.</p>
        </div>

        {/* Final CTA */}
        <div style={{ borderTop: `1px solid ${LINE}`, padding: '36px 0 20px', textAlign: 'center' }}>
          <p style={{ fontFamily: SANS, fontSize: 24, fontWeight: 900, lineHeight: 1.2, marginBottom: 18 }}>
            Your next workout is worth 200 coins.
          </p>
          {cta}
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 24, marginTop: 28, display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          <a href="https://instagram.com/countfitness.app" target="_blank" rel="noopener" style={{ color: MUTED, fontSize: 12, textDecoration: 'none', fontFamily: MONO }}>Instagram</a>
          <a href="/terms" style={{ color: MUTED, fontSize: 12, textDecoration: 'none', fontFamily: MONO }}>Terms</a>
          <a href="/privacy" style={{ color: MUTED, fontSize: 12, textDecoration: 'none', fontFamily: MONO }}>Privacy</a>
          <span style={{ fontSize: 12, color: '#3A3A38', fontFamily: MONO }}>&copy; {new Date().getFullYear()} COUNT</span>
        </div>

      </div>
    </div>
  )
}
