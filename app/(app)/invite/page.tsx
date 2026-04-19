'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { getReferralPoints } from '@/lib/points'
import { createClient } from '@/lib/supabase'
import Icon from '@/components/Icon'

interface ReferralRow {
  id: string
  bonus_awarded: boolean
  created_at: string
  referred: { name: string } | null
}

const REFERRAL_MILESTONES = [
  { count: 1,  icon: 'Target', label: 'First Invite', color: '#B5593C' },
  { count: 3,  icon: 'Flame', label: 'On a Roll',    color: '#FB923C' },
  { count: 5,  icon: 'Zap', label: 'Recruiter',    color: '#D97706' },
  { count: 10, icon: 'Trophy', label: 'Legend',       color: '#7C3AED' },
]

export default function InvitePage() {
  const { user } = useAuth()
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [copied, setCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
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

  const referralLink = `https://countfitness.app/auth/signup?ref=${user.referral_code ?? ''}`
  const bonusPerReferral   = getReferralPoints(user.tier)
  const pendingBonus       = referrals.filter(r => !r.bonus_awarded).length * bonusPerReferral
  const earnedBonus        = referrals.filter(r => r.bonus_awarded).length * bonusPerReferral
  const totalReferrals     = referrals.length
  const nextMilestone      = REFERRAL_MILESTONES.find(m => m.count > totalReferrals)
  const prevMilestoneCount = [...REFERRAL_MILESTONES].reverse().find(m => m.count <= totalReferrals)?.count ?? 0
  const milestoneProgress  = nextMilestone
    ? ((totalReferrals - prevMilestoneCount) / (nextMilestone.count - prevMilestoneCount)) * 100
    : 100

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on COUNT',
          text: `I've been earning points every time I work out. Join COUNT with my code ${user?.referral_code} and we both get ${bonusPerReferral} bonus points! ðª`,
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
    if (!user) return
    await navigator.clipboard.writeText(user.referral_code ?? '')
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(referralLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 100, maxWidth: 448, margin: '0 auto', background: '#0E0E0D', minHeight: '100dvh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/home" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 10, textDecoration: 'none', fontSize: 16, color: '#F5F0EA' }}>â</Link>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, fontFamily: "'Archivo', sans-serif", color: '#F5F0EA' }}>Invite Friends</h1>
          <p style={{ fontSize: 12, color: '#8A8478' }}>Grow the squad, earn together</p>
        </div>
      </div>

      {/* Hero card â "Both get coins" emphasis */}
      <div style={{ background: 'linear-gradient(145deg, #1C1209 0%, #111110 50%, #0E0E0D 100%)', borderRadius: 22, padding: '28px 22px', marginBottom: 16, position: 'relative', overflow: 'hidden', border: '1.5px solid rgba(181,89,60,0.20)' }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(181,89,60,0.18) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 65%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* "Both earn" visual */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(181,89,60,0.15)', border: '1.5px solid rgba(181,89,60,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 6px' }}>
                <Icon emoji="Dumbbell" size={32} />
              </div>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1 }}>You</p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 900, color: '#22c55e' }}>+{bonusPerReferral}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ display: 'flex' }}><Icon emoji="Share2" size={20} /></span>
              <div style={{ width: 40, height: 2, background: 'linear-gradient(90deg, rgba(181,89,60,0.5), rgba(34,197,94,0.5))', borderRadius: 1 }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(34,197,94,0.12)', border: '1.5px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 6px' }}>
                <Icon emoji="SmilePlus" size={32} />
              </div>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1 }}>Friend</p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 900, color: '#22c55e' }}>+{bonusPerReferral}</p>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#F5F0EA', fontFamily: "'Archivo', sans-serif", marginBottom: 4 }}>You both earn {bonusPerReferral} coins</p>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#8A8478', marginBottom: 20 }}>When your friend logs their first workout</p>

          {/* Referral code */}
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 6, textAlign: 'center' }}>Your code</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, background: 'rgba(245,240,234,0.04)', border: '1px solid rgba(245,240,234,0.08)', borderRadius: 14, padding: '12px 16px' }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, fontWeight: 900, color: '#F5F0EA', letterSpacing: 8, flex: 1, textAlign: 'center', lineHeight: 1 }}>
              {user.referral_code ?? '------'}
            </p>
            <button onClick={handleCopyCode} style={{ padding: '8px 14px', background: codeCopied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)', color: codeCopied ? '#22c55e' : '#9CA3AF', border: `1px solid ${codeCopied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s' }}>
              {codeCopied ? 'â Copied' : 'â Copy'}
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleShare} style={{ flex: 2, padding: '14px', background: 'linear-gradient(135deg, #B5593C 0%, #D4734F 100%)', color: '#F5F0EA', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: "'Archivo', sans-serif" }}>
              {copied ? 'â Link Copied!' : 'Share Invite Link â'}
            </button>
            <button onClick={handleCopyLink} style={{ flex: 1, padding: '14px', background: 'rgba(181,89,60,0.10)', color: '#B5593C', border: '1.5px solid rgba(181,89,60,0.25)', borderRadius: 14, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {linkCopied ? 'â' : <Icon emoji="Link2" size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 900, color: '#B5593C', lineHeight: 1 }}>{referrals.length}</p>
          <p style={{ fontSize: 10, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Friends joined</p>
        </div>
        <div style={{ flex: 1, background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 900, color: '#22c55e', lineHeight: 1 }}>+{earnedBonus}</p>
          <p style={{ fontSize: 10, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Coins earned</p>
        </div>
        {pendingBonus > 0 && (
          <div style={{ flex: 1, background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>+{pendingBonus}</p>
            <p style={{ fontSize: 10, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Pending</p>
          </div>
        )}
      </div>

      {/* Milestone progress */}
      {nextMilestone ? (
        <div style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ fontSize: 12, color: '#8A8478', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon emoji={nextMilestone.icon} size={16} />
              {nextMilestone.count - totalReferrals} more to unlock &ldquo;{nextMilestone.label}&rdquo;
            </p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#F5F0EA', fontWeight: 700 }}>{totalReferrals}/{nextMilestone.count}</p>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(milestoneProgress, 100)}%`, background: `linear-gradient(90deg, ${nextMilestone.color}, ${nextMilestone.color}dd)`, borderRadius: 3, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0.06) 100%)', border: '1.5px solid rgba(124,58,237,0.20)', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex' }}><Icon emoji="Trophy" size={24} /></span>
          <div>
            <p style={{ fontSize: 14, color: '#F5F0EA', fontWeight: 800, fontFamily: "'Archivo', sans-serif" }}>Referral Legend!</p>
            <p style={{ fontSize: 11, color: '#8A8478' }}>You&apos;ve unlocked every milestone</p>
          </div>
        </div>
      )}

      {/* Milestone badges */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {REFERRAL_MILESTONES.map(m => {
          const unlocked = totalReferrals >= m.count
          return (
            <div key={m.count} style={{ flex: 1, background: unlocked ? 'rgba(245,240,234,0.04)' : 'rgba(255,255,255,0.02)', border: `1.5px solid ${unlocked ? m.color + '40' : 'rgba(245,240,234,0.04)'}`, borderRadius: 14, padding: '12px 6px', textAlign: 'center', opacity: unlocked ? 1 : 0.40, transition: 'all 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 22, filter: unlocked ? 'none' : 'grayscale(1)', display: 'flex', marginBottom: 6 }}>
                {unlocked ? <Icon emoji={m.icon} size={20} /> : <Icon emoji="Lock" size={20} />}
              </div>
              <p style={{ fontSize: 9, fontWeight: 800, color: unlocked ? m.color : '#8A8478', textTransform: 'uppercase', letterSpacing: 0.3 }}>{m.label}</p>
              <p style={{ fontSize: 8, color: '#8A8478', marginTop: 2 }}>{m.count} friend{m.count > 1 ? 's' : ''}</p>
            </div>
          )
        })}
      </div>

      {/* How it works */}
      <div style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 16, padding: '18px 16px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 14 }}>How it works</p>
        {[
          { num: '1', icon: 'Link2', title: 'Share your link or code',     desc: 'Send your unique referral link to a friend.' },
          { num: '2', icon: 'Pencil', title: 'Friend signs up',              desc: "They enter your code during signup â it's pre-filled from your link." },
          { num: '3', icon: 'Dumbbell', title: 'They log their first workout', desc: 'Once they complete their first session, the bonus triggers.' },
          { num: '4', icon: 'Gift', title: `You BOTH get ${bonusPerReferral} coins`, desc: 'Bonus coins land in both accounts instantly.' },
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: i < 3 ? 14 : 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, rgba(181,89,60,0.15) 0%, rgba(181,89,60,0.08) 100%)', border: '1.5px solid rgba(181,89,60,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <Icon emoji={step.icon} size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#F5F0EA', marginBottom: 2 }}>{step.title}</p>
              <p style={{ fontSize: 12, color: '#8A8478', lineHeight: 1.4 }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Your referrals list */}
      {referrals.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 10 }}>Your referrals</p>
          <div style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 16, overflow: 'hidden' }}>
            {referrals.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderTop: i > 0 ? '1px solid rgba(245,240,234,0.06)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: r.bonus_awarded ? 'rgba(34,197,94,0.12)' : 'rgba(181,89,60,0.12)', border: `1.5px solid ${r.bonus_awarded ? 'rgba(34,197,94,0.25)' : 'rgba(181,89,60,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: r.bonus_awarded ? '#22c55e' : '#B5593C' }}>
                    {(r.referred?.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#F5F0EA' }}>{r.referred?.name ?? 'Friend'}</p>
                    <p style={{ fontSize: 11, color: '#8A8478' }}>Joined {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {r.bonus_awarded
                    ? <span style={{ fontSize: 13, fontWeight: 800, color: '#22c55e', fontFamily: "'JetBrains Mono', monospace" }}>+{bonusPerReferral} â</span>
                    : <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, background: 'rgba(245,158,11,0.08)', padding: '4px 10px', borderRadius: 6 }}>Awaiting 1st workout</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for no referrals */}
      {referrals.length === 0 && (
        <div style={{ background: '#111110', border: '1.5px dashed rgba(245,240,234,0.10)', borderRadius: 16, padding: '28px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
            <Icon emoji="Users" size={40} />
          </p>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#F5F0EA', fontFamily: "'Archivo', sans-serif", marginBottom: 4 }}>No referrals yet</p>
          <p style={{ fontSize: 12, color: '#8A8478', marginBottom: 16, lineHeight: 1.4 }}>Share your code with friends who work out â you&apos;ll both earn {bonusPerReferral} bonus coins when they join!</p>
          <button onClick={handleShare} style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #B5593C 0%, #D4734F 100%)', color: '#F5F0EA', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: "'Archivo', sans-serif" }}>
            Share Your Code â
          </button>
        </div>
      )}
    </div>
  )
}
