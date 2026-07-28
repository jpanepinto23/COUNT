'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'

const TRACKERS = [
  { kind: 'strava', label: 'Strava', logo: 'https://cdn.brandfetch.io/strava.com/w/256/h/256', color: '#FC4C02', desc: 'Runs, rides & more', disabled: false, note: '' },
  { kind: 'garmin', label: 'Garmin', logo: 'https://cdn.brandfetch.io/garmin.com/w/256/h/256', color: '#007CC3', desc: 'Watches & bike computers', disabled: true, note: 'Back Aug 20 — use Strava meanwhile' },
] as const

export default function ConnectPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState('')

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
      const endpoint = kind === 'strava' ? '/api/strava/connect' : '/api/terra/connect?provider=GARMIN'
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
        <h1 style={{ fontFamily: 'Archivo, sans-serif', fontSize: 28, fontWeight: 900, color: '#F5F0EA', textAlign: 'center', marginBottom: 10, lineHeight: 1.15 }}>Connect your tracker</h1>
        <p style={{ color: '#8A8680', fontSize: 14, lineHeight: 1.6, textAlign: 'center', marginBottom: 28 }}>
          Workouts sync and verify automatically — and verified sessions earn a 25% bonus. No double-logging.
        </p>
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
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>{error}</p>}
        <Link href="/home" onClick={() => track('connect_skipped')} style={{ display: 'block', textAlign: 'center', color: '#8A8680', fontSize: 13, textDecoration: 'none', fontFamily: 'Archivo, sans-serif', padding: 12 }}>
          Skip for now — you can connect anytime from Profile
        </Link>
      </div>
    </div>
  )
}
