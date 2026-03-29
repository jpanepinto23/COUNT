'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import type { Reward } from '@/lib/types'

const CARD_PHOTOS: Record<string, string> = {
  supplements: 'https://images.pexels.com/photos/3850838/pexels-photo-3850838.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
  gear: 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
  gift_cards: 'https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
  lifestyle: 'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
}

export default function RewardsPage() {
  const { user, refreshUser } = useAuth()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [successReward, setSuccessReward] = useState<Reward | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('rewards').select('*').eq('is_active', true).order('point_cost').then(({ data }) => {
      if (data) setRewards(data)
    })
  }, []) // eslint-disable-line

  if (!user) return null

  async function handleRedeem(reward: Reward) {
    if (!user || user.points_balance < reward.point_cost) return
    setRedeeming(reward.id)
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
    }
    setRedeeming(null)
  }

  if (successReward) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#FAF8F4' }}>
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <p style={{ fontSize: 56, marginBottom: 8 }}>ð</p>
          <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif', marginBottom: 8 }}>Redemption confirmed!</h2>
          <p style={{ color: '#8A8478', fontSize: 14, marginBottom: 20 }}>
            You spent <strong>{successReward.point_cost.toLocaleString()} pts</strong> on {successReward.product_name}
          </p>
          <div style={{ background: '#F0FAF0', border: '1px solid #B2DFB2', borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: 'left' }}>
            <p style={{ color: '#2D6A2D', fontWeight: 700, marginBottom: 4, fontSize: 14 }}>ð¬ Gift card incoming!</p>
            <p style={{ color: '#2D6A2D', fontSize: 13, margin: 0 }}>
              Your <strong>{successReward.product_name}</strong> code will be emailed to <strong>{user.email}</strong> within 24â48 hours. Check your spam folder too.
            </p>
          </div>
          <button onClick={() => setSuccessReward(null)} style={{ ...btnSecondary, width: 'auto', padding: '12px 28px' }}>
            Back to Shop
          </button>
        </div>
      </div>
    )
  }

  const featured = rewards.filter(r => r.is_featured)
  const rest = rewards.filter(r => !r.is_featured)

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 8 }}>
      <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Your Points</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 20 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 36, fontWeight: 900, color: '#B5593C', lineHeight: 1 }}>
          {user.points_balance.toLocaleString()}
        </span>
        <span style={{ fontSize: 14, color: '#8A8478', fontWeight: 700 }}>pts available</span>
      </div>

      {featured.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Featured</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {featured.map(r => <RewardCard key={r.id} reward={r} user={user} redeeming={redeeming} onRedeem={handleRedeem} />)}
          </div>
        </>
      )}

      {rest.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>All Rewards</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rest.map(r => <RewardCard key={r.id} reward={r} user={user} redeeming={redeeming} onRedeem={handleRedeem} />)}
          </div>
        </>
      )}
    </div>
  )
}

function RewardCard({ reward, user, redeeming, onRedeem }: {
  reward: Reward
  user: { points_balance: number }
  redeeming: string | null
  onRedeem: (r: Reward) => void
}) {
  const canAfford = user.points_balance >= reward.point_cost
  const isRedeeming = redeeming === reward.id
  const photo = reward.image_url || CARD_PHOTOS[reward.category] || CARD_PHOTOS.lifestyle
  let logoUrl = '';
  try {
    const _u = new URL(reward.affiliate_url.startsWith('http') ? reward.affiliate_url : 'https://' + reward.affiliate_url);
    logoUrl = `https://icon.horse/icon/${_u.hostname}`;
  } catch { logoUrl = ''; }

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid #E0D9CE', background: '#fff', opacity: canAfford ? 1 : 0.75 }}>
      <div style={{ height: 100, backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
        {(reward.is_hot || reward.is_new) && (
          <span style={{ position: 'absolute', top: 8, left: 8, background: reward.is_hot ? '#B5593C' : '#7C3AED', color: '#fff', fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 20, letterSpacing: 1, textTransform: 'uppercase' }}>
            {reward.is_hot ? 'ð¥ Hot' : 'â¨ New'}
          </span>
        )}
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={logoUrl} alt={reward.brand_name} width={32} height={32} style={{ borderRadius: 8, border: '1px solid #E0D9CE', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#111110', marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{reward.product_name}</p>
          <p style={{ fontSize: 11, color: '#8A8478' }}>{reward.brand_name} Â· {reward.retail_value > 0 ? `$${reward.retail_value} value` : reward.description}</p>
        </div>
        <button onClick={() => onRedeem(reward)} disabled={!canAfford || redeeming === reward.id} style={{
          padding: '6px 10px',
          background: canAfford ? '#B5593C' : '#EDEBE5',
          color: canAfford ? '#F5F0EA' : '#8A8478',
          border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 800,
          cursor: canAfford ? 'pointer' : 'not-allowed',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {isRedeeming ? 'â¦' : `${reward.point_cost.toLocaleString()} pts`}
        </button>
      </div>
    </div>
  )
}

const btnSecondary: React.CSSProperties = {
  background: '#F5F0EA', color: '#111110', border: '1.5px solid #E0D9CE',
  borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'Archivo, sans-serif', width: '100%', padding: 14,
}
