'use client'
import { useState } from 'react'
import { REFERRAL_BONUS } from '@/lib/points'

// Referral code + one-tap share. Bonus matches the award_referral_bonus trigger.
export default function InviteFriends({ code, compact = false }: { code: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const link = `https://countfitness.app/auth/signup?ref=${encodeURIComponent(code)}`
  const message = `I'm earning brand discounts for my workouts on COUNT. Join with my code ${code} and we both get ${REFERRAL_BONUS} coins after your first verified workout: ${link}`

  async function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Join me on COUNT', text: message, url: link })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    copy()
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy your invite link', link)
    }
  }

  const btn: React.CSSProperties = {
    flex: '1 1 0', minWidth: 0, padding: '11px 8px', borderRadius: 10, border: '1px solid rgba(245,240,234,0.14)',
    background: 'transparent', color: '#F5F0EA', fontSize: 13, fontWeight: 700, fontFamily: 'Archivo, sans-serif',
    textAlign: 'center', textDecoration: 'none', cursor: 'pointer',
  }

  return (
    <div style={{ background: '#171716', border: '1px solid rgba(245,240,234,0.10)', borderRadius: 16, padding: 16 }}>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9A9087', marginBottom: 6 }}>
        Invite friends
      </p>
      {!compact && (
        <p style={{ color: '#C9C1B6', fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
          Know someone who trains? Send them your link. You both get {REFERRAL_BONUS} coins after their first verified workout.
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: '#111110', borderRadius: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, letterSpacing: 3, color: '#F5F0EA' }}>{code}</span>
        <button onClick={copy} style={{ ...btn, flex: '0 0 auto', padding: '7px 12px' }}>{copied ? 'Copied' : 'Copy link'}</button>
      </div>
      <button onClick={share} style={{ ...btn, display: 'block', width: '100%', background: '#B5593C', border: 'none', padding: '13px', fontSize: 15, fontWeight: 800, marginBottom: 8 }}>
        Share invite link
      </button>
      <div style={{ display: 'flex', gap: 8 }}>
        <a href={`sms:?&body=${encodeURIComponent(message)}`} style={btn}>Text</a>
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener" style={btn}>WhatsApp</a>
      </div>
    </div>
  )
}
