'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'how', label: 'How It Works' },
  { id: 'partners', label: 'Partners' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'tiers', label: 'Tiers' },
  { id: 'compare', label: 'Compare' },
  { id: 'faq', label: 'FAQ' },
]

const TIERS = [
  { tier: 'Bronze',   mult: '1x',   sessions: 'Start here',   color: '#CD7F32' },
  { tier: 'Silver',   mult: '1.5x', sessions: '30 sessions',  color: '#A8A9AD' },
  { tier: 'Gold',     mult: '2x',   sessions: '60 sessions',  color: '#FFD700' },
  { tier: 'Platinum', mult: '3x',   sessions: '120 sessions', color: '#E5E4E2' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Log Your Workout', desc: 'Open COUNT after your session. Tap to confirm. Takes 30 seconds.' },
  { step: '02', title: 'Earn Points',      desc: 'Every session earns 200 base points. Move up tiers for up to 3x and build streaks for up to 2x — they stack.' },
  { step: '03', title: 'Redeem Rewards',   desc: 'Real protein, pre-workout, and gear from brands you already buy. Free.' },
]

const REWARD_CATALOG = [
  { name: 'Thorne',            status: 'live',        note: 'Available now',  color: '#1A7A4C', logo: 'https://cdn.brandfetch.io/thorne.com/w/256/h/256' },
  { name: 'Momentous',         status: 'live',        note: 'Available now',  color: '#1E3A5F', logo: 'https://cdn.brandfetch.io/livemomentous.com/w/256/h/256' },
  { name: 'Vuori',             status: 'coming_soon', note: 'In talks',       color: '#4A7C59', logo: 'https://cdn.brandfetch.io/vuoriclothing.com/w/256/h/256' },
  { name: 'NOBULL',            status: 'live',        note: 'Available now',  color: '#1A1A19', logo: '/nobull-logo-square.png' },
  { name: 'Transparent Labs',  status: 'coming_soon', note: 'In talks',       color: '#3B82F6', logo: 'https://cdn.brandfetch.io/transparentlabs.com/w/256/h/256' },
  { name: 'AG1',               status: 'coming_soon', note: 'In talks',       color: '#1B5E20', logo: 'https://cdn.brandfetch.io/drinkag1.com/w/256/h/256' },
]

const INTEGRATIONS = [
  { name: 'Strava',       color: '#FC4C02', logo: 'https://cdn.brandfetch.io/strava.com/w/256/h/256' },
  { name: 'Apple Health', color: '#FF2D55', logo: 'https://cdn.brandfetch.io/apple.com/w/256/h/256' },
  { name: 'Google Fit',   color: '#34A853', logo: 'https://cdn.brandfetch.io/google.com/w/256/h/256' },
  { name: 'Garmin',       color: '#007CC3', logo: 'https://cdn.brandfetch.io/garmin.com/w/256/h/256' },
  { name: 'MyFitnessPal', color: '#0066FF', logo: 'https://cdn.brandfetch.io/myfitnesspal.com/w/256/h/256' },
]

const COMPARISON = [
  { feature: 'Free to join (no subscription)',   count: true, others: false },
  { feature: 'Earn real physical rewards',        count: true, others: false },
  { feature: 'Supplements shipped to your door', count: true, others: false },
  { feature: 'Points for every workout',          count: true, others: false },
  { feature: 'Tier & streak multipliers (up to 6x)',     count: true, others: false },
  { feature: 'Workout tracking',                  count: true, others: true  },
  { feature: 'Tier progression system',           count: true, others: false },
  { feature: 'Gear & apparel rewards',            count: true, others: false },
]

const FAQ_ITEMS = [
  { q: 'Is COUNT really free?', a: 'Yes. No subscription, no hidden fees. Sign up, log workouts, and earn rewards â all completely free.' },
  { q: 'How do I earn points?', a: 'Every workout you log earns 200 base points. Move up tiers (Bronze to Platinum) for up to 3x and build streaks for up to 2x â meaning up to 1,200 points per session.' },
  { q: 'What kind of rewards can I get?', a: 'Real products â protein, pre-workout, gear, and apparel from brands like Thorne, Momentous, and more. No gift cards or digital badges.' },
  { q: 'How does verification work?', a: 'You can sync with Strava, Apple Health, Garmin, or Google Fit for verified sessions. Unverified sessions still earn points â just at a reduced rate.' },
  { q: 'When do new brands get added?', a: 'We\'re onboarding new brands regularly. Drop your email in the waitlist to get notified when new rewards go live.' },
]

/* Hero background images â mixed gender, diverse athletes */
const HERO_IMAGES = [
  { id: '1517836357463', pos: 'center 30%' },
  { id: '1571019614242', pos: 'center 40%' },
  { id: '1534438327276', pos: 'center 25%' },
  { id: '1518611012118', pos: 'center 35%' },
]

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [heroIdx, setHeroIdx] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/home')
  }, [loading, user])

  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_IMAGES.length), 5000)
    return () => clearInterval(t)
  }, [])

  /* Lock body scroll when menu is open */
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111110' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #2a2a29', borderTopColor: '#B5593C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (user) return null

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {}
    setSubmitted(true)
    setSubmitting(false)
  }

  const scrollTo = (id: string) => {
    setMenuOpen(false)
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#111110', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes heroFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* ââ BURGER MENU OVERLAY ââ */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', animation: 'fadeIn 0.2s ease' }}
          />
          {/* Sidebar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 280,
            background: '#141413', borderRight: '1px solid #1E1E1D',
            animation: 'slideIn 0.25s ease-out',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Menu header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1E1E1D', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', width: 20, height: 17 }}>
                  {[0, 5, 10].map(left => (
                    <div key={left} style={{ position: 'absolute', top: 0, width: 2, height: 17, background: '#F5F0EA', borderRadius: 1, left }} />
                  ))}
                  <div style={{ position: 'absolute', top: 5, left: 1.5, width: 13, height: 1.5, background: '#B5593C', borderRadius: 1, transform: 'rotate(-30deg)' }} />
                </div>
                <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, fontWeight: 900, color: '#F5F0EA', letterSpacing: '0.15em', textTransform: 'uppercase' }}>COUNT</span>
              </div>
              <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 22, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>&times;</button>
            </div>
            {/* Menu items */}
            <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
              {SECTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  style={{
                    display: 'block', width: '100%', padding: '14px 24px',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'Archivo, sans-serif', fontSize: 15, fontWeight: 600, color: '#B0A89E',
                    letterSpacing: 0.3, transition: 'color 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            {/* Menu footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #1E1E1D', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/auth/signup" onClick={() => setMenuOpen(false)} style={{ display: 'block', textAlign: 'center', padding: '14px 20px', background: '#B5593C', color: '#F5F0EA', textDecoration: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, fontFamily: 'Archivo, sans-serif' }}>
                Start earning &rarr;
              </Link>
              <Link href="/auth/login" onClick={() => setMenuOpen(false)} style={{ display: 'block', textAlign: 'center', padding: '12px 20px', background: 'transparent', color: '#666', textDecoration: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid #252523', fontFamily: 'Archivo, sans-serif' }}>
                Log in
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ââ HERO ââ */}
      <div id="home" style={{ position: 'relative', overflow: 'hidden', background: '#0E0D0C', height: '60vw', minHeight: 340, maxHeight: 560 }}>
        {/* Video background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <iframe
            src="https://www.youtube-nocookie.com/embed/1tyX7qDArfA?autoplay=1&mute=1&loop=1&playlist=1tyX7qDArfA&controls=0&disablekb=1&playsinline=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&start=45"
            allow="autoplay; encrypted-media"
            style={{ position: 'absolute', top: '50%', left: '50%', width: '177.78vh', minWidth: '100%', minHeight: '100%', transform: 'translate(-50%, -50%)', border: 'none', pointerEvents: 'none' }}
          />
        </div>
        {/* Fallback rotating images behind video */}
        {HERO_IMAGES.map((img, i) => (
          <div
            key={img.id}
            style={{
              position: 'absolute', inset: 0, zIndex: -1,
              backgroundImage: `url(https://images.pexels.com/photos/${img.id}/pexels-photo-${img.id}.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&dpr=2)`,
              backgroundSize: 'cover', backgroundPosition: img.pos,
              opacity: heroIdx === i ? 1 : 0,
              transition: 'opacity 1.2s ease-in-out',
            }}
          />
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,8,7,0.55)', zIndex: 1 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: 'linear-gradient(to bottom, transparent, #111110)', zIndex: 1 }} />
        {/* Top bar: burger left, login right */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setMenuOpen(true)} style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 18, height: 2, background: '#F5F0EA', borderRadius: 1 }} />
            <div style={{ width: 18, height: 2, background: '#F5F0EA', borderRadius: 1 }} />
            <div style={{ width: 18, height: 2, background: '#F5F0EA', borderRadius: 1 }} />
          </button>
          <Link href="/auth/login" style={{ color: '#F5F0EA', fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: 'Archivo, sans-serif', letterSpacing: 0.5, background: 'rgba(0,0,0,0.45)', padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)' }}>
            Log in
          </Link>
        </div>
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '0 24px' }}>
          <div style={{ position: 'relative', width: 52, height: 44, marginBottom: 14 }}>
            {[0, 13, 26].map(left => (
              <div key={left} style={{ position: 'absolute', top: 0, width: 5, height: 44, background: '#F5F0EA', borderRadius: 3, left }} />
            ))}
            <div style={{ position: 'absolute', top: 12, left: 4, width: 34, height: 4, background: '#B5593C', borderRadius: 2, transform: 'rotate(-30deg)' }} />
          </div>
          <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 'clamp(52px, 12vw, 96px)', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#F5F0EA', lineHeight: 1, textShadow: '0 2px 24px rgba(0,0,0,0.6)', marginBottom: 10 }}>
            COUNT
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 'clamp(10px, 2vw, 13px)', color: 'rgba(245,240,234,0.55)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 28 }}>
            make it count
          </span>
          <Link href="/auth/signup" style={{ display: 'inline-block', padding: '16px 36px', background: '#B5593C', color: '#F5F0EA', textDecoration: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, fontFamily: 'Archivo, sans-serif', letterSpacing: 0.3, textShadow: 'none', boxShadow: '0 4px 20px rgba(181,89,60,0.45)' }}>
            Start earning &rarr;
          </Link>
        </div>
      </div>

      {/* ââ VALUE PROP ââ */}
      <div style={{ padding: '36px 24px 40px', background: '#111110' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(181,89,60,0.12)', border: '1px solid rgba(181,89,60,0.25)', borderRadius: 20, padding: '5px 12px', marginBottom: 20 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#B5593C' }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#B5593C', letterSpacing: 1, textTransform: 'uppercase' }}>Free to join</span>
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: 0.5, color: '#F5F0EA', fontFamily: 'Archivo, sans-serif', lineHeight: 1.0, marginBottom: 16 }}>
          Your workouts<br /> should <span style={{ color: '#B5593C' }}>pay you back.</span>
        </h1>
        <p style={{ color: '#9A9087', fontSize: 16, lineHeight: 1.65, marginBottom: 32, maxWidth: 340 }}>
          Log sessions. Stack points. Move up tiers. Redeem real protein, pre-workout, and gear from brands you already buy&thinsp;&mdash;&thinsp;completely free.
        </p>
        <Link href="/auth/signup" style={{ display: 'block', textAlign: 'center', padding: '17px 24px', background: '#B5593C', color: '#F5F0EA', textDecoration: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, fontFamily: 'Archivo, sans-serif', marginBottom: 10, letterSpacing: 0.3 }}>
          Start earning &rarr;
        </Link>
        <Link href="/auth/login" style={{ display: 'block', textAlign: 'center', padding: '15px 24px', background: 'transparent', color: '#666', textDecoration: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, border: '1px solid #222221', fontFamily: 'Archivo, sans-serif' }}>
          Already have an account
        </Link>
        <div style={{ display: 'flex', gap: 0, marginTop: 28, borderTop: '1px solid #1E1E1D', paddingTop: 24 }}>
          {[
            { num: '$0',  label: 'to join'     },
            { num: '6x',  label: 'max multiplier'  },
            { num: '200', label: 'pts/session'  },
          ].map(({ num, label }, i) => (
            <div key={label} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid #1E1E1D' : 'none' }}>
              <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 24, fontWeight: 900, color: '#B5593C', marginBottom: 3 }}>{num}</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1.2 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ââ SOCIAL PROOF ââ */}
      <div style={{ padding: '32px 24px', background: '#0A0A09', borderTop: '1px solid #1C1C1B', borderBottom: '1px solid #1C1C1B' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, maxWidth: 420, margin: '0 auto' }}>
          {[
            { num: '1,200+', label: 'Workouts Logged' },
            { num: '200+',   label: 'Active Members' },
            { num: '6',      label: 'Brand Partners' },
          ].map(({ num, label }) => (
            <div key={label} style={{ textAlign: 'center', padding: '16px 8px', background: '#111110', borderRadius: 12, border: '1px solid #1E1E1D' }}>
              <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 22, fontWeight: 900, color: '#F5F0EA', marginBottom: 4, lineHeight: 1 }}>{num}</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1.2, lineHeight: 1.3 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ââ HOW IT WORKS ââ */}
      <div id="how" style={{ padding: '40px 24px', borderTop: '1px solid #1C1C1B' }}>
        <p style={{ color: '#444', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 24, fontFamily: 'JetBrains Mono, monospace' }}>How it works</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {HOW_IT_WORKS.map(({ step, title, desc }) => (
            <div key={step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 44, height: 44, borderRadius: 10, background: 'rgba(181,89,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 900, color: '#B5593C' }}>{step}</span>
              </div>
              <div style={{ paddingTop: 2 }}>
                <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 16, fontWeight: 800, color: '#F5F0EA', marginBottom: 5 }}>{title}</p>
                <p style={{ color: '#777', fontSize: 14, lineHeight: 1.55 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ââ OUR PARTNERS ââ */}
      <div id="partners" style={{ padding: '44px 24px', background: '#111110', borderTop: '1px solid #1C1C1B', borderBottom: '1px solid #1C1C1B' }}>
        <p style={{ color: '#444', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 6, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>Our Partners</p>
        <p style={{ color: '#3A3A38', fontSize: 12, textAlign: 'center', marginBottom: 28, fontFamily: 'JetBrains Mono, monospace' }}>Brands that believe in rewarding the grind</p>

        <a
          href="https://glnk.io/qv9ww/joseph-panepinto"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', textDecoration: 'none', maxWidth: 420, margin: '0 auto' }}
        >
          <div style={{
            background: 'linear-gradient(145deg, #1C1B19 0%, #141413 100%)',
            border: '1.5px solid rgba(181,89,60,0.3)',
            borderRadius: 18,
            padding: '28px 24px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'border-color 0.2s ease',
          }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(181,89,60,0.08) 0%, transparent 70%)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(181,89,60,0.15) 0%, rgba(181,89,60,0.05) 100%)',
                border: '1.5px solid rgba(181,89,60,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <img src="https://cdn.brandfetch.io/kanefootwear.com/w/256/h/256" alt="Kane" style={{ width: '65%', height: '65%', objectFit: 'contain', borderRadius: 4 }} />
              </div>
              <div>
                <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 22, fontWeight: 900, color: '#F5F0EA', letterSpacing: -0.3, marginBottom: 4 }}>Kane</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(93,187,99,0.1)', border: '1px solid rgba(93,187,99,0.2)', borderRadius: 6, padding: '3px 8px' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#5DBB63' }} />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#5DBB63', letterSpacing: 0.5, textTransform: 'uppercase' }}>Official Partner</span>
                </div>
              </div>
            </div>
            <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, color: '#9A9087', lineHeight: 1.6, marginBottom: 16 }}>
              Premium fitness essentials built for athletes who show up every day. COUNT members get exclusive access.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 13, fontWeight: 800, color: '#B5593C', letterSpacing: 0.3 }}>Shop Kane</span>
              <span style={{ color: '#B5593C', fontSize: 16 }}>&rarr;</span>
            </div>
          </div>
        </a>

        {/* Integrations inline */}
        <div style={{ marginTop: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#444', marginBottom: 16, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>Syncs with</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 420, margin: '0 auto' }}>
            {INTEGRATIONS.map(b => (
              <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#141413', borderRadius: 10, padding: '10px 16px', border: '1px solid #1E1E1D' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${b.color}18`, border: `1px solid ${b.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src={b.logo} alt={b.name} style={{ width: '65%', height: '65%', objectFit: 'contain', borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#B0A89E', fontFamily: 'Archivo, sans-serif' }}>{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ââ STRAVA COMPARISON HOOK ââ */}
      <div style={{ padding: '36px 24px', background: '#0D0D0C', borderTop: '1px solid #1C1C1B' }}>
        <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 22, fontWeight: 900, color: '#F5F0EA', lineHeight: 1.25, marginBottom: 14 }}>
          Strava claps for you.<br />
          <span style={{ color: '#B5593C' }}>COUNT pays you.</span>
        </p>
        <p style={{ color: '#777', fontSize: 14, lineHeight: 1.75, maxWidth: 340 }}>
          Other apps reward your streak with badges. COUNT ships you protein, pre-workout, and gear. No subscription. No catches. Show up, stack points, get paid.
        </p>
      </div>

      {/* ââ REWARD CATALOG ââ */}
      <div id="rewards" style={{ padding: '36px 24px 40px', background: '#0D0D0C', borderTop: '1px solid #1C1C1B' }}>
        <p style={{ color: '#444', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 4, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>Reward catalog</p>
        <p style={{ color: '#3A3A38', fontSize: 12, textAlign: 'center', marginBottom: 12, fontFamily: 'JetBrains Mono, monospace' }}>Live now + brands we&apos;re onboarding</p>

        {/* Live brands - featured */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, maxWidth: 420, margin: '0 auto 16px' }}>
          {REWARD_CATALOG.filter(b => b.status === 'live').map(({ name, logo, color }) => (
            <div key={name} style={{
              flex: 1, padding: '18px 16px', background: 'linear-gradient(145deg, #1C1B19 0%, #141413 100%)',
              borderRadius: 14, border: '1.5px solid rgba(93,187,99,0.3)',
              textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 8, right: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#5DBB63' }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#5DBB63', textTransform: 'uppercase', letterSpacing: 0.5 }}>Live</span>
              </div>
              <div style={{
                width: 52, height: 52, borderRadius: 14, margin: '0 auto 10px',
                background: `${color}18`, border: `1.5px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src={logo} alt={name} style={{ width: '65%', height: '65%', objectFit: 'contain', borderRadius: 4 }} />
              </div>
              <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 16, fontWeight: 800, color: '#F5F0EA', marginBottom: 3 }}>{name}</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#5DBB63' }}>Available now</p>
            </div>
          ))}
        </div>

        {/* In talks brands - grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 420, margin: '0 auto' }}>
          {REWARD_CATALOG.filter(b => b.status === 'coming_soon').map(({ name, logo, color }) => (
            <div key={name} style={{ padding: '12px 14px', background: '#141413', borderRadius: 10, border: '1px solid #252523', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={logo} alt={name} style={{ width: '65%', height: '65%', objectFit: 'contain', borderRadius: 4 }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 13, fontWeight: 700, color: '#555', letterSpacing: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{name}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#B5593C', display: 'block', marginTop: 2, letterSpacing: 0.5 }}>In talks</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ââ COMPARISON TABLE ââ */}
      <div id="compare" style={{ padding: '40px 24px', background: '#0D0D0C', borderTop: '1px solid #1C1C1B' }}>
        <p style={{ color: '#444', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 4, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>How we stack up</p>
        <p style={{ color: '#3A3A38', fontSize: 12, textAlign: 'center', marginBottom: 24, fontFamily: 'JetBrains Mono, monospace' }}>vs. Strava, MFP, Nike, Whoop</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 8, marginBottom: 10, padding: '0 4px' }}>
          <div />
          <div style={{ textAlign: 'center', fontFamily: 'Archivo, sans-serif', fontSize: 11, fontWeight: 900, color: '#B5593C', letterSpacing: 1.5, textTransform: 'uppercase' }}>COUNT</div>
          <div style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#444', letterSpacing: 0.5, textTransform: 'uppercase' }}>Others</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {COMPARISON.map(({ feature, count, others }, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 8, alignItems: 'center', padding: '11px 12px', background: i % 2 === 0 ? '#141413' : '#111110', borderRadius: 8 }}>
              <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 13, color: '#B0A89E', lineHeight: 1.3 }}>{feature}</span>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <span style={{ fontSize: 17, color: count ? '#5DBB63' : '#555' }}>{count ? '\u2713' : '\u2717'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {others === true
                  ? <span style={{ fontSize: 14, color: '#555' }}>~</span>
                  : <span style={{ fontSize: 14, color: '#3A3A38' }}>{'\u2717'}</span>
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ââ TIER SYSTEM ââ */}
      <div id="tiers" style={{ padding: '40px 24px', borderTop: '1px solid #1C1C1B' }}>
        <p style={{ color: '#444', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>Tier system</p>
        <p style={{ color: '#666', fontSize: 13, marginBottom: 20, fontFamily: 'Archivo, sans-serif' }}>Show up more. Multiply your points.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {TIERS.map(({ tier, mult, sessions, color }) => (
            <div key={tier} style={{ background: '#1A1A19', borderRadius: 12, padding: '14px 16px', borderLeft: `3px solid ${color}` }}>
              <p style={{ fontSize: 10, color: '#555', marginBottom: 5, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: 1 }}>{sessions}</p>
              <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 17, fontWeight: 800, color, marginBottom: 4 }}>{tier}</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color: '#F5F0EA', lineHeight: 1 }}>{mult}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ââ WAITLIST ââ */}
      <div style={{ padding: '40px 24px', borderTop: '1px solid #1C1C1B', background: '#0D0D0C' }}>
        <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 20, fontWeight: 800, color: '#F5F0EA', marginBottom: 6 }}>
          Not ready to sign up?
        </p>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 22, lineHeight: 1.55 }}>
          Drop your email and we&apos;ll let you know when new brand rewards go live.
        </p>
        {!submitted ? (
          <form onSubmit={handleEmail} style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ flex: 1, padding: '14px 16px', background: '#1A1A19', border: '1px solid #252523', borderRadius: 10, color: '#F5F0EA', fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono, monospace' }}
            />
            <button type="submit" disabled={submitting} style={{ padding: '14px 18px', background: submitting ? '#555' : '#B5593C', border: 'none', borderRadius: 10, color: '#F5F0EA', fontSize: 14, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', fontFamily: 'Archivo, sans-serif', whiteSpace: 'nowrap' }}>
              {submitting ? '...' : 'Notify me'}
            </button>
          </form>
        ) : (
          <div style={{ padding: '16px', background: 'rgba(181,89,60,0.08)', borderRadius: 10, border: '1px solid rgba(181,89,60,0.25)' }}>
            <p style={{ color: '#B5593C', fontWeight: 700, fontFamily: 'Archivo, sans-serif' }}>You&apos;re on the list!</p>
            <p style={{ color: '#666', fontSize: 13, marginTop: 5 }}>We&apos;ll email you when new brand rewards launch.</p>
          </div>
        )}
      </div>

      {/* ââ FAQ ââ */}
      <div id="faq" style={{ padding: '40px 24px', borderTop: '1px solid #1C1C1B' }}>
        <p style={{ color: '#444', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 24, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>Frequently asked questions</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 480, margin: '0 auto' }}>
          {FAQ_ITEMS.map(({ q, a }, i) => (
            <div key={i} style={{ background: '#141413', borderRadius: 10, border: '1px solid #1E1E1D', overflow: 'hidden' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
              >
                <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, fontWeight: 700, color: '#B0A89E', textAlign: 'left', lineHeight: 1.4 }}>{q}</span>
                <span style={{ color: '#555', fontSize: 18, flexShrink: 0, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 16px 14px' }}>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#666', lineHeight: 1.65 }}>{a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ââ FOOTER ââ */}
      <div style={{ padding: '32px 24px 44px', borderTop: '1px solid #1A1A19', background: '#0A0A09' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
          <div style={{ position: 'relative', width: 20, height: 17 }}>
            {[0, 5, 10].map(left => (
              <div key={left} style={{ position: 'absolute', top: 0, width: 2, height: 17, background: '#444', borderRadius: 1, left }} />
            ))}
            <div style={{ position: 'absolute', top: 5, left: 1.5, width: 13, height: 1.5, background: '#B5593C', borderRadius: 1, transform: 'rotate(-30deg)' }} />
          </div>
          <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, fontWeight: 900, color: '#444', letterSpacing: '0.15em', textTransform: 'uppercase' }}>COUNT</span>
        </div>
        <p style={{ fontSize: 12, color: '#2E2E2C', fontFamily: 'JetBrains Mono, monospace', marginBottom: 16, textAlign: 'center' }}>Track consistently. Earn more. Make it count.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
          <a href="https://instagram.com/make.it.count.app" target="_blank" rel="noopener" style={{ color: '#444', fontSize: 12, textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}>Instagram</a>
          <span style={{ color: '#2A2A29' }}>&#183;</span>
          <a href="mailto:jpanepinto23@gmail.com" style={{ color: '#444', fontSize: 12, textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}>Contact</a>
          <span style={{ color: '#2A2A29' }}>&#183;</span>
          <a href="/terms" style={{ color: '#444', fontSize: 12, textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}>Terms</a>
          <span style={{ color: '#2A2A29' }}>&#183;</span>
          <a href="/privacy" style={{ color: '#444', fontSize: 12, textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}>Privacy</a>
        </div>
        <p style={{ fontSize: 10, color: '#222', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>&copy; {new Date().getFullYear()} COUNT. All rights reserved.</p>
      </div>

    </div>
  )
}
