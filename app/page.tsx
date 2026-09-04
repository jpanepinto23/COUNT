'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import TallyLogo from '@/components/TallyLogo'

const SANS = 'Archivo, sans-serif'
const MONO = 'JetBrains Mono, monospace'
const COPPER = '#B5593C'
const INK = '#F5F0EA'
const MUTED = '#9A9087'
const DIM = '#5E5A54'
const LINE = '#1E1E1D'

/* Live rewards, priced in coins. Keep this in sync with the rewards table. */
const REWARDS = [
  { brand: 'NOBULL',    what: '30% off shoes and gear',            coins: 600,  note: '3 workouts' },
  { brand: 'Momentous', what: '20% off supplements',               coins: 600,  note: '3 workouts' },
  { brand: 'Thorne',    what: '15% off supplements',               coins: 600,  note: '3 workouts' },
  { brand: 'Trifecta',  what: '50% off first meal order, 10% after', coins: 500,  note: '2 to 3 workouts' },
  { brand: 'Momentous', what: 'Creatine Monohydrate, free, shipped', coins: 1500, note: 'about 6 verified workouts' },
  { brand: 'Momentous', what: 'Essential Protein, free, shipped',  coins: 2500, note: 'about 10 verified workouts' },
]

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
    <Link href="/auth/signup" style={{ display: 'inline-block', padding: '16px 32px', background: COPPER, color: INK, textDecoration: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, fontFamily: SANS, letterSpacing: 0.3 }}>
      Start earning &rarr;
    </Link>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#111110', color: INK }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px 56px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 0' }}>
          <TallyLogo size={0.6} />
          <Link href="/auth/login" style={{ color: MUTED, fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: SANS, padding: '8px 14px', borderRadius: 8, border: `1px solid ${LINE}` }}>
            Log in
          </Link>
        </div>

        {/* Hero */}
        <div style={{ padding: '40px 0 36px' }}>
          <h1 style={{ fontFamily: SANS, fontSize: 'clamp(34px, 8vw, 46px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -0.5, marginBottom: 18 }}>
            Strava claps for you.<br />
            <span style={{ color: COPPER }}>COUNT pays you.</span>
          </h1>
          <p style={{ color: MUTED, fontSize: 17, lineHeight: 1.6, marginBottom: 28, maxWidth: 460 }}>
            Log a workout, or sync one from Strava or Garmin. Every session earns coins. Three sessions gets you a discount code from NOBULL, Momentous, or Thorne. Keep going and the creatine is free.
          </p>
          {cta}
          <p style={{ fontFamily: MONO, fontSize: 12, color: DIM, marginTop: 14, letterSpacing: 0.3 }}>
            Free. No card. Signup takes about 30 seconds.
          </p>
        </div>

        {/* What you can get */}
        <div style={{ borderTop: `1px solid ${LINE}`, padding: '36px 0' }}>
          <p style={{ fontFamily: MONO, fontSize: 11, color: DIM, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>In the store right now</p>
          <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            These are the actual rewards, at the actual prices. Nothing on this list is &ldquo;coming soon.&rdquo;
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {REWARDS.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, padding: '13px 0', borderTop: i === 0 ? 'none' : `1px solid ${LINE}` }}>
                <div>
                  <p style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{r.brand}</p>
                  <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.4 }}>{r.what}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: COPPER }}>{r.coins.toLocaleString()} coins</p>
                  <p style={{ fontFamily: MONO, fontSize: 11, color: DIM }}>{r.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How coins work */}
        <div style={{ borderTop: `1px solid ${LINE}`, padding: '36px 0' }}>
          <p style={{ fontFamily: MONO, fontSize: 11, color: DIM, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>How the coins work</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, color: MUTED, fontSize: 15, lineHeight: 1.6 }}>
            <p><span style={{ color: INK, fontWeight: 700 }}>200 coins per workout.</span> 250 if it came from Strava or Garmin, since we can verify it. One workout a day counts.</p>
            <p><span style={{ color: INK, fontWeight: 700 }}>Streaks and tiers multiply.</span> Three days in a row is 1.2x, fourteen is 2x. Log 30 sessions total and you move up a tier for good, up to 3x.</p>
            <p><span style={{ color: INK, fontWeight: 700 }}>Coins never expire.</span> Spend them on a code at 600 or hold out for the protein.</p>
            <p><span style={{ color: INK, fontWeight: 700 }}>You never pay.</span> The brands pay a commission when you redeem. That is the whole business.</p>
          </div>
        </div>

        {/* Founder note */}
        <div style={{ borderTop: `1px solid ${LINE}`, padding: '36px 0' }}>
          <p style={{ fontFamily: MONO, fontSize: 11, color: DIM, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>From the person who built it</p>
          <div style={{ color: MUTED, fontSize: 15, lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p>
              I&rsquo;m Joe. I work in finance, live in New Jersey, and train early, before the house is up. I already buy creatine and running shoes from these brands, and the only thing my other apps give me for showing up is a badge. So I built the thing I wanted.
            </p>
            <p>
              COUNT is new and small. I answer every email myself, usually the same day. If the coin math feels off or something breaks, tell me:{' '}
              <a href="mailto:joseph.s.panepinto@countfitness.app" style={{ color: COPPER, textDecoration: 'none', fontWeight: 700 }}>joseph.s.panepinto@countfitness.app</a>
            </p>
          </div>
        </div>

        {/* Final CTA */}
        <div style={{ borderTop: `1px solid ${LINE}`, padding: '40px 0 24px' }}>
          <p style={{ fontFamily: SANS, fontSize: 24, fontWeight: 900, lineHeight: 1.2, marginBottom: 18 }}>
            Your next workout is worth 200 coins.
          </p>
          {cta}
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 24, marginTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 18 }}>
            <a href="https://instagram.com/make.it.count.app" target="_blank" rel="noopener" style={{ color: DIM, fontSize: 12, textDecoration: 'none', fontFamily: MONO }}>Instagram</a>
            <a href="/terms" style={{ color: DIM, fontSize: 12, textDecoration: 'none', fontFamily: MONO }}>Terms</a>
            <a href="/privacy" style={{ color: DIM, fontSize: 12, textDecoration: 'none', fontFamily: MONO }}>Privacy</a>
          </div>
          <p style={{ fontSize: 12, color: '#3A3A38', fontFamily: MONO }}>&copy; {new Date().getFullYear()} COUNT</p>
        </div>

      </div>
    </div>
  )
}
