'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { getTierLabel, getTierMultiplier } from '@/lib/points'
import type { Redemption } from '@/lib/types'

const TIER_COLORS: Record<string, string> = {
  bronze: '#B5593C',
  silver: '#6B7280',
  gold: '#D97706',
  platinum: '#7C3AED',
}

const DEVICE_INFO: Record<string, { label: string; emoji: string; provider: string }> = {
  apple_health: { label: 'Apple Health', emoji: '🍎', provider: 'APPLE' },
  garmin: { label: 'Garmin', emoji: '⌚', provider: 'GARMIN' },
  fitbit: { label: 'Fitbit', emoji: '💚', provider: 'FITBIT' },
  google_fit: { label: 'Google Fit', emoji: '🏃', provider: 'GOOGLE' },
  gps: { label: 'GPS Check-in', emoji: '📍', provider: '' },
  photo: { label: 'Photo Verification', emoji: '📸', provider: '' },
}

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [redemptions, setRedemptions] = useState<(Redemption & { reward: { brand_name: string; product_name: string } })[]>([])
  const [devices, setDevices] = useState<{ type: string; connected_at: string; status: string }[]>([])
  const [signingOut, setSigningOut] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [connectMessage, setConnectMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [editingStats, setEditingStats] = useState(false)
  const [savingStats, setSavingStats] = useState(false)
  const [statsForm, setStatsForm] = useState({ age: '', heightFt: '', heightIn: '', weight: '' })
  const [localAge, setLocalAge] = useState<number | null | undefined>(undefined)
  const [localHeight, setLocalHeight] = useState<number | null | undefined>(undefined)
  const [localWeight, setLocalWeight] = useState<number | null | undefined>(undefined)

  useEffect(() => {
    if (!user) return

    supabase
      .from('redemptions')
      .select('*, reward:rewards(brand_name, product_name)')
      .eq('user_id', user.id)
      .order('redeemed_at', { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setRedemptions(data as any) })

    supabase
      .from('connected_devices')
      .select('type, connected_at, status')
      .eq('user_id', user.id)
      .then(({ data }) => { if (data) setDevices(data) })

    // Check if we just returned from Terra OAuth
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      setConnectMessage({ text: 'Fitness tracker connected! Your workouts will now be auto-verified.', ok: true })
      // Clean URL
      window.history.replaceState({}, '', '/profile')
      // Refresh devices list
      supabase
        .from('connected_devices')
        .select('type, connected_at, status')
        .eq('user_id', user.id)
        .then(({ data }) => { if (data) setDevices(data) })
    }
    if (params.get('error')) {
      setConnectMessage({ text: 'Connection failed — please try again.', ok: false })
      window.history.replaceState({}, '', '/profile')
    }
  }, [user?.id]) // eslint-disable-line

  async function handleConnectTracker(provider: string) {
    if (!user) return
    setConnecting(provider)
    setConnectMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const res = await fetch(`/api/terra/connect?provider=${provider}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()

      if (!res.ok || !json.url) {
        throw new Error(json.error ?? 'Failed to get Terra URL')
      }

      // Open Terra's OAuth widget in the same window
      window.location.href = json.url
    } catch (err: any) {
      setConnectMessage({ text: err.message ?? 'Connection failed', ok: false })
      setConnecting(null)
    }
  }

  async function handleDisconnect(deviceType: string) {
    if (!user) return
    setDisconnecting(deviceType)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const res = await fetch(`/api/terra/disconnect?type=${deviceType}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) throw new Error('Disconnect failed')

      setDevices(prev => prev.filter(d => d.type !== deviceType))
      setConnectMessage({ text: `${DEVICE_INFO[deviceType]?.label ?? deviceType} disconnected.`, ok: true })
    } catch (err: any) {
      setConnectMessage({ text: err.message ?? 'Disconnect failed', ok: false })
    } finally {
      setDisconnecting(null)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    router.replace('/auth/login')
  }

  async function handleSaveStats() {
    setSavingStats(true)
    try {
      const ageVal = statsForm.age ? parseInt(statsForm.age) : null
      const ft = statsForm.heightFt ? parseFloat(statsForm.heightFt) : 0
      const ins = statsForm.heightIn ? parseFloat(statsForm.heightIn) : 0
      const heightVal = (statsForm.heightFt || statsForm.heightIn) ? ft + ins / 12 : null
      const weightVal = statsForm.weight ? parseFloat(statsForm.weight) : null
      await supabase.from('users').update({ age: ageVal, height: heightVal, weight: weightVal }).eq('id', u.id)
      setLocalAge(ageVal)
      setLocalHeight(heightVal)
      setLocalWeight(weightVal)
      setEditingStats(false)
    } catch {
      // silently ignore
    } finally {
      setSavingStats(false)
    }
  }

  if (!user) return null
  const u = user

  const tier = user.tier ?? 'bronze'
  const tierColor = TIER_COLORS[tier]
  const pointsRedeemed = user.points_lifetime_earned - user.points_balance
  const connectedTypes = new Set(devices.filter(d => d.status === 'active').map(d => d.type))

  const CONNECTABLE_TRACKERS = [
    { type: 'apple_health', provider: 'APPLE' },
    { type: 'garmin', provider: 'GARMIN' },
    { type: 'fitbit', provider: 'FITBIT' },
  ]

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 24 }}>

      {/* Header */}
      <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Account</p>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif', marginBottom: 20 }}>Profile</h1>

      {/* Identity card */}
      <div style={{
        background: '#111110', borderRadius: 16, padding: 20, marginBottom: 14,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -24, right: -24, width: 100, height: 100, borderRadius: '50%', background: tierColor, opacity: 0.18 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: tierColor + '30',
            border: `2px solid ${tierColor}`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontFamily: 'Archivo, sans-serif', fontSize: 22,
            fontWeight: 900, color: tierColor, flexShrink: 0,
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 18, fontWeight: 900, color: '#F5F0EA', lineHeight: 1.1 }}>{user.name}</p>
            <p style={{ fontSize: 12, color: '#8A8478', marginTop: 3 }}>{user.email}</p>
            <p style={{ fontSize: 11, color: '#8A8478', marginTop: 2 }}>
              Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TierStar color={tierColor} />
          <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 13, fontWeight: 800, color: tierColor, textTransform: 'uppercase', letterSpacing: 1 }}>
            {getTierLabel(tier)}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#8A8478' }}>· {getTierMultiplier(tier)}x multiplier</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        <StatCard label="Sessions" value={user.lifetime_sessions} unit="all time" />
        <StatCard label="Earned" value={user.points_lifetime_earned.toLocaleString()} unit="pts total" accent="#B5593C" />
        <StatCard label="Redeemed" value={pointsRedeemed.toLocaleString()} unit="pts spent" />
      </div>

      {/* Body stats */}
      <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', margin: 0 }}>Body Stats</p>
          <button onClick={() => {
            const h = localHeight !== undefined ? localHeight : u.height
            setStatsForm({
              age: String(localAge !== undefined ? (localAge ?? '') : (u.age ?? '')),
              heightFt: h != null ? String(Math.floor(h)) : '',
              heightIn: h != null ? String(Math.round((h % 1) * 12)) : '',
              weight: String(localWeight !== undefined ? (localWeight ?? '') : (u.weight ?? '')),
            })
            setEditingStats(true)
          }} style={{ fontSize: 12, color: '#B5593C', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>Edit</button>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {(() => { const age = localAge !== undefined ? localAge : u.age; return age ? <StatInline label="Age" value={`${age} yr`} /> : <StatInline label="Age" value="—" /> })()}
          {(() => { const h = localHeight !== undefined ? localHeight : u.height; return h != null ? <StatInline label="Height" value={`${Math.floor(h)}'${Math.round((h % 1) * 12)}"`} /> : <StatInline label="Height" value="—" /> })()}
          {(() => { const w = localWeight !== undefined ? localWeight : u.weight; return w ? <StatInline label="Weight" value={`${w} lbs`} /> : <StatInline label="Weight" value="—" /> })()}
        </div>
      </div>

      {/* Connect Fitness Trackers */}
      <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 4 }}>Fitness Trackers</p>
        <p style={{ fontSize: 12, color: '#8A8478', marginBottom: 14 }}>
          Connect a tracker to auto-verify your workouts and earn 25% bonus points.
        </p>

        {connectMessage && (
          <div style={{
            background: connectMessage.ok ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${connectMessage.ok ? '#86efac' : '#fca5a5'}`,
            borderRadius: 8, padding: '10px 12px', marginBottom: 12,
            fontSize: 12, color: connectMessage.ok ? '#166534' : '#991b1b',
          }}>
            {connectMessage.text}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CONNECTABLE_TRACKERS.map(({ type, provider }) => {
            const info = DEVICE_INFO[type]
            const isConnected = connectedTypes.has(type)
            const isLoading = connecting === provider || disconnecting === type

            return (
              <div key={type} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 12,
                background: isConnected ? '#F0FDF4' : '#FAFAF9',
                border: `1.5px solid ${isConnected ? '#86efac' : '#E0D9CE'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{info.emoji}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>{info.label}</p>
                    <p style={{ fontSize: 11, color: '#8A8478' }}>
                      {isConnected ? '✓ Connected — workouts auto-verified' : 'Tap to connect'}
                    </p>
                  </div>
                </div>

                {isConnected ? (
                  <button
                    onClick={() => handleDisconnect(type)}
                    disabled={isLoading}
                    style={{
                      fontSize: 11, fontWeight: 700, color: '#dc2626',
                      background: 'transparent', border: '1px solid #fca5a5',
                      borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                      opacity: isLoading ? 0.5 : 1,
                    }}
                  >
                    {isLoading ? '...' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnectTracker(provider)}
                    disabled={isLoading || connecting !== null}
                    style={{
                      fontSize: 11, fontWeight: 800, color: '#F5F0EA',
                      background: '#111110', border: 'none',
                      borderRadius: 6, padding: '6px 12px', cursor: 'pointer',
                      opacity: (isLoading || connecting !== null) ? 0.5 : 1,
                      fontFamily: 'Archivo, sans-serif',
                    }}
                  >
                    {isLoading ? 'Opening...' : 'Connect'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* GPS is always available */}
        <div style={{
          marginTop: 10, padding: '10px 14px', borderRadius: 12,
          background: '#F0FDF4', border: '1.5px solid #86efac',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>📍</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>GPS Check-in</p>
            <p style={{ fontSize: 11, color: '#8A8478' }}>✓ Always active — auto-used when logging</p>
          </div>
        </div>
      </div>

      {/* Connected devices history */}
      {devices.filter(d => !['gps'].includes(d.type)).length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 12 }}>Connected Devices</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {devices.filter(d => d.type !== 'gps').map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{DEVICE_INFO[d.type]?.emoji ?? '📱'}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{DEVICE_INFO[d.type]?.label ?? d.type}</p>
                    <p style={{ fontSize: 11, color: '#8A8478' }}>
                      Connected {new Date(d.connected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                  color: d.status === 'active' ? '#16a34a' : '#dc2626',
                  background: d.status === 'active' ? '#F0FDF4' : '#FEF2F2',
                  padding: '3px 8px', borderRadius: 6,
                }}>
                  {d.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redemption history */}
      <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 12 }}>Redemption History</p>
        {redemptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: '#8A8478', fontSize: 13 }}>No redemptions yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {redemptions.map((r, i) => (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderTop: i > 0 ? '1px solid #F0EDE6' : 'none',
              }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{r.reward?.product_name ?? 'Reward'}</p>
                  <p style={{ fontSize: 11, color: '#8A8478' }}>
                    {r.reward?.brand_name} · {new Date(r.redeemed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 900, color: '#111110' }}>
                  -{r.points_spent.toLocaleString()} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        style={{
          width: '100%', padding: 15, background: 'transparent', color: '#ef4444',
          border: '1.5px solid #fca5a5', borderRadius: 10, fontSize: 14, fontWeight: 800,
          fontFamily: 'Archivo, sans-serif', cursor: 'pointer',
        }}
      >
        {signingOut ? 'Signing out...' : 'Sign Out'}
      </button>

      {/* Edit Body Stats Modal */}
      {editingStats && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setEditingStats(false)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480 }}
            onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 20 }}>Edit Body Stats</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1 }}>
                Age
                <input type="number" value={statsForm.age} onChange={e => setStatsForm(f => ({ ...f, age: e.target.value }))}
                  placeholder="35" style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', border: '1.5px solid #E0D9CE', borderRadius: 8, fontSize: 15, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, boxSizing: 'border-box' as const }} />
              </label>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1 }}>
                Height
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input type="number" value={statsForm.heightFt} onChange={e => setStatsForm(f => ({ ...f, heightFt: e.target.value }))}
                    placeholder="6" style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #E0D9CE', borderRadius: 8, fontSize: 15, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }} />
                  <span style={{ alignSelf: 'center', fontSize: 13, color: '#8A8478' }}>ft</span>
                  <input type="number" value={statsForm.heightIn} onChange={e => setStatsForm(f => ({ ...f, heightIn: e.target.value }))}
                    placeholder="0" min="0" max="11" style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #E0D9CE', borderRadius: 8, fontSize: 15, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }} />
                  <span style={{ alignSelf: 'center', fontSize: 13, color: '#8A8478' }}>in</span>
                </div>
              </label>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1 }}>
                Weight (lbs)
                <input type="number" value={statsForm.weight} onChange={e => setStatsForm(f => ({ ...f, weight: e.target.value }))}
                  placeholder="175" style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', border: '1.5px solid #E0D9CE', borderRadius: 8, fontSize: 15, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, boxSizing: 'border-box' as const }} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditingStats(false)}
                style={{ flex: 1, padding: 14, background: 'transparent', border: '1.5px solid #E0D9CE', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSaveStats} disabled={savingStats}
                style={{ flex: 2, padding: 14, background: '#111110', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Archivo, sans-serif' }}>
                {savingStats ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, unit, accent }: { label: string; value: string | number; unit: string; accent?: string }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
      <p style={{ fontSize: 9, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 900, color: accent ?? '#111110', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 9, color: '#8A8478', marginTop: 3 }}>{unit}</p>
    </div>
  )
}

function StatInline({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{label}</p>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 900 }}>{value}</p>
    </div>
  )
}

function TierStar({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={color}>
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  )
}
