'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { getReferralPoints } from '@/lib/points'
import { createClient } from '@/lib/supabase'

interface ReferralRow {
  id: string
  bonus_awarded: boolean
  created_at: string
  referred: { name: string } | null
}

const REFERRAL_MILESTONES = [
  { count: 1,  emoji: '🎯', label: 'First Invite',    color: '#B5593C' },
  { count: 3,  emoji: '🔥', label: 'On a Roll',       color: '#FB923C' },
  { count: 5,  emoji: '⚡', label: 'Recruiter',       color: '#D97706' },
  { count: 10, emoji: '🏆', label: 'Legend',          color: '#7C3AED' },
]

export default function InvitePage() {
  const { user } = useAuth()
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [copied, setCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('referrals')
      .select('id, bonus_awarded, created_at, referred:referred_id(name)')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setReferrals(data as unknown as ReferralRow[])
      })
  }, [user?.id]) // eslint-disable-line

  if (!user) return null

  const referralLink = `https://count-fitness-app.vercel.app/auth/signup?ref=${user.referral_code ?? ''}`
  const bonusPerReferral = getReferralPoints(user.tier)
  const pendingBonus = referrals.filter(r => !r.bonus_awarded).length * bonusPerReferral
  const earnedBonus = referrals.filter(r => r.bonus_awarded).length * bonusPerReferral
  const totalReferrals = referrals.length

  const nextMilestone = REFERRAL_MILESTONES.find(m => m.count > totalReferrals)
  const prevMilestoneCount = [...REFERRAL_MILESTONES].reverse().find(m => m.count <= totalReferrals)?.count ?? 0
  const milestoneProgress = nextMilestone
    ? ((totalReferrals - prevMilestoneCount) / (nextMilestone.count - prevMilestoneCount)) * 100
    : 100

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on COUNT',
          text: `I've been earning points every time I work out. Join COUNT with my code ${user?.referral_code} and we both get ${bonusPerReferral} bonus points! 💪`,
          url: referralLink,
        })
      } catch {}
    } else {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(user.referral_code ?? '')
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 100, maxWidth: 448, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/home" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 10, textDecoration: 'none', fontSize: 16 }}>
          ←
        </Link>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, fontFamily: "'Archivo', sans-serif" }}>Invite Friends</h1>
          <p style={{ fontSize: 12, color: '#8A8478' }}>{`You and your friend each get ${bonusPerReferral} pts`}</p>
        </div>
      </div>

      {/* Hero share card */}
      <div style={{ background: '#111110', borderRadius: 20, padding: '24px 20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: '#B5593C', opacity: 0.15 }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: '#B5593C', opacity: 0.10 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 6 }}>Your referral code</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 34, fontWeight: 900, color: '#F5F0EA', letterSpacing: 8, flex: 1, lineHeight: 1 }}>
              {user.referral_code ?? '------'}
            </p>
            <button
              onClick={handleCopyCode}
              style={{ padding: '8px 14px', background: codeCopied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)', color: codeCopied ? '#22c55e' : '#9CA3AF', border: `1px solid ${codeCopied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {codeCopied ? '✓ Copied' : '⎘ Copy'}
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, background: 'rgba(245,240,234,0.07)', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 900, color: '#B5593C' }}>{referrals.length}</p>
              <p style={{ fontSize: 10, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1 }}>Friends joined</p>
            </div>
            <div style={{ flex: 1, background: 'rgba(245,240,234,0.07)', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 900, color: '#22c55e' }}>+{earnedBonus}</p>
              <p style={{ fontSize: 10, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1 }}>Pts earned</p>
            </div>
            {pendingBonus > 0 && (
              <div style={{ flex: 1, background: 'rgba(245,240,234,0.07)', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 900, color: '#f59e0b' }}>+{pendingBonus}</p>
                <p style={{ fontSize: 10, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1 }}>Pending</p>
              </div>
            )}
          </div>

          {/* Milestone progress */}
          {nextMilestone ? (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ fontSize: 11, color: '#8A8478' }}>
                  {nextMilestone.emoji} {nextMilestone.count - totalReferrals} more to unlock &ldquo;{nextMilestone.label}&rdquo;
                </p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#F5F0EA' }}>
                  {totalReferrals}/{nextMilestone.count}
                </p>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(milestoneProgress, 100)}%`, background: nextMilestone.color, borderRadius: 3 }} />
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(124,58,237,0.15)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🏆</span>
              <p style={{ fontSize: 13, color: '#F5F0EA', fontWeight: 700 }}>You&apos;re a referral legend!</p>
            </div>
          )}

          <button
            onClick={handleShare}
            style={{ width: '100%', padding: '14px', background: '#B5593C', color: '#F5F0EA', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: "'Archivo', sans-serif" }}
          >
            {copied ? '✓ Link Copied!' : 'Share Your Invite Link →'}
          </button>
        </div>
      </div>

      {/* Milestone badges strip */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {REFERRAL_MILESTONES.map(m => {
          const unlocked = totalReferrals >= m.count
          return (
            <div key={m.count} style={{ flex: 1, background: unlocked ? '#111110' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${unlocked ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`, borderRadius: 12, padding: '10px 6px', textAlign: 'center', opacity: unlocked ? 1 : 0.45 }}>
              <span style={{ fontSize: 20, filter: unlocked ? 'none' : 'grayscale(1)', display: 'block' }}>{m.emoji}</span>
              <p style={{ fontSize: 9, fontWeight: 800, color: unlocked ? m.color : '#8A8478', marginTop: 5, textTransform: 'uppercase', letterSpacing: 0.3 }}>{m.count} friend{m.count > 1 ? 's' : ''}</p>
            </div>
          )
        })}
      </div>

      {/* How it works */}
      <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, padding: '16px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8A8478', marginBottom: 12 }}>How it works</p>
        {[
          { icon: '🔗', title: 'Share your link or code', desc: 'Send your unique referral link to a friend.' },
          { icon: '✍️', title: 'Friend signs up', desc: "They enter your code during signup — it's pre-filled from your link." },
          { icon: '💪', title: 'They log their first workout', desc: 'Once they complete their first session, the bonus triggers.' },
          { icon: '🏆', title: `You both get ${bonusPerReferral} pts`, desc: 'Bonus points land in both accounts instantly.' },
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 3 ? 12 : 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#FDF5F1', border: '1.5px solid #F0E8E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, marginTop: 1 }}>
              {step.icon}
            </div>
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
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#22c55e' }}>{`+${bonusPerReferral} pts ✓`}</span>
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
