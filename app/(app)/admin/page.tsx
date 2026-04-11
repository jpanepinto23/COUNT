'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

const ADMIN_EMAIL = 'jpanepinto23@gmail.com'
const BG = '#0E0E0D'
const CARD = '#111110'
const CARD2 = '#1A1A18'
const BORDER = 'rgba(245,240,234,0.08)'
const TEXT = '#F5F0EA'
const MUTED = 'rgba(245,240,234,0.45)'
const COPPER = '#B5593C'
const GREEN = '#16a34a'

type Tab = 'signups' | 'activity' | 'redemptions'

interface User {
  id: string; name: string; email: string; created_at: string
  tier: string; lifetime_sessions: number; points_balance: number
  points_lifetime_earned: number; current_streak: number; free_unverified_remaining: number
}
interface Workout {
  id: string; created_at: string; user_id: string; workout_type: string
  verification_method: string; points_earned: number; user_name: string; user_email: string
}
interface Redemption {
  id: string; redeemed_at: string; points_spent: number; user_name: string
  user_email: string; product_name: string; brand_name: string; retail_value: number
  fulfillment_value: string | null; affiliate_url: string | null
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 18px', flex: 1, minWidth: 100, textAlign: 'center' }}>
      <div style={{ color: TEXT, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div style={{ color: MUTED, fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('signups')
  const [users, setUsers] = useState<User[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.email !== ADMIN_EMAIL) { router.push('/home'); return }
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/workouts').then(r => r.json()),
      fetch('/api/admin/redemptions').then(r => r.json()),
    ]).then(([u, w, r]) => {
      if (Array.isArray(u)) setUsers(u)
      if (Array.isArray(w)) setWorkouts(w)
      if (Array.isArray(r)) setRedemptions(r)
    }).catch(() => setError('Failed to load data')).finally(() => setLoading(false))
  }, [user])

  if (!user || user.email !== ADMIN_EMAIL) return <div style={{ padding: 24, color: TEXT, background: BG, minHeight: '100vh' }}>Loading...</div>

