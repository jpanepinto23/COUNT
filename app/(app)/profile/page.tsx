'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { getTierLabel, getTierMultiplier } from '@/lib/points'
import Icon from '@/components/Icon'
import type { Redemption } from '@/lib/types'

const modalInput: React.CSSProperties = {
  background: '#1A1A19',
  border: '1px solid rgba(245,240,234,0.12)',
  borderRadius: 8,
  padding: '8px 10px',
  color: '#F5F0EA',
  fontSize: 14,
  fontFamily: 'JetBrains Mono, monospace',
  outline: 'none',
  marginTop: 4,
  width: '100%',
  boxSizing: 'border-box' as const,
}

function TierStar({ color }: { color: string }) {
  return <span style={{ color, display: 'flex' }}><Icon emoji="Star" size={16} /></span>
}

function StatInline({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: '#F5F0EA', lineHeight: 1, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 9, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3, margin: '3px 0 0 0' }}>{label}</p>
    </div>
  )
}

function StatCard({ label, value, unit, accent }: { label: string; value: string | number; unit: string; accent?: string }) {
  return (
    <div style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 900, color: accent || '#F5F0EA', lineHeight: 1, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 9, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, margin: '4px 0 0 0' }}>{label}</p>
      <p style={{ fontSize: 8, color: '#555', marginTop: 2, margin: '2px 0 0 0' }}>{unit}</p>
    </div>
  )
}

const TIER_COLORS: Record<string, string> = {
  bronze:   '#B5593C',
  silver:   '#6B7280',
  gold:     '#D97706',
  platinum: '#7C3AED',
}

