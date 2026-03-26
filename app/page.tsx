'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const TIERS = [
  { tier: 'Bronze',   mult: '1x',   sessions: 'Start here',   color: '#CD7F32' },
  { tier: 'Silver',   mult: '1.5x', sessions: '30 sessions',  color: '#A8A9AD' },
  { tier: 'Gold',     mult: '2x',   sessions: '100 sessions', color: '#FFD700' },
  { tier: 'Platinum', mult: '3x',   sessions: '500 sessions', color: '#E5E4E2' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Log Your Workout', desc: 'Open COUNT after your session. Tap to confirm. Takes 30 seconds.' },
  { step: '02', title: 'Earn Points',      desc: 'Every session earns points. Streaks multiply your total up to 3x.' },
  { step: '03', title: 'Redeem Rewards',   desc: 'Real protein, pre-workout, and gear shipped to your door. Free.' },
]

const PARTNERS = [
  { name: 'Momentous', url: 'https://www.livemomentous.com' },
  { name: 'Legion',    url: 'https://legionathletics.com'   },
  { name: 'Gymreapers',url: 'https://gymreapers.com'        },
]

const INTEGRATIONS = [
  { name: 'Strava',       color: '#FC4C02' },
  { name: 'Apple Health', color: '#FF2D55' },
  { name: 'Google Fit',   color: '#34A853' },
  { name: 'Garmin',       color: '#007CC3' },
  { name: 'MyFitnessPal', color: '#0066FF' },
  { name: 'Amazon',       color: '#FF9900' },
  { name: 'Legion',       color: '#C8A96E' },
]

const COMPARISON = [
  { feature: 'Free to join (no subscription)',   count: true, others: false },
  { feature: 'Earn real physical rewards',        count: true, others: false },
  { feature: 'Supplements shipped to your door', count: true, others: false },
  { feature: 'Points for every workout',          count: true, others: false },
  { feature: 'Streak multipliers (up to 3x)',     count: true, others: false },
  { feature: 'Workout tracking',                  count: true, others: true  },
  { feature: 'Tier progression system',           count: true, others: false },
  { feature: 'Gear & apparel rewards',            count: true, others: false },
]