  const now = Date.now()
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)

  const newToday = users.filter(u => new Date(u.created_at) >= todayStart).length
  const newWeek = users.filter(u => new Date(u.created_at) >= weekAgo).length
  const activeToday = new Set(workouts.filter(w => new Date(w.created_at) >= todayStart).map(w => w.user_id)).size
  const activeWeek = new Set(workouts.filter(w => new Date(w.created_at) >= weekAgo).map(w => w.user_id)).size
  const pendingCount = redemptions.filter(r => now - new Date(r.redeemed_at).getTime() < 72 * 3600 * 1000).length

  const tabBtn = (t: Tab, label: string) => (
    <button onClick={() => setTab(t)} style={{
      padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
      fontWeight: 700, fontSize: 14, transition: 'all 0.15s',
      background: tab === t ? COPPER : 'transparent',
      color: tab === t ? 'white' : MUTED,
    }}>{label}</button>
  )

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '24px 16px', fontFamily: '-apple-system,sans-serif', paddingBottom: 100 }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 800, margin: 0 }}>Admin Dashboard</h1>
          <p style={{ color: MUTED, fontSize: 13, margin: '4px 0 0' }}>
            {loading ? 'Loading...' : `${users.length} total users · ${workouts.length} workouts logged`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
          <Stat label="Total Users" value={users.length} />
          <Stat label="New Today" value={newToday} />
          <Stat label="New (7d)" value={newWeek} />
          <Stat label="Active Today" value={activeToday} />
          <Stat label="Active (7d)" value={activeWeek} />
          <Stat label="Pending Rewards" value={pendingCount} />
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: CARD, padding: 4, borderRadius: 10, border: `1px solid ${BORDER}`, width: 'fit-content' }}>
          {tabBtn('signups', `Sign Ups (${users.length})`)}
          {tabBtn('activity', `Activity (${workouts.length})`)}
          {tabBtn('redemptions', pendingCount > 0 ? `Redemptions (${pendingCount} new)` : `Redemptions (${redemptions.length})`)}
        </div>

        {error && <p style={{ color: COPPER, fontSize: 14, marginBottom: 16 }}>{error}</p>}
        {loading && <p style={{ color: MUTED, fontSize: 14 }}>Loading...</p>}

        {/* SIGN UPS */}
        {!loading && tab === 'signups' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.length === 0 && <p style={{ color: MUTED }}>No users yet.</p>}
            {users.map(u => {
              const isToday = new Date(u.created_at) >= todayStart
              const isWeek = new Date(u.created_at) >= weekAgo
              return (
                <div key={u.id} style={{ background: CARD, border: `1px solid ${isToday ? COPPER : BORDER}`, borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ color: TEXT, fontWeight: 600, fontSize: 15 }}>{u.name || 'Unnamed'}</span>
                      {isToday && <span style={{ background: COPPER, color: 'white', borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>TODAY</span>}
                      {!isToday && isWeek && <span style={{ background: 'rgba(22,163,74,0.15)', color: GREEN, borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>NEW</span>}
                    </div>
                    <div style={{ color: MUTED, fontSize: 13 }}>{u.email}</div>
                    <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{new Date(u.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {[['sessions', u.lifetime_sessions ?? 0], ['streak', u.current_streak ?? 0], ['pts', (u.points_balance ?? 0).toLocaleString()]].map(([lbl, val]) => (
                      <div key={String(lbl)} style={{ textAlign: 'center' }}>
                        <div style={{ color: TEXT, fontWeight: 700, fontSize: 16 }}>{val}</div>
                        <div style={{ color: MUTED, fontSize: 11 }}>{lbl}</div>
                      </div>
                    ))}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: TEXT, fontWeight: 700, fontSize: 13 }}>{u.tier || 'bronze'}</div>
                      <div style={{ color: MUTED, fontSize: 11 }}>tier</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ACTIVITY */}
        {!loading && tab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {workouts.length === 0 && <p style={{ color: MUTED }}>No workouts yet.</p>}
            {workouts.map(w => {
              const isToday = new Date(w.created_at) >= todayStart
              const verified = w.verification_method && w.verification_method !== 'unverified'
              return (
                <div key={w.id} style={{ background: isToday ? CARD2 : CARD, border: `1px solid ${isToday ? 'rgba(22,163,74,0.35)' : BORDER}`, borderRadius: 12, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ color: TEXT, fontWeight: 600, fontSize: 14 }}>{w.user_name}</span>
                      {isToday && <span style={{ background: 'rgba(22,163,74,0.15)', color: GREEN, borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>TODAY</span>}
                    </div>
                    <div style={{ color: MUTED, fontSize: 12 }}>{w.user_email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{w.workout_type || 'workout'}</span>
                    <span style={{ background: verified ? 'rgba(22,163,74,0.12)' : CARD2, color: verified ? GREEN : MUTED, borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 600 }}>
                      {w.verification_method || 'unverified'}
                    </span>
                    <span style={{ color: COPPER, fontWeight: 700, fontSize: 13 }}>+{w.points_earned} pts</span>
                    <span style={{ color: MUTED, fontSize: 12 }}>{new Date(w.created_at).toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* REDEMPTIONS */}
        {!loading && tab === 'redemptions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {redemptions.length === 0 && <p style={{ color: MUTED }}>No redemptions yet.</p>}
            {redemptions.map(r => {
              const isNew = now - new Date(r.redeemed_at).getTime() < 72 * 3600 * 1000
              const buyUrl = r.affiliate_url || `https://www.amazon.com/s?k=amazon+email+gift+card+${r.fulfillment_value || r.retail_value}+dollars`
              return (
                <div key={r.id} style={{ background: CARD, border: `1.5px solid ${isNew ? COPPER : BORDER}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ color: TEXT, fontWeight: 600, fontSize: 15 }}>{r.product_name}</span>
                        {isNew && <span style={{ background: COPPER, color: 'white', borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>NEW</span>}
                      </div>
                      <div style={{ color: MUTED, fontSize: 13, marginBottom: 8 }}>
                        {r.brand_name}{r.retail_value > 0 ? ` · $${r.retail_value} value` : ''} · {r.points_spent.toLocaleString()} pts
                      </div>
                      <div style={{ fontSize: 14 }}>
                        <span style={{ color: TEXT, fontWeight: 500 }}>{r.user_name}</span>
                        {' · '}
                        <a href={`mailto:${r.user_email}`} style={{ color: COPPER, textDecoration: 'none' }}>{r.user_email}</a>
                      </div>
                      <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{new Date(r.redeemed_at).toLocaleString()}</div>
                    </div>
                    <a href={buyUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FF9900', color: 'white', padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      Buy &amp; Send →
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