const DEVICE_INFO: Record<string, { label: string; icon: string; provider: string }> = {
  strava:     { label: 'Strava',             icon: 'Activity', provider: 'STRAVA' },
  google_fit: { label: 'Google Fit',         icon: 'Activity', provider: 'GOOGLE' },
  gps:        { label: 'GPS Check-in',       icon: 'MapPin', provider: '' },
  photo:      { label: 'Photo Verification', icon: 'Camera', provider: '' },
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user?.avatar_url) setAvatarUrl(user.avatar_url)
  }, [user?.avatar_url])

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

    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      setConnectMessage({ text: 'Fitness tracker connected! Your workouts will now be auto-verified.', ok: true })
      window.history.replaceState({}, '', '/profile')
      supabase.from('connected_devices').select('type, connected_at, status').eq('user_id', user.id)
        .then(({ data }) => { if (data) setDevices(data) })
    }
    if (params.get('error')) {
      setConnectMessage({ text: 'Connection failed — please try again.', ok: false })
      window.history.replaceState({}, '', '/profile')
    }
  }, [user?.id]) // eslint-disable-line

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id)
      setAvatarUrl(publicUrl)
    }
    setUploadingAvatar(false)
  }

  async function handleConnectStrava() {
    if (!user) return
    setConnecting('strava')
    setConnectMessage(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      const res = await fetch('/api/strava/connect', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Failed to get Terra URL')
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
      const res = await fetch('/api/strava/disconnect', { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
      if (!res.ok) throw new Error('Disconnect failed')
      setDevices(prev => prev.filter(d => d.type !== deviceType))
      setConnectMessage({ text: `${DEVICE_INFO[deviceType]?.label ?? deviceType} disconnected.`, ok: true })
    } catch (err: any) {
      setConnectMessage({ text: err.message ?? 'Disconnect failed', ok: false })
    } finally { setDisconnecting(null) }
  }

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    router.replace('/auth/login')
  }

  async function handleSaveStats() {
    setSavingStats(true)
    try {
      const ageVal    = statsForm.age ? parseInt(statsForm.age) : null
      const ft        = statsForm.heightFt ? parseFloat(statsForm.heightFt) : 0
      const ins       = statsForm.heightIn ? parseFloat(statsForm.heightIn) : 0
      const heightVal = (statsForm.heightFt || statsForm.heightIn) ? ft + ins / 12 : null
      const weightVal = statsForm.weight ? parseFloat(statsForm.weight) : null
      await supabase.from('users').update({ age: ageVal, height: heightVal, weight: weightVal }).eq('id', u.id)
      setLocalAge(ageVal); setLocalHeight(heightVal); setLocalWeight(weightVal)
      setEditingStats(false)
    } catch { /* silently ignore */ } finally { setSavingStats(false) }
  }

  if (!user) return null
  const u = user
  const tier = user.tier ?? 'bronze'
  const tierColor = TIER_COLORS[tier]
  const pointsRedeemed = user.points_lifetime_earned - user.points_balance
  const connectedTypes = new Set(devices.filter(d => d.status === 'active').map(d => d.type))
  const CONNECTABLE_TRACKERS = [{ type: 'strava', provider: 'STRAVA' }]

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 24, background: '#0E0E0D', minHeight: '100dvh' }}>
      <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Account</p>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif', marginBottom: 20, color: '#F5F0EA' }}>Profile</h1>

      <div style={{ background: '#111110', borderRadius: 16, padding: 20, marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -24, right: -24, width: 100, height: 100, borderRadius: '50%', background: tierColor, opacity: 0.18 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div onClick={() => avatarInputRef.current?.click()} title="Tap to change photo" style={{ width: 68, height: 68, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: `2.5px solid ${tierColor}`, position: 'relative', background: avatarUrl ? 'transparent' : tierColor + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 24, fontWeight: 900, color: tierColor }}>{user.name.charAt(0).toUpperCase()}</span>}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 22, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 8, fontWeight: 800, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 3 }}>
                {uploadingAvatar ? '↑ …' : <><Icon emoji="Camera" size={12} /> EDIT</>}
              </span>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </div>
          <div>
            <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 18, fontWeight: 900, color: '#F5F0EA', lineHeight: 1.1 }}>{user.name}</p>
            <p style={{ fontSize: 12, color: '#8A8478', marginTop: 3 }}>{user.email}</p>
            <p style={{ fontSize: 11, color: '#8A8478', marginTop: 2 }}>Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TierStar color={tierColor} />
          <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 13, fontWeight: 800, color: tierColor, textTransform: 'uppercase', letterSpacing: 1 }}>{getTierLabel(tier)}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#8A8478' }}>&middot; {getTierMultiplier(tier)}x</span>
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color: '#F5F0EA', lineHeight: 1 }}>{user.current_streak}</p>
            <p style={{ fontSize: 9, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Icon emoji="Flame" size={12} /> streak
            </p>
          </div>
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color: '#F5F0EA', lineHeight: 1 }}>{user.longest_streak}</p>
            <p style={{ fontSize: 9, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Icon emoji="Zap" size={12} /> best
            </p>
          </div>
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color: '#B5593C', lineHeight: 1 }}>{user.points_balance.toLocaleString()}</p>
            <p style={{ fontSize: 9, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Icon emoji="Coins" size={12} /> balance
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        <StatCard label="Sessions" value={user.lifetime_sessions} unit="all time" />
        <StatCard label="Earned" value={user.points_lifetime_earned.toLocaleString()} unit="pts total" accent="#B5593C" />
        <StatCard label="Redeemed" value={pointsRedeemed.toLocaleString()} unit="pts spent" />
      </div>

      <div style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(245,240,234,0.45)', margin: 0 }}>Body Stats</p>
          <button onClick={() => {
            const h = localHeight !== undefined ? localHeight : u.height
            setStatsForm({ age: String(localAge !== undefined ? (localAge ?? '') : (u.age ?? '')), heightFt: h != null ? String(Math.floor(h)) : '', heightIn: h != null ? String(Math.round((h % 1) * 12)) : '', weight: String(localWeight !== undefined ? (localWeight ?? '') : (u.weight ?? '')) })
            setEditingStats(true)
          }} style={{ fontSize: 12, color: '#B5593C', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>Edit</button>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {(() => { const age = localAge !== undefined ? localAge : u.age; return age ? <StatInline label="Age" value={`${age} yr`} /> : <StatInline label="Age" value="—" /> })()}
          {(() => { const h = localHeight !== undefined ? localHeight : u.height; return h != null ? <StatInline label="Height" value={`${Math.floor(h)}'${Math.round((h % 1) * 12)}"`} /> : <StatInline label="Height" value="—" /> })()}
          {(() => { const w = localWeight !== undefined ? localWeight : u.weight; return w ? <StatInline label="Weight" value={`${w} lbs`} /> : <StatInline label="Weight" value="—" /> })()}
        </div>
      </div>

      <div style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 4 }}>Fitness Trackers</p>
        <p style={{ fontSize: 12, color: '#8A8478', marginBottom: 14 }}>Connect a tracker to auto-verify your workouts and earn full points. Unverified sessions earn 10%.</p>
        {connectMessage && (
          <div style={{ background: connectMessage.ok ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)', border: `1px solid ${connectMessage.ok ? 'rgba(34,197,94,0.25)' : 'rgba(252,165,165,0.3)'}`, borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12, color: connectMessage.ok ? '#4ade80' : '#f87171' }}>
            {connectMessage.text}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CONNECTABLE_TRACKERS.map(({ type, provider }) => {
            const info = DEVICE_INFO[type]
            const isConnected = connectedTypes.has(type)
            const isLoading = connecting === provider || disconnecting === type
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: isConnected ? 'rgba(22,163,74,0.10)' : '#1A1A18', border: `1.5px solid ${isConnected ? 'rgba(34,197,94,0.25)' : 'rgba(245,240,234,0.08)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'flex' }}><Icon emoji={info.icon} size={22} /></span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F5F0EA' }}>{info.label}</p>
                    <p style={{ fontSize: 11, color: '#8A8478' }}>{isConnected ? 'Connected — workouts auto-verified' : 'Tap to connect'}</p>
                  </div>
                </div>
                { isConnected ? (
                  <button onClick={() => handleDisconnect(type)} disabled={isLoading} style={{ fontSize: 11, fontWeight: 700, color: '#f87171', background: 'transparent', border: '1px solid rgba(252,165,165,0.3)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>
                    {isLoading ? '...' : 'Disconnect'}
                  </button>
                ) : (
                  <button onClick={() => handleConnectStrava()} disabled={isLoading || connecting !== null} style={{ fontSize: 11, fontWeight: 800, color: '#F5F0EA', background: '#B5593C', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', opacity: (isLoading || connecting !== null) ? 0.5 : 1, fontFamily: 'Archivo, sans-serif' }}>
                    {isLoading ? 'Opening...' : 'Connect'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(22,163,74,0.10)', border: '1.5px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex' }}><Icon emoji="MapPin" size={20} /></span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#F5F0EA' }}>GPS Check-in</p>
            <p style={{ fontSize: 11, color: '#8A8478' }}>Always active — auto-used when logging</p>
          </div>
        </div>
      </div>

      {devices.filter(d => !['gps'].includes(d.type)).length > 0 && (
        <div style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 12 }}>Connected Devices</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {devices.filter(d => d.type !== 'gps').map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'flex' }}><Icon emoji={DEVICE_INFO[d.type]?.icon ?? 'Grip'} size={20} /></span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F5F0EA' }}>{DEVICE_INFO[d.type]?.label ?? d.type}</p>
                    <p style={{ fontSize: 11, color: '#8A8478' }}>Connected {new Date(d.connected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, color: d.status === 'active' ? '#4ade80' : '#f87171', background: d.status === 'active' ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)', padding: '3px 8px', borderRadius: 6 }}>
                  {d.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 12 }}>Redemption History</p>
        {redemptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: 'rgba(245,240,234,0.4)', fontSize: 13 }}>No redemptions yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {redemptions.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: i > 0 ? '1px solid rgba(245,240,234,0.06)' : 'none' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#F5F0EA' }}>{r.reward?.product_name ?? 'Reward'}</p>
                  <p style={{ fontSize: 11, color: '#8A8478' }}>{r.reward?.brand_name} &middot; {new Date(r.redeemed_at ?? r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 900, color: '#F5F0EA' }}>-{r.points_spent.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={handleSignOut} disabled={signingOut} style={{ width: '100%', padding: 15, background: 'transparent', color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 10, fontSize: 14, fontWeight: 800, fontFamily: 'Archivo, sans-serif', cursor: 'pointer' }}>
        {signingOut ? 'Signing out...' : 'Sign Out'}
      </button>

      {editingStats && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setEditingStats(false)}>
          <div style={{ background: '#111110', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 20 }}>Edit Body Stats</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1 }}>
                Age
                <input type="number" value={statsForm.age} onChange={e => setStatsForm(f => ({ ...f, age: e.target.value }))} placeholder="35" style={modalInput} />
              </label>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1 }}>
                Height
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>                  <input type="number" value={statsForm.heightFt} onChange={e => setStatsForm(f => ({ ...f, heightFt: e.target.value }))} placeholder="6" style={{ ...modalInput, marginTop: 0 }} />
                  <span style={{ alignSelf: 'center', fontSize: 13, color: '#8A8478' }}>ft</span>
                  <input type="number" value={statsForm.heightIn} onChange={e => setStatsForm(f => ({ ...f, heightIn: e.target.value }))} placeholder="0" min="0" max="11" style={{ ...modalInput, marginTop: 0 }} />
                  <span style={{ alignSelf: 'center', fontSize: 13, color: '#8A8478' }}>in</span>
                </div>
              </label>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1 }}>
                Weight (lbs)
                <input type="number" value={statsForm.weight} onChange={e => setStatsForm(f => ({ ...f, weight: e.target.value }))} placeholder="175" style={{ ...modalInput, display: 'block', width: '100%', boxSizing: 'border-box' as const }} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditingStats(false)} style={{ flex: 1, padding: 14, background: 'transparent', border: '1.5px solid rgba(245,240,234,0.12)', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#F5F0EA', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveStats} disabled={savingStats} style={{ flex: 2, padding: 14, background: '#B5593C', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Archivo, sans-serif' }}>{savingStats ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
