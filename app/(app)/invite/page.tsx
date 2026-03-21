'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'

interface ReferralRow {
  id: string
  bonus_awarded: boolean
  created_at: string
  referred: { name: string } | null
}

export default function InvitePage() {
  const { user } = useAuth()
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('referrals')
      .select('id, bonus_awarded, created_at, referred:referred_id(name)')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setReferrals(data as ReferralRow[])
      })
  }, [user?.id]) // eslint-disable-line

  if (!user) return null

  const referralLink = `https://count-fitness-app.vercel.app/auth/signup?ref=${user.referral_code ?? ''}`
  const pendingBonus = referrals.filter(r => !r.bonus_awarded).length * 500
  const earnedBonus  = referrals.filter(r => r.bonus_awarded).length * 500

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on COUNT',
          text: `I've been earning points every time I work out. Join COUNT with my code ${user.referral_code} and we both get 500 bonus points! 💪`,
          url: referralLink,
        })
      } catch {}
    } else {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 100, maxWidth: 448, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/home" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 10, textDecoration: 'none', fontSize: 16 }}>
          ←
        </Link>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif' }}>Invite Friends</h1>
          <p style={{ fontSize: 12, color: '#8A8478' }}>You and your friend each get 500 pts</p>
        </div>
      </div>

      {/* Hero share card */}
      <div style={{ background: '#111110', borderRadius: 20, padding: '24px 20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: '#B5593C', opacity: 0.15 }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: '#B5593C', opacity: 0.10 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 6 }}>Your referral code</p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 36, fontWeight: 900, color: '#F5F0EA', letterSpacing: 8, marginBottom: 16 }}>
            {user.referral_code ?? '------'}
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, background: 'rgba(245,240,234,0.07)', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color: '#B5593C' }}>{referrals.length}</p>
              <p style={{ fontSize: 10, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1 }}>Friends joined</p>
            </div>
            <div style={{ flex: 1, background: 'rgba(245,240,234,0.07)', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color: '#22c55e' }}>+{earnedBonus}</p>
              <p style={{ fontSize: 10, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1 }}>Pts earned</p>
            </div>
            {pendingBonus > 0 && (
              <div style={{ flex: 1, background: 'rgba(245,240,234,0.07)', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color: '#f59e0b' }}>+{pendingBonus}</p>
                <p style={{ fontSize: 10, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1 }}>Pending</p>
              </div>
            )}
          </div>

          <button
            onClick={handleShare}
            style={{ width: '100%', padding: '14px', background: '#B5593C', color: '#F5F0EA', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Archivo, sans-serif' }}
          >
            {copied ? '✓ Link Copied!' : 'Share Your Invite Link →'}
          </button>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, padding: '16px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8A8478', marginBottom: 12 }}>How it works</p>
        {[
          { icon: '🔗', title: 'Share your link or code', desc: 'Send your unique referral link to a friend.' },
          { icon: '✍️', title: 'Friend signs up', desc: 'They enter your code during signup — it's pre-filled from your link.' },
          { icon: '💪', title: 'They log their first workout', desc: 'Once they complete their first session, the bonus triggers.' },
          { icon: '🏆', title: 'You both get 500 pts', desc: 'Bonus points land in both accounts instantly.' },
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 3 ? 12 : 0 }}>
            <span style={{ fontSize: 18, marginTop: 1 }}>{step.icon}</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111110', marginBottom: 2 }}>{step.title}</p>
              <p style={{ fontSize: 12, color: '#8A8478' }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Referral history */}
      {referrals.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8A8478', marginBottom: 10 }}>Your referrals</p>
          <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, overflow: 'hidden' }}>
            {referrals.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: i > 0 ? '1px solid #F0EDE6' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FDF5F1', border: '1.5px solid #E0D9CE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#B5593C' }}>
                    {(r.referred?.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{r.referred?.name ?? 'Friend'}</p>
                    <p style={{ fontSize: 11, color: '#8A8478' }}>{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {r.bonus_awarded ? (
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#22c55e' }}>+500 pts ✓</span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>Awaiting 1st workout</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
