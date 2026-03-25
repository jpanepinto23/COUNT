'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const HERO_PHOTO = 'https://images.pexels.com/photos/2261481/pexels-photo-2261481.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'

const STRIP_PHOTOS = [
  { id: '3916766', label: 'Lift' }
  { id: '4164515', label: 'Grind' },
  { id: '6389886', label: 'Push' },
]

const TIERS = [
  { tier: 'Bronze', mult: '1x', sessions: 'Start here', color: '#CD7F32' },
  { tier: 'Silver', mult: '1.5x', sessions: '30 sessions', color: '#A8A9AD' },
  { tier: 'Gold', mult: '2x', sessions: '100 sessions', color: '#FFD700' },
  { tier: 'Platinum', mult: '3x', sessions: '500 sessions', color: '#E5E4E2' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Log Your Workout', desc: 'Open COUNT after your session. Tap to confirm. Takes 30 seconds.' },
  { step: '02', title: 'Earn Points', desc: 'Every session earns points. Streaks multiply your total up to 3x.' },
  { step: '03', title: 'Redeem Rewards', desc: 'Real protein, pre-workout, and gear shipped to your door. Free.' },
]

const PARTNERS = [
  { name: 'Momentous', url: 'https://www.livemomentous.com' },
  { name: 'Legion', url: 'https://legionathletics.com' },
  { name: 'Gymreapers', url: 'https://gymreapers.com' },
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
    // Store email in localStorage for now â replace with Supabase insert later
    try {
      const existing = JSON.parse(localStorage.getItem('count_waitlist') || '[]')
      existing.push({ email, ts: new Date().toISOString() })
      localStorage.setItem('count_waitlist', JSON.stringify(existing))
    } catch {}
    setSubmitted(true)
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#111110', display: 'flex', flexDirection: 'column' }}>

      {/* ââ Hero âââââââââââââââââââââââââââââââââââââââââââââââââ */}
      <div style={{ position: 'relative', minHeight: '72dvh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
        <img src={HERO_PHOTO} alt="Athlete training" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(17,17,16,0.25) 0%, rgba(17,17,16,0.7) 55%, #111110 100%)' }} />
        <div style={{ position: 'relative', padding: '0 24px 40px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ position: 'relative', width: 36, height: 32 }}>
              {[0,8,16].map(left => (
                <div key={left} style={{ position: 'absolute', top: 0, width: 3.5, height: 32, background: '#F5F0EA', borderRadius: 2, left }} />
              ))}
              <div style={{ position: 'absolute', top: 8, left: 4, width: 22, height: 3, background: '#B5593C', borderRadius: 2, transform: 'rotate(-30deg)' }} />
            </div>
            <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 22, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', color: '#F5F0EA' }}>COUNT</span>
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 900, letterSpacing: 1.5, color: '#F5F0EA', fontFamily: 'Archivo, sans-serif', lineHeight: 1.05, marginBottom: 12 }}>
            Every rep earns you more.
          </h1>
          <p style={{ color: '#C4BDB3', fontSize: 16, lineHeight: 1.6, marginBottom: 24, maxWidth: 320 }}>
            Log workouts. Earn points. Move up tiers. Get rewarded for actually showing up.
          </p>
          <Link href="/auth/signup" style={{ display: 'block', textAlign: 'center', padding: '16px 24px', background: '#B5593C', color: '#F5F0EA', textDecoration: 'none', borderRadius: 10, fontSize: 16, fontWeight: 800, fontFamily: 'Archivo, sans-serif', marginBottom: 10 }}>
                        Start earning free {'\u2192'}
          </Link>
          <Link href="/auth/login" style={{ display: 'block', textAlign: 'center', padding: '14px 24px', background: 'rgba(255,255,255,0.06)', color: '#C4BDB3', textDecoration: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, border: '1px solid #2a2a29' }}>
            Sign in
          </Link>
        </div>
      </div>

      {/* ââ Photo strip ââââââââââââââââââââââââââââââââââââââââââ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, margin: '2px 0 0' }}>
        {STRIP_PHOTOS.map(({ id, label }) => (
          <div key={id} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}>
            <img src={`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400&dpr=1`} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,17,16,0.35)' }} />
            <span style={{ position: 'absolute', bottom: 10, left: 12, color: '#F5F0EA', fontSize: 13, fontWeight: 800, fontFamily: 'Archivo, sans-serif', letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ââ How It Works âââââââââââââââââââââââââââââââââââââââââ */}
      <div style={{ padding: '48px 20px 40px' }}>
        <p style={{ color: '#555', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 20, fontFamily: 'JetBrains Mono, monospace' }}>How it works</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {HOW_IT_WORKS.map(({ step, title, desc }) => (
            <div key={step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 48, height: 48, borderRadius: 12, background: 'rgba(181,89,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 900, color: '#B5593C' }}>{step}</span>
              </div>
              <div>
                <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 17, fontWeight: 800, color: '#F5F0EA', marginBottom: 4 }}>{title}</p>
                <p style={{ color: '#888', fontSize: 14, lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ââ Partner Brands âââââââââââââââââââââââââââââââââââââââ */}
      <div style={{ padding: '32px 20px 40px', borderTop: '1px solid #1f1f1e' }}>
        <p style={{ color: '#555', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 20, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>Earn rewards from</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          {PARTNERS.map(({ name }) => (
            <div key={name} style={{ padding: '10px 20px', background: '#1A1A19', borderRadius: 8, border: '1px solid #2a2a29' }}>
              <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, fontWeight: 700, color: '#C4BDB3', letterSpacing: 0.5 }}>{name}</span>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#444', fontSize: 12, marginTop: 12, fontFamily: 'JetBrains Mono, monospace' }}>+ more brands coming soon</p>
      </div>

      {/* ââ Social Proof Stats âââââââââââââââââââââââââââââââââââ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, padding: '0 20px 40px' }}>
        {[
          { num: '100%', label: 'Free' },
          { num: 'Real', label: 'Brands' },
          { num: 'Ships', label: 'To You' },
        ].map(({ num, label }) => (
          <div key={label} style={{ textAlign: 'center', padding: '20px 8px', background: '#1A1A19', borderRadius: 10 }}>
            <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 22, fontWeight: 900, color: '#B5593C', marginBottom: 4 }}>{num}</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ââ Tier preview âââââââââââââââââââââââââââââââââââââââââ */}
      <div style={{ padding: '0 20px 48px' }}>
        <p style={{ color: '#555', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 16, fontFamily: 'JetBrains Mono, monospace' }}>The more you show up</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {TIERS.map(({ tier, mult, sessions, color }) => (
            <div key={tier} style={{ background: '#1A1A19', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 11, color: '#555', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>{sessions}</p>
              <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 18, fontWeight: 800, color, marginBottom: 2 }}>{tier}</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 900, color: '#F5F0EA', lineHeight: 1.1 }}>{mult}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ââ Email Capture ââââââââââââââââââââââââââââââââââââââââ */}
      <div style={{ padding: '32px 20px 48px', borderTop: '1px solid #1f1f1e' }}>
        <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 20, fontWeight: 800, color: '#F5F0EA', textAlign: 'center', marginBottom: 8 }}>
          Not ready to sign up yet?
        </p>
        <p style={{ color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 1.5 }}>
          Drop your email. We'll send you 500 bonus points when you do.
        </p>
        {!submitted ? (
          <form onSubmit={handleEmail} style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                flex: 1, padding: '14px 16px', background: '#1A1A19', border: '1px solid #2a2a29',
                borderRadius: 10, color: '#F5F0EA', fontSize: 15, outline: 'none',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
            <button type="submit" style={{
              padding: '14px 20px', background: '#B5593C', border: 'none', borderRadius: 10,
              color: '#F5F0EA', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Archivo, sans-serif',
            }}>
              Get 500 pts
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(181,89,60,0.1)', borderRadius: 10, border: '1px solid rgba(181,89,60,0.3)' }}>
            <p style={{ color: '#B5593C', fontWeight: 700, fontFamily: 'Archivo, sans-serif' }}>You're in! 500 bonus points are waiting.</p>
            <p style={{ color: '#888', fontSize: 13, marginTop: 6 }}>Sign up when you're ready to start earning.</p>
          </div>
        )}
      </div>

      {/* ââ Footer âââââââââââââââââââââââââââââââââââââââââââââââ */}
      <div style={{ padding: '0 24px 32px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#333', fontFamily: 'JetBrains Mono, monospace' }}>Track consistently. Earn more. Make it count.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
          <a href="https://instagram.com/make.it.count.app" target="_blank" rel="noopener" style={{ color: '#555', fontSize: 12, textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}>Instagram</a>
          <span style={{ color: '#333' }}>Â·</span>
          <a href="mailto:jpanepinto23@gmail.com" style={{ color: '#555', fontSize: 12, textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}>Contact</a>
        </div>
      </div>
    </div>
  )
}
