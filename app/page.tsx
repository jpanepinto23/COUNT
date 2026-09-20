'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)

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

      {/* Menu */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }}>
          <nav onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, maxWidth: '85vw', background: '#171716', borderRight: `1px solid ${LINE}`, padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Tally size={0.5} /><span style={{ fontFamily: SANS, fontWeight: 900, letterSpacing: '0.18em', fontSize: 14 }}>COUNT</span></div>
              <button aria-label="Close" onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', color: MUTED, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>&times;</button>
            </div>
            {[
              ['How it works', '#how'],
              ['What\u2019s in the store', '#store'],
              ['About', '#about'],
              ['Request a brand', 'mailto:joe@countfitness.app?subject=Brand%20request%20for%20COUNT'],
            ].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{ color: INK, textDecoration: 'none', fontFamily: SANS, fontSize: 18, fontWeight: 700, padding: '14px 0', borderBottom: `1px solid ${LINE}` }}>{label}</a>
            ))}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/auth/signup" style={{ textAlign: 'center', padding: '14px', background: COPPER, color: INK, textDecoration: 'none', borderRadius: 10, fontFamily: SANS, fontWeight: 800 }}>Sign up</Link>
              <Link href="/auth/login" style={{ textAlign: 'center', padding: '14px', background: 'transparent', color: INK, textDecoration: 'none', borderRadius: 10, fontFamily: SANS, fontWeight: 700, border: `1px solid ${LINE}` }}>Log in</Link>
            </div>
          </nav>
        </div>
      )}

      {/* Full-bleed photo hero */}
      <div style={{ position: 'relative', overflow: 'hidden', background: '#0E0D0C', height: '72vw', minHeight: 420, maxHeight: 620 }}>
        <img src="/photos/hero.jpg" alt="" width={1374} height={768} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 60%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,8,7,0.55)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom, transparent, #111110)' }} />

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
          <button aria-label="Menu" onClick={() => setMenuOpen(true)} style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '9px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[0, 1, 2].map(i => <span key={i} style={{ display: 'block', width: 18, height: 2, background: INK, borderRadius: 1 }} />)}
          </button>
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
            COUNT turns workouts into rewards.
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

        {/* Pitch, with the balance screen beside it */}
        <div style={{ padding: '28px 0 36px', display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <h1 style={{ fontFamily: SANS, fontSize: 'clamp(30px, 7vw, 40px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -0.5, marginBottom: 16 }}>
              Cashing in sweat equity.
            </h1>
            <p style={{ color: MUTED, fontSize: 17, lineHeight: 1.6, maxWidth: 480 }}>
              Log a workout or sync one from Strava. Every session earns coins. Three sessions gets you 30% off at NOBULL. Six gets you a tub of Momentous creatine, shipped, free. No card. No subscription. The brands pay, not you.
            </p>
          </div>
          <img src="/shots/balance.jpg" alt="COUNT balance screen showing coins earned" width={640} height={1169} style={{ flex: '0 0 auto', width: 180, height: 'auto', margin: '0 auto', boxShadow: '0 18px 50px rgba(0,0,0,0.55)', borderRadius: 22 }} />
        </div>

        {/* How it works */}
        <div id="how" style={{ borderTop: `1px solid ${LINE}`, padding: '32px 0' }}>
          <h2 style={{ fontFamily: SANS, fontSize: 22, fontWeight: 900, marginBottom: 18 }}>How it works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
            {[
              ['1', 'Log or sync a workout', 'Tap it in, or connect Strava and it verifies itself.'],
              ['2', 'Earn coins', '200 a session. Streaks and tiers multiply it.'],
              ['3', 'Redeem with the brands', 'Discount codes after three workouts. Free product after more.'],
            ].map(([n, t, d]) => (
              <div key={n} style={{ padding: '16px', background: '#171716', border: `1px solid ${LINE}`, borderRadius: 14 }}>
                <p style={{ fontFamily: MONO, fontSize: 12, color: COPPER, marginBottom: 8 }}>{n}</p>
                <p style={{ fontFamily: SANS, fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{t}</p>
                <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.5 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* The app */}
        <div style={{ borderTop: `1px solid ${LINE}`, padding: '32px 0 8px' }}>
          <h2 style={{ fontFamily: SANS, fontSize: 22, fontWeight: 900, marginBottom: 6 }}>This is the app</h2>
          <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.5, marginBottom: 20 }}>Runs in your browser. Add it to your home screen and it works like any other app.</p>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
            {[
              ['/shots/home.jpg', 'Today screen: coins, streak, log a workout'],
              ['/shots/store.jpg', 'Rewards store: NOBULL, Momentous, Thorne, Trifecta'],
              ['/shots/nobull.jpg', 'Redeeming 30% off at NOBULL'],
            ].map(([src, alt]) => (
              <img key={src} src={src} alt={alt} width={640} height={1169} style={{ flex: '0 0 auto', width: 'calc(50% - 6px)', maxWidth: 220, height: 'auto', borderRadius: 22, boxShadow: '0 12px 36px rgba(0,0,0,0.5)', scrollSnapAlign: 'start' }} />
            ))}
          </div>
        </div>

        {/* Store */}
        <div id="store" style={{ borderTop: `1px solid ${LINE}`, padding: '32px 0' }}>
          <h2 style={{ fontFamily: SANS, fontSize: 22, fontWeight: 900, marginBottom: 14 }}>What&rsquo;s in the store</h2>
          <div>
            {REWARDS.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${LINE}` }}>
                <img src={r.logo} alt={r.brand} style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
                <p style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.4 }}>
                  <span style={{ fontFamily: SANS, fontWeight: 800 }}>{r.brand}</span>
                  <span style={{ color: MUTED }}> {r.what}</span>
                </p>
                <p style={{ fontFamily: MONO, fontSize: 13, color: COPPER, flexShrink: 0, textAlign: 'right' }}>
                  {r.coins.toLocaleString()}<span style={{ color: MUTED }}> / {r.note}</span>
                </p>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: MONO, fontSize: 12, color: MUTED, marginTop: 14 }}>Prices in coins. A logged workout is 200, a Strava-synced one is 250. Streaks and tiers multiply from there.</p>
        </div>

        {/* Reviews */}
        <div style={{ borderTop: `1px solid ${LINE}`, padding: '32px 0 8px' }}>
          <h2 style={{ fontFamily: SANS, fontSize: 22, fontWeight: 900, marginBottom: 18 }}>From people using it</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['Erin', 'Trifecta', 'As a mom on the go, it\u2019s easy for workouts to get pushed down the list. I used COUNT for the Trifecta rewards and liked having an extra reason to stay consistent. I was already working out, so being able to earn rewards for it was a nice bonus.'],
              ['Lisa', 'NOBULL', 'I\u2019m a coach, so I\u2019m pretty particular about the workout apparel I buy. NOBULL is a brand I trust, and earning high value workout apparel through COUNT made it even better. I like that I can earn rewards for workouts I\u2019m already doing.'],
              ['Joe, founder', 'Thorne', 'I\u2019ve been using COUNT for the Thorne rewards. I like that I can earn rewards just by doing the workouts I\u2019m already doing. It gives me a little extra motivation to stay consistent, and getting something in the mail after earning enough coins is pretty cool.'],
            ].map(([who, brand, quote]) => (
              <div key={who} style={{ padding: '18px', background: '#171716', border: `1px solid ${LINE}`, borderRadius: 14 }}>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: INK, marginBottom: 12 }}>{quote}</p>
                <p style={{ fontFamily: MONO, fontSize: 12, color: MUTED }}><span style={{ color: COPPER }}>{who}</span> &middot; redeemed {brand}</p>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div id="about" style={{ padding: '36px 0 8px' }}>
          <h2 style={{ fontFamily: SANS, fontSize: 22, fontWeight: 900, marginBottom: 14 }}>About COUNT</h2>
          <div style={{ color: MUTED, fontSize: 16, lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p>I&rsquo;ve trained consistently for over fifteen years. Somewhere in year twelve I started wondering why the only thing my workouts earned me was the workout.</p>
            <p>The real reward is the obvious one: a healthier life, the body you&rsquo;re working toward. But along the way, why not cash in sweat equity for the supplements, the shoes and the food you were going to buy anyway?</p>
            <p>COUNT was officially established in early 2026. The dedication behind it goes back almost two decades.</p>
            <p style={{ color: INK, fontWeight: 700 }}>Wherever you are on your fitness journey, join today and make it count.</p>
          </div>
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
