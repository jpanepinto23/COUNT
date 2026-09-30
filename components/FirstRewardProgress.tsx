'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { isPlaceholderEmail } from '@/lib/strava-auth'
import type { User } from '@/lib/types'

const C = {
  fg: '#F5F0EA',
  copper: '#B5593C',
  copper2: '#D47858',
  muted: '#8A8680',
  card: '#181714',
  track: '#2E2C29',
  hairline: 'rgba(245,240,234,0.14)',
  green: '#22c55e',
}

type FirstReward = { brand_name: string; product_name: string; point_cost: number }

// Shown on Home until the user's first redemption: how far they are from the
// cheapest live reward, in coins and in workouts.
export default function FirstRewardProgress({ user, onUserChanged }: { user: User; onUserChanged: () => Promise<void> }) {
  const [reward, setReward] = useState<FirstReward | null>(null)
  const [hasRedeemed, setHasRedeemed] = useState<boolean | null>(null)
  const [stravaConnected, setStravaConnected] = useState(false)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('rewards')
      .select('brand_name, product_name, point_cost')
      .eq('is_active', true)
      .order('point_cost', { ascending: true })
      .limit(1)
      .then(({ data }) => {
        if (data && data[0]) setReward(data[0] as FirstReward)
      })
    supabase
      .from('redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setHasRedeemed((count ?? 0) > 0))
    supabase
      .from('connected_devices')
      .select('type')
      .eq('user_id', user.id)
      .eq('type', 'strava')
      .eq('status', 'active')
      .then(({ data }) => setStravaConnected(Boolean(data && data.length > 0)))
  }, [user.id])

  if (!reward || hasRedeemed !== false) return null

  const coins = user.points_balance ?? 0
  const cost = reward.point_cost
  const pct = Math.min(1, coins / cost)
  const unlocked = coins >= cost
  const perWorkout = stravaConnected ? 250 : 200
  const workoutsLeft = Math.max(1, Math.ceil((cost - coins) / perWorkout))
  const rewardName = `${reward.brand_name} ${reward.product_name}`.replace(
    new RegExp(`^${reward.brand_name} (.*${reward.brand_name})`, 'i'),
    '$1'
  )
  const needsEmail = isPlaceholderEmail(user.email)

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Enter a valid email')
      return
    }
    setSaving(true)
    setEmailError('')
    const supabase = createClient()
    const { error } = await supabase.from('users').update({ email: value }).eq('id', user.id)
    if (error) {
      setEmailError(error.code === '23505' ? 'That email already has a COUNT account.' : 'Could not save. Try again.')
      setSaving(false)
      return
    }
    await onUserChanged()
    setSaving(false)
  }

  return (
    <div style={{ padding: '20px 16px 0' }}>
      <div style={{ background: C.card, border: `1px solid ${unlocked ? C.copper : C.hairline}`, borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.muted }}>
            First reward
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: unlocked ? C.green : C.copper2, fontWeight: 600, fontFeatureSettings: '"tnum"' }}>
            {Math.min(coins, cost).toLocaleString()} / {cost.toLocaleString()} coins
          </div>
        </div>

        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: C.fg, letterSpacing: '-0.015em', marginTop: 6, lineHeight: 1.15 }}>
          {unlocked
            ? `You earned ${rewardName}`
            : `${workoutsLeft} ${workoutsLeft === 1 ? 'workout' : 'workouts'} to ${rewardName}`}
        </div>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={cost}
          aria-valuenow={Math.min(coins, cost)}
          style={{ height: 8, borderRadius: 4, background: C.track, marginTop: 12, overflow: 'hidden' }}
        >
          <div style={{ width: `${Math.max(pct * 100, coins > 0 ? 4 : 0)}%`, height: '100%', borderRadius: 4, background: unlocked ? C.green : C.copper, transition: 'width 600ms ease' }} />
        </div>

        {needsEmail ? (
          <form onSubmit={saveEmail} style={{ marginTop: 14 }}>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: C.muted, marginBottom: 8 }}>
              Where should we send your reward? Strava doesn&apos;t share your email.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ flex: 1, minWidth: 0, padding: '11px 12px', background: '#0E0E0D', border: `1px solid ${C.hairline}`, borderRadius: 10, color: C.fg, fontSize: 16, fontFamily: 'var(--sans)', outline: 'none' }}
              />
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '11px 16px', background: C.copper, color: C.fg, border: 'none', borderRadius: 10, fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {saving ? 'Saving' : 'Save'}
              </button>
            </div>
            {emailError && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{emailError}</div>}
          </form>
        ) : (
          <Link
            href={unlocked ? '/rewards' : '/log'}
            style={{ display: 'block', marginTop: 14, padding: '12px', textAlign: 'center', background: unlocked ? C.copper : 'transparent', border: `1px solid ${C.copper}`, color: C.fg, borderRadius: 10, textDecoration: 'none', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 700 }}
          >
            {unlocked ? 'Redeem it' : stravaConnected ? "Import today's workout from Strava" : 'Log a workout'}
          </Link>
        )}
      </div>
    </div>
  )
}
