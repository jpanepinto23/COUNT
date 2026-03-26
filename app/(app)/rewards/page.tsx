'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import type { Reward } from '@/lib/types'

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'gift_cards', label: 'Gift Cards' },
  { value: 'supplements', label: 'Supplements' },
  { value: 'gear', label: 'Gear' },
  { value: 'lifestyle', label: 'Lifestyle' },
]

const BRAND_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  'Amazon':           { bg: '#FF9900', color: '#111110', label: 'amazon' },
  'Legion Athletics': { bg: '#111110', color: '#C8A96E', label: 'LEGION' },
  'Momentous':        { bg: '#0D1B2A', color: '#FFFFFF', label: 'momentous' },
  'Ten Thousand':     { bg: '#1C1C1C', color: '#F5F0EA', label: 'TEN THOUSAND' },
  'Strava':           { bg: '#FC4C02', color: '#FFFFFF', label: 'STRAVA' },
  'Rogue':            { bg: '#C41E3A', color: '#FFFFFF', label: 'ROGUE' },
  'Nike':             { bg: '#111110', color: '#FFFFFF', label: 'NIKE' },
  'MyFitnessPal':     { bg: '#0066FF', color: '#FFFFFF', label: 'MFP' },
  'Garmin':           { bg: '#007CC3', color: '#FFFFFF', label: 'GARMIN' },
}

function brandBg(name: string): string {
  const cfg = BRAND_CONFIG[name]
  if (cfg) return cfg.bg
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const palette = ['#2C3E50', '#1A1A2E', '#2D3561', '#1B262C', '#16213E', '#0F3460']
  return palette[Math.abs(hash) % palette.length]
}

function brandLabel(name: string): string {
  return BRAND_CONFIG[name]?.label ?? name.toUpperCase()
}

function brandTextColor(name: string): string {
  return BRAND_CONFIG[name]?.color ?? '#FFFFFF'
}

export default function RewardsPage() {
  const { user, refreshUser } = useAuth()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [category, setCategory] = useState('all')
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [successReward, setSuccessReward] = useState<Reward | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => { if (data) setRewards(data) })
  }, []) // eslint-disable-line

  const filtered = category === 'all' ? rewards : rewards.filter(r => r.category === category)
  const featured = filtered.filter(r => r.is_featured)
  const rest = filtered.filter(r => !r.is_featured)

  async function handleRedeem(reward: Reward) {
    if (!user || user.points_balance < reward.point_cost) return
    setRedeeming(reward.id)
    const { error } = await supabase.from('redemptions').insert({
      user_id: user.id,
      reward_id: reward.id,
      points_spent: reward.point_cost,
      affiliate_link_generated: reward.affiliate_url,
    })
    if (!error) {
      await supabase.from('users').update({
        points_balance: user.points_balance - reward.point_cost,
      }).eq('id', user.id)
      await refreshUser()
      setSuccessReward(reward)
    }
    setRedeeming(null)
  }

  if (successReward) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🎁</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, fontFamily: 'Archivo, sans-serif' }}>Redeemed!</h2>
          <p style={{ color: '#8A8478', marginBottom: 6 }}>{successReward.brand_name} — {successReward.product_name}</p>
          <p style={{ color: '#8A8478', fontSize: 13, marginBottom: 24 }}>
            You spent <strong style={{ color: '#111110' }}>{successReward.point_cost.toLocaleString()} pts</strong>
          </p>
          <a
            href={successReward.affiliate_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none', marginBottom: 12 }}
          >
            Go to {successReward.brand_name} &rarr;
          </a>
          <br />
          <button onClick={() => setSuccessReward(null)} style={{ ...btnSecondary, width: 'auto', padding: '12px 24px' }}>
            Back to Shop
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>Reward Shop</p>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif' }}>Spend Your Points</h1>
        </div>
        <div style={{ background: '#111110', borderRadius: 12, padding: '8px 14px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 900, color: '#B5593C', lineHeight: 1 }}>
            {user?.points_balance.toLocaleString() ?? 0}
          </p>
          <p style={{ fontSize: 9, color: '#8A8478', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>pts</p>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 20,
              border: `1.5px solid ${category === c.value ? '#111110' : '#E0D9CE'}`,
              background: category === c.value ? '#111110' : '#fff',
              color: category === c.value ? '#F5F0EA' : '#8A8478',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'Archivo, sans-serif',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 10 }}>Featured</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {featured.map(r => (
              <RewardCard key={r.id} reward={r} user={user} onRedeem={handleRedeem} redeeming={redeeming} />
            ))}
          </div>
        </>
      )}

      {/* All rewards */}
      {rest.length > 0 && (
        <>
          {featured.length > 0 && (
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 10 }}>All Rewards</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {rest.map(r => (
              <RewardCardSmall key={r.id} reward={r} user={user} onRedeem={handleRedeem} redeeming={redeeming} />
            ))}
          </div>
        </>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#8A8478' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🏪</p>
          <p>No rewards in this category yet.</p>
        </div>
      )}
    </div>
  )
}

