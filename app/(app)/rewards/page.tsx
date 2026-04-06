'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import type { Reward, RewardType } from '@/lib/types'

const BG = '#0E0E0D'
const CARD = '#111110'
const CARD2 = '#1A1A18'
const BORDER = 'rgba(245,240,234,0.08)'
const BORDER_A = 'rgba(181,89,60,0.30)'
const TEXT = '#F5F0EA'
const MUTED = 'rgba(245,240,234,0.45)'
const STONE = '#8A8478'
const COPPER = '#B5593C'
const GREEN = '#16a34a'

function getStreakMultiplier(streak: number): string {
  if (streak >= 14) return '2x'
  if (streak >= 7) return '1.5x'
  if (streak >= 3) return '1.2x'
  return '1x'
}

interface FulfillmentData {
  reward_type: RewardType
  fulfillment_value?: string
  affiliate_url?: string
}

export default function RewardsPage() {
  const { user, refreshUser } = useAuth()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successReward, setSuccessReward] = useState<Reward | null>(null)
  const [fulfillmentData, setFulfillmentData] = useState<FulfillmentData | null>(null)
  const [copied, setCopied] = useState(false)
  const [weeklyWorkouts, setWeeklyWorkouts] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('rewards').select('*').eq('is_active', true).neq('category', 'gift_cards').order('point_cost').then(({ data }) => {
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
    if (!user || user.points_balance < reward.point_cost || redeeming) return
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

  if (successReward && fulfillmentData) {
    const { reward_type, fulfillment_value, affiliate_url } = fulfillmentData
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: BG }}>
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <p style={{ fontSize: 56, marginBottom: 8 }}>
            {reward_type === 'discount_code' ? '&#x1F3F7;' : '&#x1F517;'}
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif', marginBottom: 8, color: TEXT }}>
            Your reward is ready!
          </h2>
          <p style={{ color: STONE, fontSize: 14, marginBottom: 24 }}>
            {successReward.point_cost.toLocaleString()} coins &middot; {successReward.product_name}
          </p>
          {reward_type === 'discount_code' && fulfillment_value && (
            <div style={{ background: 'rgba(22,163,74,0.10)', border: '1.5px solid rgba(22,163,74,0.25)', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
              <p style={{ color: '#86efac', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Promo Code</p>
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
              <a href={affiliate_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', background: COPPER, color: TEXT, borderRadius: 12, padding: '16px 24px', fontSize: 15, fontWeight: 800, textDecoration: 'none' }}>
                Claim Your {successReward.brand_name} Reward &rarr;
              </a>
            </div>
          )}
          <button onClick={() => { setSuccessReward(null); setFulfillmentData(null); setCopied(false) }} style={{ background: CARD2, color: TEXT, border: '1.5px solid ' + BORDER, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '12px 28px' }}>
            Back to Shop
          </button>
        </div>
      </div>
    )
  }

  const multiplier = getStreakMultiplier(user.current_streak)
  const featured = rewards.filter(r => r.is_featured)
  const rest = rewards.filter(r => !r.is_featured)
  const weeklyDone = weeklyWorkouts >= 5

  return (
    <div style={{ padding: '24px 16px', paddingBottom: 40, background: BG, minHeight: '100dvh' }}>

      <p style={{ color: STONE, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>COUNT Coins</p>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 48, fontWeight: 900, color: COPPER, lineHeight: 1, display: 'block', marginBottom: 20 }}>
        {user.points_balance.toLocaleString()}
      </span>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <div style={{ flex: 1, background: user.current_streak >= 3 ? '#1A1108' : CARD, border: '1.5px solid ' + (user.current_streak >= 3 ? 'rgba(181,89,60,0.35)' : BORDER), borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 20, color: COPPER, margin: 0 }}>{multiplier}</p>
          <p style={{ fontSize: 11, color: MUTED, margin: '3px 0 0' }}>
            {user.current_streak > 0 ? user.current_streak + ' day streak' : 'no streak'}
          </p>
        </div>
        <div style={{ flex: 1, background: CARD, border: '1.5px solid ' + (weeklyDone ? 'rgba(22,163,74,0.30)' : BORDER), borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 20, color: weeklyDone ? '#4ade80' : COPPER, margin: 0 }}>{weeklyWorkouts}/5</p>
          <p style={{ fontSize: 11, color: MUTED, margin: '3px 0 0' }}>this week</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#f87171' }}>
          {error}
        </div>
      )}

      <p style={{ fontSize: 11, fontWeight: 800, color: STONE, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Rewards Store</p>

      {featured.length > 0 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, color: COPPER, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Featured</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {featured.map(r => (
              <RewardCard key={r.id} reward={r} userBalance={user.points_balance} redeeming={redeeming} onRedeem={handleRedeem} />
            ))}
          </div>
        </>
      )}

      {rest.length > 0 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, color: STONE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>All Rewards</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rest.map(r => (
              <RewardCard key={r.id} reward={r} userBalance={user.points_balance} redeeming={redeeming} onRedeem={handleRedeem} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RewardCard({ reward, userBalance, redeeming, onRedeem }: {
  reward: Reward
  userBalance: number
  redeeming: string | null
  onRedeem: (r: Reward) => void
}) {
  const canAfford = userBalance >= reward.point_cost
  const isRedeeming = redeeming === reward.id
  const CARD = '#111110'
  const CARD2 = '#1A1A18'
  const BORDER = 'rgba(245,240,234,0.08)'
  const BORDER_A = 'rgba(181,89,60,0.28)'
  const TEXT = '#F5F0EA'
  const MUTED = 'rgba(245,240,234,0.45)'
  const STONE = '#8A8478'
  const COPPER = '#B5593C'
  const categoryAccent: Record<string, string> = {
    supplements: '#22c55e',
    gear: '#3b82f6',
    lifestyle: '#a855f7',
  }
  const accent = categoryAccent[reward.category] ?? COPPER

  return (
    <div style={{ background: CARD, border: '1.5px solid ' + (canAfford ? BORDER_A : BORDER), borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {reward.image_url
            ? <img src={reward.image_url} alt={reward.brand_name} style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 6 }} />
            : <div style={{ width: 14, height: 14, borderRadius: '50%', background: accent }} />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: TEXT, margin: 0 }}>{reward.product_name}</p>
            {reward.is_hot && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 20, background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>Hot</span>}
            {reward.is_new && !reward.is_hot && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 20, background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>New</span>}
          </div>
          <p style={{ fontSize: 12, color: STONE, margin: 0 }}>
            {reward.brand_name}{reward.description ? ' · ' + reward.description : ''}
          </p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: accent, margin: '4px 0 0' }}>
            {reward.point_cost.toLocaleString()} coins
          </p>
        </div>
        <button
          onClick={() => onRedeem(reward)}
          disabled={!canAfford || !!redeeming}
          style={{ padding: '9px 14px', background: canAfford && !redeeming ? COPPER : CARD2, color: canAfford && !redeeming ? TEXT : STONE, border: '1.5px solid ' + (canAfford && !redeeming ? 'transparent' : BORDER), borderRadius: 9, fontSize: 12, fontWeight: 800, cursor: canAfford && !redeeming ? 'pointer' : 'not-allowed', flexShrink: 0, fontFamily: 'Archivo, sans-serif', minWidth: 68 }}>
          {isRedeeming ? '...' : canAfford ? 'Redeem' : 'Locked'}
        </button>
      </div>
    </div>
  )
}
