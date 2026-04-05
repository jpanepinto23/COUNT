'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import type { Reward, RewardType } from '@/lib/types'

// ── dark theme tokens ──
const BG       = '#0E0E0D'
const CARD     = '#111110'
const CARD2    = '#1A1A18'
const BORDER   = 'rgba(245,240,234,0.08)'
const BORDER_A = 'rgba(181,89,60,0.30)'
const TEXT     = '#F5F0EA'
const MUTED    = 'rgba(245,240,234,0.45)'
const STONE    = '#8A8478'
const COPPER   = '#B5593C'
const GREEN    = '#16a34a'

function getStreakMultiplier(streak: number): { multiplier: string; color: string } {
  if (streak >= 14) return { multiplier: '2x', color: '#7c3aed' }
  if (streak >= 7)  return { multiplier: '1.5x', color: '#dc2626' }
  if (streak >= 3)  return { multiplier: '1.2x', color: '#ea580c' }
  return { multiplier: '1x', color: STONE }
}

function getNextStreakMilestone(streak: number): { days: number; multiplier: string } | null {
  if (streak < 3)  return { days: 3,  multiplier: '1.2x' }
  if (streak < 7)  return { days: 7,  multiplier: '1.5x' }
  if (streak < 14) return { days: 14, multiplier: '2x' }
  return null
}

function getNextMilestone(sessions: number): { target: number; bonus: number } | null {
  if (sessions < 10) return { target: 10, bonus: 50 }
  if (sessions < 25) return { target: 25, bonus: 150 }
  if (sessions < 50) return { target: 50, bonus: 400 }
  return null
}

interface FulfillmentData {
  reward_type: RewardType
  fulfillment_value?: string
  affiliate_url?: string
}

