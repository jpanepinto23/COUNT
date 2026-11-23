'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { isPlaceholderEmail } from '@/lib/strava-auth'
import { UNVERIFIED_POINTS, VERIFIED_POINTS } from '@/lib/points'
import AppleWatchWaitlist from '@/components/AppleWatchWaitlist'

type TrainsWith = 'garmin' | 'strava' | 'apple_watch' | 'fitbit' | 'manual' | 'other'
const DEVICE_OPTIONS: { value: TrainsWith; label: string }[] = [
  { value: 'garmin', label: 'Garmin' },
  { value: 'strava', label: 'Strava' },
  { value: 'apple_watch', label: 'Apple Watch' },
  { value: 'fitbit', label: 'Fitbit' },
  { value: 'manual', label: 'Just my phone (manual)' },
  { value: 'other', label: 'Other' },
]

type Tracker = { kind: 'strava' | 'garmin'; label: string; logo: string; color: string; desc: string; disabled: boolean; note: string }

const TRACKERS: Tracker[] = [
  { kind: 'garmin', label: 'Garmin', logo: 'https://cdn.brandfetch.io/garmin.com/w/256/h/256', color: '#007CC3', desc: 'Watch activities sync automatically', disabled: false, note: '' },
  { kind: 'strava', label: 'Strava', logo: 'https://cdn.brandfetch.io/strava.com/w/256/h/256', color: '#FC4C02', desc: 'Runs, rides, lifts and more', disabled: false, note: '' },
]

export default function ConnectPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [trainsWith, setTrainsWith] = useState<TrainsWith | null>(null)

  useEffect(() => {
    if (user?.trains_with) setTrainsWith(user.trains_with)
  }, [user?.trains_with])

  // Single-select, skippable. Saving is best-effort; the choice still drives what shows below.
  function answer(value: TrainsWith) {
    setTrainsWith(value)
    track('trains_with_' + value)
    fetch('/api/user/trains-with', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: value }),
    }).catch(() => null)
  }

  // Fire-and-forget funnel event (connect_viewed / connect_clicked_* / connect_skipped)
  function track(event: string) {
    if (!user) return
    supabase.from('funnel_events').insert({ user_id: user.id, event }).then(() => {}, () => {})
  }

  useEffect(() => {
    if (user) {
      supabase.from('funnel_events').insert({ user_id: user.id, event: 'connect_viewed' }).then(() => {}, () => {})
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function connect(kind: 'garmin' | 'strava') {
    if (!user || connecting) return
    setConnecting(kind)
    setError('')
    track('connect_clicked_' + kind)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      const endpoint = kind === 'strava' ? '/api/strava/connect' : '/api/garmin/connect'
      const res = await fetch(endpoint, { headers: { Authorization: 'Bearer ' + session.access_token } })
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Failed to get connection URL')
      window.location.href = json.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      setConnecting(null)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0E0E0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#B5593C', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' }}>Last step</p>
        <h1 style={{ fontFamily: 'Archivo, sans-serif', fontSize: 28, fontWeight: 900, color: '#F5F0EA', textAlign: 'center', marginBottom: 10, lineHeight: 1.15 }}>Connect your workouts</h1>
        <p style={{ color: '#8A8680', fontSize: 14, lineHeight: 1.6, textAlign: 'center', marginBottom: 24 }}>
          Synced workouts verify themselves and earn {VERIFIED_POINTS} coins. No wearable? Manual logs earn {UNVERIFIED_POINTS}.
        </p>

        {/* One question, skippable */}
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, fontWeight: 800, color: '#F5F0EA', marginBottom: 10 }}>
            What do you train with? <span style={{ color: '#8A8680', fontWeight: 600 }}>(optional)</span>
          </p>
          <div role="radiogroup" aria-label="What do you train with?" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DEVICE_OPTIONS.map(o => {
              const on = trainsWith === o.value
              return (
                <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => answer(o.value)}
                  style={{ padding: '9px 13px', borderRadius: 20, border: on ? '1.5px solid #B5593C' : '1.5px solid rgba(245,240,234,0.14)', background: on ? 'rgba(181,89,60,0.14)' : 'transparent', color: '#F5F0EA', fontSize: 13, fontWeight: 700, fontFamily: 'Archivo, sans-serif', cursor: 'pointer' }}>
                  {o.label}
                </button>
              )
            })}
          </div>
          {trainsWith === 'apple_watch' && (
            <div style={{ marginTop: 14 }}>
              <AppleWatchWaitlist source="onboarding" defaultEmail={isPlaceholderEmail(user?.email) ? '' : (user?.email ?? '')} />
            </div>
          )}
          {trainsWith === 'fitbit' && (
            <p style={{ marginTop: 14, color: '#C9C1B6', fontSize: 13, lineHeight: 1.5, background: '#171716', border: '1px solid #2A2927', borderRadius: 12, padding: 14 }}>
              Fitbit isn&rsquo;t supported yet. Manual logging works today and earns {UNVERIFIED_POINTS} coins a workout.
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {TRACKERS.map(t => (
            <button key={t.kind} onClick={() => !t.disabled && connect(t.kind)} disabled={connecting !== null || t.disabled}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: '#181714', border: '1.5px solid rgba(245,240,234,0.14)', borderRadius: 14, cursor: connecting || t.disabled ? 'default' : 'pointer', opacity: t.disabled ? 0.45 : connecting && connecting !== t.kind ? 0.5 : 1, textAlign: 'left', width: '100%' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: t.color + '18', border: '1px solid ' + t.color + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={t.logo} alt={t.label} style={{ width: '65%', height: '65%', objectFit: 'contain', borderRadius: 4 }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 16, fontWeight: 800, color: '#F5F0EA', marginBottom: 2 }}>
                  {connecting === t.kind ? 'Connecting…' : 'Connect ' + t.label}
                </p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: t.disabled ? '#B5593C' : '#8A8680' }}>{t.disabled ? t.note : t.desc}</p>
              </div>
              <span style={{ color: '#B5593C', fontSize: 18 }}>&rarr;</span>
            </button>
          ))}
          <Link href="/log" onClick={() => track('connect_chose_manual')}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: '#181714', border: '1.5px solid rgba(245,240,234,0.14)', borderRadius: 14, textDecoration: 'none', width: '100%' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(181,89,60,0.12)', border: '1px solid rgba(181,89,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#B5593C', fontSize: 22, fontWeight: 900 }}>+</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 16, fontWeight: 800, color: '#F5F0EA', marginBottom: 2 }}>No wearable? Log manually</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#8A8680' }}>{UNVERIFIED_POINTS} coins per manual log</p>
            </div>
            <span style={{ color: '#B5593C', fontSize: 18 }}>&rarr;</span>
          </Link>
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>{error}</p>}
        <Link href="/home" onClick={() => track('connect_skipped')} style={{ display: 'block', textAlign: 'center', color: '#8A8680', fontSize: 13, textDecoration: 'none', fontFamily: 'Archivo, sans-serif', padding: 12 }}>
          Skip for now. You can connect anytime from Profile
        </Link>
      </div>
    </div>
  )
}
