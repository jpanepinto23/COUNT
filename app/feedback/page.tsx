'use client'

import { useState } from 'react'

const WOULD_USE = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' },
]

const archivo = 'Archivo, sans-serif'
const mono = 'JetBrains Mono, monospace'

export default function FeedbackPage() {
  const [tryingToDo, setTryingToDo] = useState('')
  const [whatGotInWay, setWhatGotInWay] = useState('')
  const [wouldUse, setWouldUse] = useState<string | null>(null)
  const [contact, setContact] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const canSubmit = Boolean(tryingToDo.trim() || whatGotInWay.trim() || wouldUse) && status !== 'sending'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setStatus('sending')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'web_form',
          trying_to_do: tryingToDo,
          what_got_in_way: whatGotInWay,
          would_use: wouldUse,
          contact,
          page: typeof window !== 'undefined' ? window.location.href : null,
        }),
      })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  const labelStyle: React.CSSProperties = { display: 'block', fontFamily: archivo, fontSize: 14, fontWeight: 700, color: '#B0A89E', marginBottom: 8 }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '13px 14px', background: '#1A1A19', border: '1px solid #252523', borderRadius: 10, color: '#F5F0EA', fontSize: 14, outline: 'none', fontFamily: mono, resize: 'vertical', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100dvh', background: '#111110', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 64px' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{ position: 'relative', width: 20, height: 17 }}>
            {[0, 5, 10].map(left => (
              <div key={left} style={{ position: 'absolute', top: 0, width: 2, height: 17, background: '#F5F0EA', borderRadius: 1, left }} />
            ))}
            <div style={{ position: 'absolute', top: 5, left: 1.5, width: 13, height: 1.5, background: '#B5593C', borderRadius: 1, transform: 'rotate(-30deg)' }} />
          </div>
          <span style={{ fontFamily: archivo, fontSize: 14, fontWeight: 900, color: '#F5F0EA', letterSpacing: '0.15em', textTransform: 'uppercase' }}>COUNT</span>
        </div>

        {status === 'done' ? (
          <div style={{ padding: '40px 0' }}>
            <h1 style={{ fontFamily: archivo, fontSize: 28, fontWeight: 900, color: '#F5F0EA', marginBottom: 12, lineHeight: 1.1 }}>Thank you — that actually helps.</h1>
            <p style={{ color: '#9A9087', fontSize: 15, lineHeight: 1.6 }}>Every note comes straight to me. If you left contact info, I may follow up personally. — Joe</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h1 style={{ fontFamily: archivo, fontSize: 30, fontWeight: 900, color: '#F5F0EA', marginBottom: 10, lineHeight: 1.05 }}>
              Tell me what&apos;s <span style={{ color: '#B5593C' }}>broken.</span>
            </h1>
            <p style={{ color: '#9A9087', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
              I&apos;m the founder. 60 seconds of honesty here is worth more to me than a polite thumbs-up. Skip anything you want.
            </p>

            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>What were you trying to do?</label>
              <textarea rows={2} value={tryingToDo} onChange={e => setTryingToDo(e.target.value)} placeholder="e.g. log a run and see what it's worth" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>What got in the way, confused you, or felt off?</label>
              <textarea rows={3} value={whatGotInWay} onChange={e => setWhatGotInWay(e.target.value)} placeholder="Be blunt. This is the useful part." style={inputStyle} />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>Would you actually use this?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {WOULD_USE.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setWouldUse(o.value)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: archivo,
                      background: wouldUse === o.value ? '#B5593C' : '#1A1A19',
                      color: wouldUse === o.value ? '#F5F0EA' : '#9A9087',
                      border: `1px solid ${wouldUse === o.value ? '#B5593C' : '#252523'}`,
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Email or handle <span style={{ color: '#555', fontWeight: 400 }}>(optional)</span></label>
              <input value={contact} onChange={e => setContact(e.target.value)} placeholder="you@example.com or @yourhandle" style={inputStyle} />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                width: '100%', padding: '16px', borderRadius: 12, border: 'none', fontFamily: archivo, fontSize: 16, fontWeight: 800,
                background: canSubmit ? '#B5593C' : '#3A3A38', color: '#F5F0EA', cursor: canSubmit ? 'pointer' : 'default',
              }}
            >
              {status === 'sending' ? 'Sending…' : 'Send feedback'}
            </button>

            {status === 'error' && (
              <p style={{ color: '#E0654A', fontSize: 13, marginTop: 12, fontFamily: mono }}>Something broke on my end. Try again in a sec?</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