export default function RewardsPage() {
  const { user, refreshUser } = useAuth()
  const [rewards, setRewards]           = useState<Reward[]>([])
  const [redeeming, setRedeeming]       = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [successReward, setSuccessReward] = useState<Reward | null>(null)
  const [fulfillmentData, setFulfillmentData] = useState<FulfillmentData | null>(null)
  const [copied, setCopied]             = useState(false)
  const [weeklyWorkouts, setWeeklyWorkouts] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('rewards').select('*').eq('is_active', true).order('point_cost').then(({ data }) => {
      if (data) setRewards(data)
    })
    if (user) {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const monday = new Date(now)
      monday.setDate(now.getDate() - daysFromMonday)
      monday.setHours(0, 0, 0, 0)
      supabase
        .from('workouts')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('logged_at', monday.toISOString())
        .then(({ count }) => { setWeeklyWorkouts(count ?? 0) })
    }
  }, []) // eslint-disable-line

  if (!user) return null

  async function handleRedeem(reward: Reward) {
    if (!user || user.points_balance < reward.point_cost || redeeming || reward.coming_soon) return
    setRedeeming(reward.id)
    setError(null)
    try {
      const resp = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reward_id: reward.id,
          user_id: user.id,
          points_spent: reward.point_cost,
          product_name: reward.product_name,
          brand_name: reward.brand_name,
          user_email: user.email,
          user_name: user.name,
          reward_type: reward.reward_type ?? 'gift_card',
          fulfillment_value: reward.fulfillment_value,
          affiliate_url: reward.affiliate_url,
        }),
      })
      if (resp.ok) {
        const data = await resp.json()
        await refreshUser()
        setSuccessReward(reward)
        setFulfillmentData({
          reward_type: data.reward_type ?? reward.reward_type ?? 'gift_card',
          fulfillment_value: data.fulfillment_value,
          affiliate_url: data.affiliate_url,
        })
      } else {
        const body = await resp.json().catch(() => ({}))
        setError(body.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setRedeeming(null)
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── SUCCESS SCREEN ──
  if (successReward && fulfillmentData) {
    const { reward_type, fulfillment_value, affiliate_url } = fulfillmentData
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: BG }}>
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <p style={{ fontSize: 56, marginBottom: 8 }}>
            {reward_type === 'gift_card' ? '&#x1F381;' : reward_type === 'discount_code' ? '&#x1F3F7;' : '&#x1F517;'}
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif', marginBottom: 8, color: TEXT }}>
            {reward_type === 'gift_card' ? 'Redemption confirmed!' : 'Your reward is ready!'}
          </h2>
          <p style={{ color: STONE, fontSize: 14, marginBottom: 24 }}>
            You spent <strong style={{ color: TEXT }}>{successReward.point_cost.toLocaleString()} coins</strong> on {successReward.product_name}
          </p>

          {reward_type === 'discount_code' && fulfillment_value && (
            <div style={{ background: 'rgba(22,163,74,0.10)', border: '1.5px solid rgba(22,163,74,0.25)', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
              <p style={{ color: '#86efac', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Your Promo Code</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 26, fontWeight: 900, letterSpacing: 4, color: TEXT, margin: '0 0 14px' }}>{fulfillment_value}</p>
              <button onClick={() => handleCopy(fulfillment_value)} style={{ background: copied ? GREEN : COPPER, color: TEXT, border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              {successReward.affiliate_url && (
                <a href={successReward.affiliate_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 10, color: COPPER, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  Shop {successReward.brand_name} &rarr;
                </a>
              )}
            </div>
          )}

          {reward_type === 'affiliate_link' && affiliate_url && (
            <div style={{ marginBottom: 20 }}>
              <a href={affiliate_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', background: COPPER, color: TEXT, borderRadius: 12, padding: '16px 24px', fontSize: 15, fontWeight: 800, textDecoration: 'none', marginBottom: 10 }}>
                Claim Your {successReward.brand_name} Reward &rarr;
              </a>
              <p style={{ color: MUTED, fontSize: 12 }}>This link is exclusive to you. It will also be sent to your email.</p>
            </div>
          )}

          {reward_type === 'gift_card' && (
            <div style={{ background: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: 'left' }}>
              <p style={{ color: '#86efac', fontWeight: 700, marginBottom: 4, fontSize: 14 }}>Gift card incoming!</p>
              <p style={{ color: '#86efac', fontSize: 13, margin: 0, opacity: 0.8 }}>
                Your <strong>{successReward.product_name}</strong> code will be emailed to <strong>{user?.email}</strong> within 24&#8211;48 hours. Check your spam folder too.
              </p>
            </div>
          )}

          <button onClick={() => { setSuccessReward(null); setFulfillmentData(null); setCopied(false) }} style={{ background: CARD2, color: TEXT, border: '1.5px solid ' + BORDER, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '12px 28px' }}>
            Back to Shop
          </button>
        </div>
      </div>
    )
  }

  // ── COMPUTED VALUES ──
  const streakInfo    = getStreakMultiplier(user.current_streak)
  const nextStreak    = getNextStreakMilestone(user.current_streak)
  const nextMilestone = getNextMilestone(user.lifetime_sessions)
  const featured      = rewards.filter(r => r.is_featured)
  const rest          = rewards.filter(r => !r.is_featured)
  const weeklyGoal    = weeklyWorkouts >= 5 ? 5 : 3
  const weeklyBonus   = weeklyGoal === 5 ? 50 : 20
  const weeklyProgress = Math.min(weeklyWorkouts / weeklyGoal, 1)
  const weeklyDone    = weeklyWorkouts >= weeklyGoal
  const milestoneProgress = nextMilestone
    ? (() => {
        const prev = nextMilestone.target === 10 ? 0 : nextMilestone.target === 25 ? 10 : 25
        return Math.min((user.lifetime_sessions - prev) / (nextMilestone.target - prev), 1)
      })()
    : 1
  const cheapestUnaffordable = rewards.find(r => !r.coming_soon && r.point_cost > user.points_balance)
  const coinsToNextReward    = cheapestUnaffordable ? cheapestUnaffordable.point_cost - user.points_balance : null

  return (
    <div style={{ padding: '24px 16px', paddingBottom: 40, background: BG, minHeight: '100dvh' }}>

      {/* ── COIN BALANCE ── */}
      <p style={{ color: STONE, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
        COUNT Coins
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 48, fontWeight: 900, color: COPPER, lineHeight: 1 }}>
          {user.points_balance.toLocaleString()}
        </span>
      </div>
      {coinsToNextReward !== null ? (
        <p style={{ color: MUTED, fontSize: 13, marginBottom: 0 }}>
          {coinsToNextReward.toLocaleString()} more coins until your next reward
        </p>
      ) : (
        <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 0 }}>
          You can redeem rewards now
        </p>
      )}

      {/* ── STREAK BANNER ── */}
      <div style={{ marginTop: 20, background: user.current_streak >= 3 ? '#1A1108' : CARD, border: '1.5px solid ' + (user.current_streak >= 3 ? 'rgba(181,89,60,0.35)' : BORDER), borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 900, fontSize: 16, color: TEXT, margin: 0 }}>
            {user.current_streak >= 14
              ? user.current_streak + ' Day Grind'
              : user.current_streak >= 1
              ? user.current_streak + ' Day Streak'
              : 'No active streak'}
          </p>
          <p style={{ fontSize: 12, color: MUTED, margin: '3px 0 0' }}>
            {user.current_streak >= 3
              ? streakInfo.multiplier + ' coin multiplier active'
              : 'Log 3 days in a row to earn bonus coins'}
          </p>
        </div>
        <div style={{ background: user.current_streak >= 3 ? COPPER : CARD2, borderRadius: 10, padding: '8px 14px', textAlign: 'center', minWidth: 56, border: '1px solid ' + BORDER }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 20, color: TEXT, margin: 0 }}>
            {streakInfo.multiplier}
          </p>
          <p style={{ fontSize: 9, fontWeight: 800, color: user.current_streak >= 3 ? '#f5c09a' : STONE, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            COINS
          </p>
        </div>
      </div>

      {/* Streak warning */}
      {user.current_streak >= 3 && (
        <div style={{ background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 10, padding: '8px 14px', marginTop: 8, fontSize: 12, color: '#fb923c', fontWeight: 600 }}>
          Don&apos;t lose your streak &mdash; log a workout today to keep your {streakInfo.multiplier} bonus
        </div>
      )}

      {/* Next streak milestone */}
      {nextStreak && (
        <div style={{ background: CARD, border: '1.5px solid ' + BORDER, borderRadius: 12, padding: '12px 14px', marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: TEXT, margin: 0 }}>
              {nextStreak.days - user.current_streak} more days to reach {nextStreak.multiplier} coins
            </p>
            <p style={{ fontSize: 11, color: STONE, margin: 0 }}>{user.current_streak}/{nextStreak.days}</p>
          </div>
          <div style={{ background: CARD2, borderRadius: 99, height: 6, overflow: 'hidden' }}>
            <div style={{ width: (user.current_streak / nextStreak.days * 100) + '%', height: '100%', background: COPPER, borderRadius: 99, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {/* ── WEEKLY BONUS ── */}
      <div style={{ marginTop: 12, background: CARD, border: '1.5px solid ' + BORDER, borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: TEXT, margin: 0 }}>
              {weeklyDone ? 'Weekly bonus earned!' : 'Weekly Bonus — +' + weeklyBonus + ' coins'}
            </p>
            <p style={{ fontSize: 11, color: MUTED, margin: '3px 0 0' }}>
              {weeklyDone
                ? 'You hit ' + weeklyGoal + ' workouts this week'
                : (weeklyGoal - weeklyWorkouts) + ' more workout' + (weeklyGoal - weeklyWorkouts !== 1 ? 's' : '') + ' to earn +' + weeklyBonus + ' coins'}
            </p>
          </div>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 14, color: weeklyDone ? GREEN : COPPER, margin: 0 }}>
            {weeklyWorkouts}/{weeklyGoal}
          </p>
        </div>
        <div style={{ background: CARD2, borderRadius: 99, height: 6, overflow: 'hidden' }}>
          <div style={{ width: (weeklyProgress * 100) + '%', height: '100%', background: weeklyDone ? GREEN : COPPER, borderRadius: 99, transition: 'width 0.5s ease' }} />
        </div>
        {!weeklyDone && weeklyWorkouts < 5 && (
          <p style={{ fontSize: 11, color: MUTED, marginTop: 6, marginBottom: 0 }}>
            Hit 5 workouts this week for +50 coins instead
          </p>
        )}
      </div>

      {/* ── MILESTONE ── */}
      {nextMilestone && (
        <div style={{ marginTop: 12, background: CARD, border: '1.5px solid ' + BORDER, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: TEXT, margin: 0 }}>
                Milestone: +{nextMilestone.bonus} coins at {nextMilestone.target} workouts
              </p>
              <p style={{ fontSize: 11, color: MUTED, margin: '3px 0 0' }}>
                {nextMilestone.target - user.lifetime_sessions} workouts away
              </p>
            </div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 14, color: COPPER, margin: 0 }}>
              {user.lifetime_sessions}/{nextMilestone.target}
            </p>
          </div>
          <div style={{ background: CARD2, borderRadius: 99, height: 6, overflow: 'hidden' }}>
            <div style={{ width: (milestoneProgress * 100) + '%', height: '100%', background: COPPER, borderRadius: 99, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {/* ── HOW YOU EARN ── */}
      <div style={{ marginTop: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: STONE, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>How You Earn</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: '+10', sub: 'per workout' },
            { label: '+5',  sub: 'same-day log' },
            { label: 'Up to 2x', sub: '14-day streak' },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, background: CARD, border: '1.5px solid ' + BORDER, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 900, color: COPPER, margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: 10, color: STONE, margin: '3px 0 0', fontWeight: 600 }}>{item.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 10, padding: '10px 14px', marginTop: 16, fontSize: 13, color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* ── REWARDS STORE ── */}
      <div style={{ marginTop: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: STONE, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
          Rewards Store
        </p>

        {featured.length > 0 && (
          <>
            <p style={{ fontSize: 10, fontWeight: 700, color: COPPER, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Featured</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {featured.map(r => (
                <RewardCard key={r.id} reward={r} userBalance={user.points_balance} redeeming={redeeming} onRedeem={handleRedeem} />
              ))}
            </div>
          </>
        )}

        {rest.length > 0 && (
          <>
            <p style={{ fontSize: 10, fontWeight: 700, color: STONE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>All Rewards</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rest.map(r => (
                <RewardCard key={r.id} reward={r} userBalance={user.points_balance} redeeming={redeeming} onRedeem={handleRedeem} />
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  )
}

function RewardCard({
  reward,
  userBalance,
  redeeming,
  onRedeem,
}: {
  reward: Reward
  userBalance: number
  redeeming: string | null
  onRedeem: (r: Reward) => void
}) {
  const isComingSoon  = !!reward.coming_soon
  const canAfford     = userBalance >= reward.point_cost
  const isRedeeming   = redeeming === reward.id
  const coinsNeeded   = reward.point_cost - userBalance
  const affordProgress = Math.min(userBalance / reward.point_cost, 1)

  const categoryAccent: Record<string, string> = {
    supplements: '#22c55e',
    gear:        '#3b82f6',
    gift_cards:  '#f59e0b',
    lifestyle:   '#a855f7',
  }
  const accent = categoryAccent[reward.category] ?? COPPER

  const typeLabel =
    isComingSoon ? null
    : reward.reward_type === 'discount_code' ? 'Code'
    : reward.reward_type === 'affiliate_link' ? 'Link'
    : null

  const CARD     = '#111110'
  const CARD2    = '#1A1A18'
  const BORDER   = 'rgba(245,240,234,0.08)'
  const BORDER_A = 'rgba(181,89,60,0.28)'
  const TEXT     = '#F5F0EA'
  const MUTED    = 'rgba(245,240,234,0.45)'
  const STONE    = '#8A8478'
  const COPPER   = '#B5593C'

  return (
    <div style={{
      background: CARD,
      border: '1.5px solid ' + (canAfford && !isComingSoon ? BORDER_A : BORDER),
      borderRadius: 14,
      padding: '14px 16px',
      opacity: isComingSoon ? 0.65 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: (!canAfford && !isComingSoon) ? 10 : 0 }}>

        {/* Category dot */}
        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: accent }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: TEXT, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {reward.product_name}
            </p>
            {isComingSoon && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 20, background: CARD2, color: STONE, flexShrink: 0, border: '1px solid ' + BORDER }}>Soon</span>
            )}
            {!isComingSoon && reward.is_hot && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 20, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', flexShrink: 0 }}>Hot</span>
            )}
            {!isComingSoon && reward.is_new && !reward.is_hot && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 20, background: 'rgba(168,85,247,0.15)', color: '#c084fc', flexShrink: 0 }}>New</span>
            )}
            {typeLabel && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', flexShrink: 0 }}>
                {typeLabel}
              </span>
            )}
          </div>

          {/* Brand + value */}
          <p style={{ fontSize: 12, color: STONE, margin: 0 }}>
            {reward.brand_name}
            {reward.retail_value > 0 ? ' · $' + reward.retail_value + ' value' : reward.description ? ' · ' + reward.description : ''}
          </p>

          {/* Coin cost */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: isComingSoon ? STONE : accent, margin: 0 }}>
              {reward.point_cost.toLocaleString()} coins
            </p>
            {canAfford && !isComingSoon && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#4ade80' }}>Ready to redeem</span>
            )}
          </div>
        </div>

        {/* Action */}
        {isComingSoon ? (
          <div style={{ padding: '9px 10px', background: CARD2, color: STONE, border: '1.5px solid ' + BORDER, borderRadius: 9, fontSize: 11, fontWeight: 800, flexShrink: 0, textAlign: 'center', lineHeight: 1.3, minWidth: 68 }}>
            Coming<br />Soon
          </div>
        ) : (
          <button
            onClick={() => onRedeem(reward)}
            disabled={!canAfford || !!redeeming}
            style={{
              padding: '9px 14px',
              background: canAfford && !redeeming ? COPPER : CARD2,
              color: canAfford && !redeeming ? TEXT : STONE,
              border: '1.5px solid ' + (canAfford && !redeeming ? 'transparent' : BORDER),
              borderRadius: 9,
              fontSize: 12,
              fontWeight: 800,
              cursor: canAfford && !redeeming ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              fontFamily: 'Archivo, sans-serif',
              minWidth: 68,
            }}
          >
            {isRedeeming ? '...' : canAfford ? 'Redeem' : 'Locked'}
          </button>
        )}
      </div>

      {/* Progress bar toward affording */}
      {!canAfford && !isComingSoon && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>Need {coinsNeeded.toLocaleString()} more coins</p>
            <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{Math.round(affordProgress * 100)}%</p>
          </div>
          <div style={{ background: CARD2, borderRadius: 99, height: 4, overflow: 'hidden' }}>
            <div style={{ width: (affordProgress * 100) + '%', height: '100%', background: accent, borderRadius: 99, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}
    </div>
  )
}