const TESTIMONIALS = [
  { quote: 'Finally an app that actually pays me back for going to the gym.', name: 'Mike R.',   tag: '6-day streak' },
  { quote: 'Got my first Legion protein order after 30 sessions. No catches.', name: 'Sarah K.', tag: 'Silver tier'  },
  { quote: 'I log every session now just to watch my points stack up.',        name: 'James T.', tag: 'Gold tier'    },
]

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

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

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    try {
      const existing = JSON.parse(localStorage.getItem('count_waitlist') || '[]')
      existing.push({ email, ts: new Date().toISOString() })
      localStorage.setItem('count_waitlist', JSON.stringify(existing))
    } catch {}
    setSubmitted(true)
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#111110', display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ─── full-height video, no overlay text ───────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: '#0E0D0C', height: '56vw', minHeight: 320, maxHeight: 520 }}>
        {/* Looping YouTube background video — muted, atmosphere only */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <iframe
            src="https://www.youtube-nocookie.com/embed/1tyX7qDArfA?autoplay=1&mute=1&loop=1&playlist=1tyX7qDArfA&controls=0&disablekb=1&playsinline=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3"
            allow="autoplay; encrypted-media"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '177.78vh', minWidth: '100%', height: '56.25vw', minHeight: '100%', border: 'none' }}
          />
        </div>
        {/* Subtle vignette at bottom only so video bleeds into content */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, transparent, #111110)', zIndex: 1 }} />
        {/* Cover the YouTube channel watermark (bottom-right) with the Log in link */}
        <div style={{ position: 'absolute', bottom: 0, right: 0, zIndex: 2, padding: '0 12px 12px 0' }}>
          <Link href="/auth/login" style={{ display: 'inline-block', color: '#F5F0EA', fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: 'Archivo, sans-serif', letterSpacing: 0.5, background: 'rgba(0,0,0,0.55)', padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
            Log in
          </Link>
        </div>
        {/* COUNT logo — top-left */}
        <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', width: 30, height: 26 }}>
            {[0,7,14].map(left => (
              <div key={left} style={{ position: 'absolute', top: 0, width: 3, height: 26, background: '#F5F0EA', borderRadius: 2, left }} />
            ))}
            <div style={{ position: 'absolute', top: 7, left: 3, width: 18, height: 2.5, background: '#B5593C', borderRadius: 2, transform: 'rotate(-30deg)' }} />
          </div>
          <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 18, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', color: '#F5F0EA' }}>COUNT</span>
        </div>
      </div>

      {/* ── Headline + CTA ────────────────────────────────────────── */}
      <div style={{ padding: '36px 24px 40px', background: '#111110' }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(181,89,60,0.12)', border: '1px solid rgba(181,89,60,0.25)', borderRadius: 20, padding: '5px 12px', marginBottom: 20 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#B5593C' }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#B5593C', letterSpacing: 1, textTransform: 'uppercase' }}>Free to join</span>
        </div>
        {/* Headline */}
        <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: 0.5, color: '#F5F0EA', fontFamily: 'Archivo, sans-serif', lineHeight: 1.0, marginBottom: 16 }}>
          Your workouts<br /> should <span style={{ color: '#B5593C' }}>pay you back.</span>
        </h1>
        <p style={{ color: '#9A9087', fontSize: 16, lineHeight: 1.65, marginBottom: 32, maxWidth: 340 }}>
          Log sessions. Stack points. Move up tiers. Redeem real protein, pre-workout, and gear from brands you already buy&thinsp;&mdash;&thinsp;completely free.
        </p>
        {/* CTA buttons */}
        <Link href="/auth/signup" style={{ display: 'block', textAlign: 'center', padding: '17px 24px', background: '#B5593C', color: '#F5F0EA', textDecoration: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, fontFamily: 'Archivo, sans-serif', marginBottom: 10, letterSpacing: 0.3 }}>
          Start earning &rarr;
        </Link>
        <Link href="/auth/login" style={{ display: 'block', textAlign: 'center', padding: '15px 24px', background: 'transparent', color: '#666', textDecoration: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, border: '1px solid #222221', fontFamily: 'Archivo, sans-serif' }}>
          Already have an account
        </Link>
        {/* Inline stats */}
        <div style={{ display: 'flex', gap: 0, marginTop: 28, borderTop: '1px solid #1E1E1D', paddingTop: 24 }}>
          {[
            { num: '$0', label: 'to join' },
            { num: '3x', label: 'max streak' },
            { num: '$50+', label: 'avg reward' },
          ].map(({ num, label }, i) => (
            <div key={label} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid #1E1E1D' : 'none' }}>
              <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 24, fontWeight: 900, color: '#B5593C', marginBottom: 3 }}>{num}</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1.2 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Differentiator hook ─────────────────────────────────── */}
      <div style={{ padding: '36px 24px', background: '#0D0D0C', borderTop: '1px solid #1C1C1B' }}>
        <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 22, fontWeight: 900, color: '#F5F0EA', lineHeight: 1.25, marginBottom: 14 }}>
          Strava claps for you.<br />
          <span style={{ color: '#B5593C' }}>COUNT pays you.</span>
        </p>
        <p style={{ color: '#777', fontSize: 14, lineHeight: 1.75, maxWidth: 340 }}>
          Other apps reward your streak with badges. COUNT ships you protein, pre-workout, and gear. No subscription. No catches. Show up, stack points, get paid.
        </p>
      </div>

      {/* ── How It Works ──────────────────────────────────────────── */}
      <div style={{ padding: '40px 24px', borderTop: '1px solid #1C1C1B' }}>
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

      {/* ── Comparison Table ──────────────────────────────────────── */}
      <div style={{ padding: '40px 24px', background: '#0D0D0C', borderTop: '1px solid #1C1C1B' }}>
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
                <span style={{ fontSize: 17, color: count ? '#5DBB63' : '#555' }}>{count ? '✓' : '✗'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {others === true
                  ? <span style={{ fontSize: 14, color: '#555' }}>~</span>
                  : <span style={{ fontSize: 14, color: '#3A3A38' }}>✗</span>
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tier preview ──────────────────────────────────────────── */}
      <div style={{ padding: '40px 24px', borderTop: '1px solid #1C1C1B' }}>
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

      {/* ── Partner Brands ────────────────────────────────────────── */}
      <div style={{ padding: '36px 24px 40px', background: '#0D0D0C', borderTop: '1px solid #1C1C1B' }}>
        <p style={{ color: '#444', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 20, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>Earn rewards from</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          {PARTNERS.map(({ name }) => (
            <div key={name} style={{ padding: '9px 18px', background: '#141413', borderRadius: 8, border: '1px solid #252523' }}>
              <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 13, fontWeight: 700, color: '#B0A89E', letterSpacing: 0.5 }}>{name}</span>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#333', fontSize: 12, marginTop: 14, fontFamily: 'JetBrains Mono, monospace' }}>+ more brands coming soon</p>
      </div>

      {/* ── Testimonials ──────────────────────────────────────────── */}
      <div style={{ padding: '40px 24px', borderTop: '1px solid #1C1C1B' }}>
        <p style={{ color: '#444', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 20, fontFamily: 'JetBrains Mono, monospace' }}>What people are saying</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TESTIMONIALS.map(({ quote, name, tag }) => (
            <div key={name} style={{ background: '#161615', borderRadius: 12, padding: '18px 20px', borderLeft: '3px solid #B5593C' }}>
              <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, color: '#D4C8BE', lineHeight: 1.65, marginBottom: 14, fontStyle: 'italic' }}>
                &ldquo;{quote}&rdquo;
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 13, fontWeight: 700, color: '#B0A89E' }}>{name}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#B5593C', background: 'rgba(181,89,60,0.1)', padding: '3px 8px', borderRadius: 4 }}>{tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Syncs With ────────────────────────────────────────────── */}
      <div style={{ padding: '36px 24px', background: '#0D0D0C', borderTop: '1px solid #1C1C1B' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#444', marginBottom: 20, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>Syncs with</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 400, margin: '0 auto' }}>
          {INTEGRATIONS.map(b => (
            <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#141413', borderRadius: 7, padding: '8px 14px', border: '1px solid #1E1E1D' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#B0A89E', fontFamily: 'Archivo, sans-serif' }}>{b.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Email Capture ─────────────────────────────────────────── */}
      <div style={{ padding: '40px 24px', borderTop: '1px solid #1C1C1B' }}>
        <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 20, fontWeight: 800, color: '#F5F0EA', marginBottom: 6 }}>
          Not ready yet?
        </p>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 22, lineHeight: 1.55 }}>
          Drop your email and get 500 bonus points when you sign up.
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
            <button type="submit" style={{ padding: '14px 18px', background: '#B5593C', border: 'none', borderRadius: 10, color: '#F5F0EA', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Archivo, sans-serif', whiteSpace: 'nowrap' }}>
              Get 500 pts
            </button>
          </form>
        ) : (
          <div style={{ padding: '16px', background: 'rgba(181,89,60,0.08)', borderRadius: 10, border: '1px solid rgba(181,89,60,0.25)' }}>
            <p style={{ color: '#B5593C', fontWeight: 700, fontFamily: 'Archivo, sans-serif' }}>You&apos;re in! 500 points are waiting.</p>
            <p style={{ color: '#666', fontSize: 13, marginTop: 5 }}>Sign up when you&apos;re ready to start earning.</p>
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 24px 36px', borderTop: '1px solid #1A1A19', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#2E2E2C', fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>Track consistently. Earn more. Make it count.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
          <a href="https://instagram.com/make.it.count.app" target="_blank" rel="noopener" style={{ color: '#444', fontSize: 12, textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}>Instagram</a>
          <span style={{ color: '#2A2A29' }}>&#183;</span>
          <a href="mailto:jpanepinto23@gmail.com" style={{ color: '#444', fontSize: 12, textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}>Contact</a>
        </div>
      </div>

    </div>
  )
}
