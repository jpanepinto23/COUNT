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

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [redemptions, setRedemptions] = useState<(Redemption & { reward: { brand_name: string; product_name: string } })[]>([])
  const [devices, setDevices] = useState<{ type: string; connected_at: string; status: string }[]>([])
  const [signingOut, setSigningOut] = useState(false)

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
  }, [user?.id]) // eslint-disable-line

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    router.replace('/auth/login')
  }

  if (!user) return null

  const tier = user.tier ?? 'bronze'
  const tierColor = TIER_COLORS[tier]
  const pointsRedeemed = user.points_lifetime_earned - user.points_balance

  const deviceLabels: Record<string, string> = {
    apple_health: 'Apple Health',
    google_fit: 'Google Fit',
    gps: 'GPS Check-in',
    photo: 'Photo Verification',
  }

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 24 }}>
      {/* Header */}
      <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Account</p>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif', marginBottom: 20 }}>Profile</h1>

      {/* Identity card */}
      <div style={{
        background: '#111110',
        borderRadius: 16,
        padding: 20,
        marginBottom: 14,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -24, right: -24, width: 100, height: 100, borderRadius: '50%', background: tierColor, opacity: 0.18 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          {/* Avatar */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: tierColor + '30',
            border: `2px solid ${tierColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Archivo, sans-serif',
            fontSize: 22,
            fontWeight: 900,
            color: tierColor,
            flexShrink: 0,
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
      {(user.age || user.height || user.weight) && (
        <div style={{
          background: '#fff',
          border: '1.5px solid #E0D9CE',
          borderRadius: 14,
          padding: '14px 16px',
          marginBottom: 14,
        }}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 12 }}>Body Stats</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {user.age && <StatInline label="Age" value={`${user.age} yr`} />}
            {user.height && <StatInline label="Height" value={`${user.height} cm`} />}
            {user.weight && <StatInline label="Weight" value={`${user.weight} kg`} />}
          </div>
        </div>
      )}

      {/* Connected devices */}
      <div style={{
        background: '#fff',
        border: '1.5px solid #E0D9CE',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 14,
      }}>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 12 }}>Connected Devices</p>
        {devices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: '#8A8478', fontSize: 13, marginBottom: 4 }}>No devices connected yet.</p>
            <p style={{ color: '#8A8478', fontSize: 11 }}>GPS check-in is used automatically when logging.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {devices.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: d.status === 'active' ? '#F0FDF4' : '#FEF2F2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <DeviceIcon type={d.type} active={d.status === 'active'} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{deviceLabels[d.type] ?? d.type}</p>
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
        )}
      </div>

      {/* Redemption history */}
      <div style={{
        background: '#fff',
        border: '1.5px solid #E0D9CE',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 14,
      }}>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 12 }}>Redemption History</p>
        {redemptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: '#8A8478', fontSize: 13 }}>No redemptions yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {redemptions.map((r, i) => (
              <div key={r.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderTop: i > 0 ? '1px solid #F0EDE6' : 'none',
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
          width: '100%',
          padding: 15,
          background: 'transparent',
          color: '#ef4444',
          border: '1.5px solid #fca5a5',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 800,
          fontFamily: 'Archivo, sans-serif',
          cursor: 'pointer',
        }}
      >
        {signingOut ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  )
}

function StatCard({ label, value, unit, accent }: { label: string; value: string | number; unit: string; accent?: string }) {
  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #E0D9CE',
      borderRadius: 12,
      padding: '12px 10px',
      textAlign: 'center',
    }}>
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

function DeviceIcon({ type, active }: { type: string; active: boolean }) {
  const color = active ? '#16a34a' : '#dc2626'
  if (type === 'apple_health') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
    </svg>
  )
  if (type === 'gps') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
    </svg>
  )
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <rect x="5" y="2" width="14" height="20" rx="2"/>
      <line x1="12" y1="18" x2="12" y2="18"/>
    </svg>
  )
}
