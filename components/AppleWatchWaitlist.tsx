'use client'
import { useState } from 'react'

// Interest capture only. Apple Watch is not supported yet; this stores an email for launch news.
export default function AppleWatchWaitlist({
  source,
  defaultEmail = '',
}: {
  source: 'homepage' | 'onboarding'
  defaultEmail?: string
}) {
  const [email, setEmail] = useState(defaultEmail)
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Enter a valid email')
      return
    }
    setState('saving')
    setError('')
    const res = await fetch('/api/apple-watch-waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: value, source }),
    }).catch(() => null)
    if (res?.ok) setState('done')
    else {
      setState('idle')
      setError('Could not save. Try again.')
    }
  }

  return (
    <div style={{ background: '#171716', border: '1px solid #2A2927', borderRadius: 14, padding: 16 }}>
      <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 15, fontWeight: 800, color: '#F5F0EA', marginBottom: 4 }}>
        Apple Watch isn&rsquo;t supported yet
      </p>
      <p style={{ color: '#9A9087', fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
        Leave your email and we&rsquo;ll tell you if it launches. Until then, manual logs earn 200 coins.
      </p>
      {state === 'done' ? (
        <p role="status" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#86efac', fontWeight: 700 }}>
          You&rsquo;re on the list.
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            aria-label="Email for Apple Watch launch news"
            style={{ flex: '1 1 180px', minWidth: 0, padding: '12px 14px', border: '1.5px solid #2E2C29', borderRadius: 10, background: '#111110', color: '#F5F0EA', fontSize: 15, fontFamily: 'Archivo, sans-serif', outline: 'none' }}
          />
          <button
            type="submit"
            disabled={state === 'saving'}
            style={{ flex: '0 0 auto', padding: '12px 16px', border: '1.5px solid #B5593C', borderRadius: 10, background: 'transparent', color: '#F5F0EA', fontSize: 14, fontWeight: 800, fontFamily: 'Archivo, sans-serif', cursor: 'pointer' }}
          >
            {state === 'saving' ? 'Saving…' : 'Join the waitlist'}
          </button>
        </form>
      )}
      {error && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{error}</p>}
    </div>
  )
}
