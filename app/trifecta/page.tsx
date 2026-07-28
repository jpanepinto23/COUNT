'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const GREEN = '#9DE650'
const ORANGE = '#F67820'
const RULES = [
  { n: '12', label: 'verified workouts', sub: 'in August' },
  { n: '500', label: 'bonus coins', sub: 'earned' },
  { n: '50%', label: 'off your first', sub: 'Trifecta order' },
  { n: '+10%', label: 'off every order', sub: 'after that' },
]

export default function TrifectaChallengePage() {
  const supabase = createClient()
  const [signedIn, setSignedIn] = useState(false)
  const [progress, setProgress] = useState<{ progress: number; completed: boolean; bonus_awarded: boolean } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setSignedIn(true)
      const { data } = await supabase.from('trifecta_challenge_progress').select('progress, completed, bonus_awarded').eq('user_id', session.user.id).maybeSingle()
      setProgress({ progress: data?.progress ?? 0, completed: data?.completed ?? false, bonus_awarded: data?.bonus_awarded ?? false })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const done = progress?.progress ?? 0

  return (
    <div style={{ minHeight: '100dvh', background: '#0E0E0D', color: '#F5F0EA' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 60px' }}>
        <img src="/trifecta-hero.png" alt="The Trifecta Challenge" style={{ width: 'calc(100% + 40px)', margin: '0 -20px', display: 'block' }} />
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ORANGE, letterSpacing: 2, textTransform: 'uppercase', margin: '28px 0 10px' }}>August 1–31 · COUNT × Trifecta</p>
        <h1 style={{ fontFamily: 'Archivo, sans-serif', fontSize: 34, fontWeight: 900, lineHeight: 1.1, marginBottom: 8 }}>
          Train consistently. <span style={{ color: GREEN }}>Eat like it.</span>
        </h1>
        <p style={{ color: '#8A8680', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
          Log 12 verified workouts in August and unlock 500 bonus coins plus the Trifecta reward — 50% off your first order of science-backed, ready-to-eat meals, and 10% off every order after that.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
          {RULES.map(r => (
            <div key={r.n} style={{ background: '#181714', border: '1.5px solid rgba(245,240,234,0.12)', borderRadius: 14, padding: '16px 18px' }}>
              <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 26, fontWeight: 900, color: GREEN, marginBottom: 2 }}>{r.n}</p>
              <p style={{ fontSize: 13, color: '#F5F0EA', lineHeight: 1.35 }}>{r.label}</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#8A8680' }}>{r.sub}</p>
            </div>
          ))}
        </div>

        {signedIn && progress && (
          <div style={{ background: '#181714', border: '1.5px solid ' + (progress.completed ? GREEN : 'rgba(245,240,234,0.12)'), borderRadius: 14, padding: '18px 20px', marginBottom: 28 }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#8A8680', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Your progress</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 32, fontWeight: 900, color: progress.completed ? GREEN : '#F5F0EA' }}>{done}</span>
              <span style={{ color: '#8A8680', fontSize: 14 }}>/ 12 verified workouts</span>
            </div>
            <div style={{ height: 8, background: 'rgba(245,240,234,0.1)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: Math.min(100, (done / 12) * 100) + '%', background: GREEN, borderRadius: 4, transition: 'width .4s' }} />
            </div>
            {progress.completed && (
              <p style={{ color: GREEN, fontSize: 13, marginTop: 12 }}>
                {progress.bonus_awarded ? 'Challenge complete — 500 bonus coins are in your balance. Redeem the Trifecta reward from the store.' : 'Challenge complete! Your 500 bonus coins land tonight.'}
              </p>
            )}
          </div>
        )}

        <div style={{ background: 'rgba(246,120,32,0.08)', border: '1px solid rgba(246,120,32,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: '#F5F0EA', lineHeight: 1.55 }}>
            <strong>How verification works:</strong> connect Strava (free) and your workouts verify automatically. One verified workout counts per day. Wearable sync (Garmin) returns August 20.
          </p>
        </div>

        <Link href={signedIn ? '/log' : '/auth/signup'} style={{ display: 'block', textAlign: 'center', background: GREEN, color: '#0E0E0D', fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: 16, padding: '16px 24px', borderRadius: 14, textDecoration: 'none', marginBottom: 12 }}>
          {signedIn ? 'Log a workout' : 'Join the challenge — free'}
        </Link>
        {!signedIn && (
          <Link href="/auth/login" style={{ display: 'block', textAlign: 'center', color: '#8A8680', fontSize: 13, textDecoration: 'none', padding: 10 }}>
            Already on COUNT? Log in
          </Link>
        )}
      </div>
    </div>
  )
}