function RewardCard({ reward, user, onRedeem, redeeming }: {
  reward: Reward
  user: { points_balance: number } | null
  onRedeem: (r: Reward) => void
  redeeming: string | null
}) {
  const canAfford = (user?.points_balance ?? 0) >= reward.point_cost
  const bg = brandBg(reward.brand_name)
  const textColor = brandTextColor(reward.brand_name)
  const label = brandLabel(reward.brand_name)

  return (
    <div style={{
      background: '#FDFCFA',
      border: '1.5px solid #E0D9CE',
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
    }}>
      <div style={{
        width: 84,
        flexShrink: 0,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 8px',
      }}>
        <span style={{
          color: textColor,
          fontSize: 11,
          fontWeight: 900,
          fontFamily: 'Archivo, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: 1,
          textAlign: 'center',
          lineHeight: 1.3,
          wordBreak: 'break-word',
        }}>
          {label}
        </span>
      </div>

      <div style={{ flex: 1, padding: '14px 12px', minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          {reward.is_hot && <Tag color="#ef4444">HOT</Tag>}
          {reward.is_new && <Tag color="#22c55e">NEW</Tag>}
        </div>
        <p style={{ fontSize: 11, color: '#8A8478', marginBottom: 2 }}>{reward.brand_name}</p>
        <p style={{ fontSize: 15, fontWeight: 800, fontFamily: 'Archivo, sans-serif', lineHeight: 1.2, marginBottom: 4 }}>{reward.product_name}</p>
        <p style={{ fontSize: 11, color: '#8A8478' }}>Retail ${reward.retail_value}</p>
      </div>

      <div style={{
        padding: '14px 14px',
        textAlign: 'right',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 900, color: '#111110' }}>
          {reward.point_cost.toLocaleString()}
          <br />
          <span style={{ fontSize: 9, fontWeight: 500, color: '#8A8478' }}>pts</span>
        </p>
        <button
          onClick={() => onRedeem(reward)}
          disabled={!canAfford || redeeming === reward.id}
          style={{
            padding: '8px 14px',
            background: canAfford ? '#B5593C' : '#EDEBE5',
            color: canAfford ? '#F5F0EA' : '#8A8478',
            border: 'none',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 800,
            fontFamily: 'Archivo, sans-serif',
            cursor: canAfford ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap',
          }}
        >
          {redeeming === reward.id ? '...' : canAfford ? 'Redeem' : 'Need more'}
        </button>
      </div>
    </div>
  )
}

function RewardCardSmall({ reward, user, onRedeem, redeeming }: {
  reward: Reward
  user: { points_balance: number } | null
  onRedeem: (r: Reward) => void
  redeeming: string | null
}) {
  const canAfford = (user?.points_balance ?? 0) >= reward.point_cost
  const bg = brandBg(reward.brand_name)
  const textColor = brandTextColor(reward.brand_name)
  const label = brandLabel(reward.brand_name)

  return (
    <div style={{
      background: '#FDFCFA',
      border: '1.5px solid #E0D9CE',
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        background: bg,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 10px',
      }}>
        <span style={{
          color: textColor,
          fontSize: 13,
          fontWeight: 900,
          fontFamily: 'Archivo, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: 1,
          textAlign: 'center',
        }}>
          {label}
        </span>
      </div>

      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
          {reward.is_hot && <Tag color="#ef4444">HOT</Tag>}
          {reward.is_new && <Tag color="#22c55e">NEW</Tag>}
        </div>
        <p style={{ fontSize: 10, color: '#8A8478', marginBottom: 2 }}>{reward.brand_name}</p>
        <p style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2, marginBottom: 10, flex: 1 }}>{reward.product_name}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 900 }}>
            {reward.point_cost.toLocaleString()}
            <span style={{ fontSize: 9, color: '#8A8478', fontWeight: 500 }}> pts</span>
          </span>
          <button
            onClick={() => onRedeem(reward)}
            disabled={!canAfford || redeeming === reward.id}
            style={{
              padding: '6px 10px',
              background: canAfford ? '#B5593C' : '#EDEBE5',
              color: canAfford ? '#F5F0EA' : '#8A8478',
              border: 'none',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 800,
              cursor: canAfford ? 'pointer' : 'not-allowed',
            }}
          >
            {canAfford ? 'Redeem' : 'Need more'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Tag({ color, children }: { color: string; children: string }) {
  return (
    <span style={{
      background: color + '18',
      color,
      fontSize: 9,
      fontWeight: 900,
      padding: '2px 6px',
      borderRadius: 4,
      letterSpacing: 0.5,
      fontFamily: 'Archivo, sans-serif',
    }}>
      {children}
    </span>
  )
}

const btnPrimary: React.CSSProperties = {
  padding: '14px 28px',
  background: '#111110',
  color: '#F5F0EA',
  border: 'none',
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 800,
  fontFamily: 'Archivo, sans-serif',
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: 14,
  background: '#fff',
  color: '#111110',
  border: '1.5px solid #E0D9CE',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 800,
  fontFamily: 'Archivo, sans-serif',
  cursor: 'pointer',
  width: '100%',
}
