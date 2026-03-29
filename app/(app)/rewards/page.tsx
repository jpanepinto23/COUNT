'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import type { Reward } from '@/lib/types'

const CATEGORY_EMOJI: Record<string, string> = {
  supplements: '💪',
  gear: '👟',
  gift_cards: '🎁',
  lifestyle: '✨',
}

const CATEGORY_COLOR: Record<string, string> = {
  supplements: '#22c55e',
  gear: '#3b82f6',
  gift_cards: '#f59e0b',
  lifestyle: '#a855f7',
}

export default function RewardsPage() {
  const { user, refreshUser } = useAuth()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successReward, setSuccessReward] = useState<Reward | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('rewards').select('*').eq('is_active', true).order('point_cost').then(({ data }) => {
      if (data) setRewards(data)
    })
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
        }),
      })
      if (resp.ok) {
        await refreshUser()
        setSuccessReward(reward)
      } else {
        const body = await resp.json().catch(() => ({}))
        setError(body.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setRedeeming(null)
  }

  if (successReward) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#FAF8F4' }}>
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <p style={{ fontSize: 56, marginBottom: 8 }}>🎁</p>
          <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif', marginBottom: 8 }}>Redemption confirmed!</h2>
          <p style={{ color: '#8A8478', fontSize: 14, marginBottom: 20 }}>
            You spent <strong>{successReward.point_cost.toLocaleString()} pts</strong> on {successReward.product_name}
          </p>
          <div style={{ background: '#F0FAF0', border: '1px solid #B2DFB2', borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: 'left' }}>
            <p style={{ color: '#2D6A2D', fontWeight: 700, marginBottom: 4, fontSize: 14 }}>📬 Gift card incoming!</p>
            <p style={{ color: '#2D6A2D', fontSize: 13, margin: 0 }}>
              Your <strong>{successReward.product_name}</strong> code will be emailed to <strong>{user.email}</strong> within 24-48 hours. Check your spam folder too.
            </p>
          </div>
          <button onClick={() => setSuccessReward(null)} style={{ background: '#F5F0EA', color: '#111110', border: '1.5px solid #E0D9CE', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '12px 28px' }}>
            Back to Shop
          </button>
        </div>
      </div>
    )
  }

  const featured = rewards.filter(r => r.is_featured)
  const rest = rewards.filter(r => !r.is_featured)

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 24 }}>
      {/* Header */}
      <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Rewards Shop</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 36, fontWeight: 900, color: '#B5593C', lineHeight: 1 }}>
          {user.points_balance.toLocaleString()}
        </span>
        <span style={{ fontSize: 14, color: '#8A8478', fontWeight: 700 }}>pts available</span>
      </div>
      <p style={{ color: '#8A8478', fontSize: 12, marginBottom: 20 }}>Redeem points for real rewards. Gift cards sent within 48h.</p>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#DC2626' }}>
          {error}
        </div>
      )}

      {featured.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Featured</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {featured.map(r => <RewardCard key={r.id} reward={r} userBalance={user.points_balance} redeeming={redeeming} onRedeem={handleRedeem} />)}
          </div>
        </>
      )}

      {rest.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>All Rewards</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rest.map(r => <RewardCard key={r.id} reward={r} userBalance={user.points_balance} redeeming={redeeming} onRedeem={handleRedeem} />)}
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
  const emoji = { supplements: '💪', gear: '👟', gift_cards: '🎁', lifestyle: '✨' }[reward.category] ?? '🎯'
  const accent = { supplements: '#22c55e', gear: '#3b82f6', gift_cards: '#f59e0b', lifestyle: '#a855f7' }[reward.category] ?? '#B5593C'

  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${canAfford ? '#E0D9CE' : '#F0EDE6'}`,
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      opacity: canAfford ? 1 : 0.65,
    }}>
      {/* Category badge */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: accent + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>
        {emoji}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#111110', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {reward.product_name}
          </p>
          {(reward.is_hot || reward.is_new) && (
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 20, background: reward.is_hot ? '#FEF3C7' : '#EDE9FE', color: reward.is_hot ? '#92400E' : '#5B21B6', flexShrink: 0 }}>
              {reward.is_hot ? '🔥 Hot' : '✨ New'}
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#8A8478', margin: 0 }}>
          {reward.brand_name}{reward.retail_value > 0 ? ' · $' + reward.retail_value + ' value' : reward.description ? ' · ' + reward.description : ''}
        </p>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: accent, margin: '3px 0 0' }}>
          {reward.point_cost.toLocaleString()} pts
        </p>
      </div>

      {/* Redeem button */}
      <button
        onClick={() => onRedeem(reward)}
        disabled={!canAfford || !!redeeming}
        style={{
          padding: '9px 14px',
          background: canAfford && !redeeming ? '#111110' : '#EDEBE5',
          color: canAfford && !redeeming ? '#F5F0EA' : '#8A8478',
          border: 'none',
          borderRadius: 9,
          fontSize: 12,
          fontWeight: 800,
          cursor: canAfford && !redeeming ? 'pointer' : 'not-allowed',
          flexShrink: 0,
          fontFamily: 'Archivo, sans-serif',
          minWidth: 68,
        }}
      >
        {isRedeeming ? '...' : canAfford ? 'Redeem' : 'Need ' + (reward.point_cost - userBalance).toLocaleString() + ' more'}
      </button>
    </div>
  )
}
