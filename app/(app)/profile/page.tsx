'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { getTierLabel, getTierMultiplier } from '@/lib/points'
import type { Redemption } from '@/lib/types'

// ===== Design tokens (per Claude Design handoff) =====
const TOK = {
  bg: '#0E0E0D',
  fg: '#F5F0EA',
  copper: '#B5593C',
  copper2: '#D47858',
  copperDim: '#5a2c1e',
  muted: '#8A8680',
  dim: '#3a3833',
  card: '#181714',
  card2: '#1f1d19',
  hairline: 'rgba(245,240,234,0.08)',
  hairline2: 'rgba(245,240,234,0.14)',
  green: '#16a34a',
  red: '#ef4444',
}

const TIER_COLORS: Record<string, string> = {
  bronze: TOK.copper,
  silver: '#8B8680',
  gold: '#D4A55E',
  platinum: '#A189C4',
}

const DEVICE_INFO: Record<string, { label: string; provider: string }> = {
  strava: { label: 'Strava', provider: 'STRAVA' },
  google_fit: { label: 'Google Fit', provider: 'GOOGLE' },
  gps: { label: 'GPS Check-in', provider: '' },
  photo: { label: 'Photo Verification', provider: '' },
}

// ===== COUNT logo (matches rewards/home) =====
function CountLogo({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const scale = size === 'md' ? 1.4 : 1
  const markW = 35.2 * scale
  const markH = 28.8 * scale
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9.6 * scale, justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: markW, height: markH }}>
        {[4.8, 11.2, 17.6, 24].map((leftBase, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: leftBase * scale,
              top: 3.2 * scale,
              width: 3.2 * scale,
              height: 22.4 * scale,
              background: TOK.fg,
              borderRadius: 2,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            top: 12.8 * scale,
            left: -1.6 * scale,
            width: 38.4 * scale,
            height: 2.8 * scale,
            background: TOK.copper,
            borderRadius: 2,
            transform: 'rotate(-30deg)',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'Archivo, var(--sans), sans-serif',
          fontSize: 16 * scale,
          fontWeight: 900,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: TOK.fg,
        }}
      >
        COUNT
      </span>
    </div>
  )
}

// ===== Section header (mono eyebrow + serif title) =====
function SectionHead({ eyebrow, title, right }: { eyebrow: string; title: string; right?: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '18px 20px 8px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: TOK.muted }}>
          {eyebrow}
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: TOK.fg, letterSpacing: '-0.015em', marginTop: 3, lineHeight: 1.1 }}>
          {title}
        </div>
      </div>
      {right}
    </div>
  )
}

// ===== Streak hero — 160deg copper gradient card =====
function StreakHero({
  streakDays,
  longestStreak,
  multiplier,
}: {
  streakDays: number
  longestStreak: number
  multiplier: number
}) {
  const [displayed, setDisplayed] = useState(streakDays)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const from = displayed
    const to = streakDays
    const dur = 700
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const e = 1 - Math.pow(1 - t, 3)
      setDisplayed(Math.round(from + (to - from) * e))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streakDays])

  return (
    <div
      style={{
        position: 'relative',
        margin: '14px 16px 0',
        borderRadius: 20,
        overflow: 'hidden',
        border: `1px solid ${TOK.hairline}`,
        background: `linear-gradient(160deg, ${TOK.copper} 0%, ${TOK.copperDim} 55%, ${TOK.bg} 110%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 10px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-35%',
          right: '-20%',
          width: '70%',
          height: '80%',
          background: 'radial-gradient(circle, rgba(255,230,210,0.22) 0%, transparent 60%)',
          filter: 'blur(10px)',
        }}
      />
      <div style={{ position: 'relative', padding: '24px 22px 22px' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: 'rgba(245,240,234,0.75)',
          }}
        >
          Current streak
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 84,
              fontWeight: 400,
              letterSpacing: '-0.04em',
              color: TOK.fg,
              lineHeight: 1,
              fontFeatureSettings: '"tnum"',
            }}
          >
            {displayed}
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(245,240,234,0.7)',
            }}
          >
            {streakDays === 1 ? 'day' : 'days'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={heroChipStyle(true)}>
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
            <span style={{ color: '#fff', fontWeight: 600, marginLeft: 6 }}>{multiplier.toFixed(1)}×</span>
            <span style={{ color: 'rgba(255,255,255,0.75)', marginLeft: 4 }}>multiplier</span>
          </div>
          <div style={heroChipStyle(false)}>
            <span style={{ color: TOK.fg, fontWeight: 600 }}>{longestStreak}</span>
            <span style={{ color: 'rgba(245,240,234,0.7)', marginLeft: 4 }}>best</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function heroChipStyle(filled = false): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    padding: '7px 11px',
    borderRadius: 999,
    background: filled ? 'rgba(0,0,0,0.28)' : 'rgba(245,240,234,0.08)',
    border: `1px solid ${filled ? 'rgba(0,0,0,0.35)' : 'rgba(245,240,234,0.14)'}`,
    backdropFilter: 'blur(4px)',
    fontFamily: 'var(--mono)',
    fontSize: 11,
    letterSpacing: '0.02em',
  }
}

// ===== Stat tile — big serif number + mono label =====
function StatTile({
  label,
  value,
  suffix,
  accent,
}: {
  label: string
  value: number | string
  suffix?: string
  accent?: string
}) {
  return (
    <div
      style={{
        background: TOK.card,
        border: `1px solid ${TOK.hairline}`,
        borderRadius: 14,
        padding: '14px 14px 14px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: TOK.muted,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
        <span
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 34,
            color: accent ?? TOK.fg,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            fontFeatureSettings: '"tnum"',
          }}
        >
          {value}
        </span>
        {suffix && (
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: TOK.muted,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

// ===== Achievement tile =====
type Achievement = {
  id: string
  label: string
  hint: string
  icon: React.ReactNode
  unlocked: boolean
}

function AchievementTile({ a }: { a: Achievement }) {
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 14,
        background: a.unlocked ? TOK.card : 'rgba(245,240,234,0.03)',
        border: `1px solid ${a.unlocked ? TOK.hairline2 : TOK.hairline}`,
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        overflow: 'hidden',
        opacity: a.unlocked ? 1 : 0.55,
      }}
    >
      {a.unlocked && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 50% 0%, rgba(181,89,60,0.18) 0%, transparent 65%)`,
          }}
        />
      )}
      <div
        style={{
          position: 'relative',
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: a.unlocked ? `${TOK.copper}22` : 'rgba(245,240,234,0.04)',
          border: `1px solid ${a.unlocked ? TOK.copper : TOK.hairline2}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: a.unlocked ? TOK.copper : TOK.muted,
        }}
      >
        {a.unlocked ? (
          a.icon
        ) : (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 1 1 8 0v3" />
          </svg>
        )}
      </div>
      <div
        style={{
          position: 'relative',
          fontFamily: 'var(--sans)',
          fontSize: 11,
          fontWeight: 600,
          color: a.unlocked ? TOK.fg : TOK.muted,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {a.label}
      </div>
      <div
        style={{
          position: 'relative',
          fontFamily: 'var(--mono)',
          fontSize: 8,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: TOK.muted,
          textAlign: 'center',
        }}
      >
        {a.hint}
      </div>
    </div>
  )
}

// ===== Link row =====
function LinkRow({
  icon,
  label,
  hint,
  href,
  onClick,
  isLast,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  href?: string
  onClick?: () => void
  isLast?: boolean
}) {
  const content = (
    <>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: TOK.card2,
          border: `1px solid ${TOK.hairline}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: TOK.copper,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 14, color: TOK.fg, fontWeight: 500 }}>{label}</div>
        {hint && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: TOK.muted, letterSpacing: '0.06em', marginTop: 2 }}>
            {hint}
          </div>
        )}
      </div>
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={TOK.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 6 15 12 9 18" />
      </svg>
    </>
  )
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    borderTop: isLast ? 'none' : undefined,
    borderBottom: isLast ? 'none' : `1px solid ${TOK.hairline}`,
    textDecoration: 'none',
    color: 'inherit',
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    cursor: onClick ? 'pointer' : 'default',
  }
  if (href) {
    return (
      <Link href={href} style={style}>
        {content}
      </Link>
    )
  }
  return (
    <button onClick={onClick} style={style as React.CSSProperties}>
      {content}
    </button>
  )
}

// ===== Page =====
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
      .then(({ data }) => {
        if (data) setRedemptions(data as any)
      })

    supabase
      .from('connected_devices')
      .select('type, connected_at, status')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setDevices(data)
      })

    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      setConnectMessage({ text: 'Fitness tracker connected. Workouts will now auto-verify.', ok: true })
      window.history.replaceState({}, '', '/profile')
      supabase
        .from('connected_devices')
        .select('type, connected_at, status')
        .eq('user_id', user.id)
        .then(({ data }) => {
          if (data) setDevices(data)
        })
    }
    if (params.get('error')) {
      setConnectMessage({ text: 'Connection failed — please try again.', ok: false })
      window.history.replaceState({}, '', '/profile')
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!upErr) {
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path)
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
      const {
        data: { session },
      } = await supabase.auth.getSession()
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
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      const res = await fetch('/api/strava/disconnect', { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
      if (!res.ok) throw new Error('Disconnect failed')
      setDevices((prev) => prev.filter((d) => d.type !== deviceType))
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
    if (!user) return
    setSavingStats(true)
    try {
      const ageVal = statsForm.age ? parseInt(statsForm.age) : null
      const ft = statsForm.heightFt ? parseFloat(statsForm.heightFt) : 0
      const ins = statsForm.heightIn ? parseFloat(statsForm.heightIn) : 0
      const heightVal = statsForm.heightFt || statsForm.heightIn ? ft + ins / 12 : null
      const weightVal = statsForm.weight ? parseFloat(statsForm.weight) : null
      await supabase.from('users').update({ age: ageVal, height: heightVal, weight: weightVal }).eq('id', user.id)
      setLocalAge(ageVal)
      setLocalHeight(heightVal)
      setLocalWeight(weightVal)
      setEditingStats(false)
    } catch {
      /* silently ignore */
    } finally {
      setSavingStats(false)
    }
  }

  if (!user) return null
  const u = user
  const tier = user.tier ?? 'bronze'
  const tierColor = TIER_COLORS[tier]
  const pointsRedeemed = Math.max(0, (user.points_lifetime_earned ?? 0) - (user.points_balance ?? 0))
  const streakDays = user.current_streak ?? 0
  const longestStreak = user.longest_streak ?? streakDays
  const lifetimeSessions = user.lifetime_sessions ?? 0
  const multiplier =
    streakDays >= 30 ? 1.5 : streakDays >= 14 ? 1.3 : streakDays >= 7 ? 1.2 : streakDays >= 3 ? 1.1 : 1.0
  const connectedTypes = new Set(devices.filter((d) => d.status === 'active').map((d) => d.type))
  const CONNECTABLE_TRACKERS = [{ type: 'strava', provider: 'STRAVA' }]

  // Derive handle from email local-part, with fallback to name
  const handleBase = (user.email?.split('@')[0] || user.name || 'athlete').replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase()
  const handle = '@' + handleBase

  // Achievements (6, 3x2 grid)
  const achievements: Achievement[] = [
    {
      id: 'first_log',
      label: 'First Log',
      hint: lifetimeSessions >= 1 ? 'Earned' : 'Log 1 workout',
      unlocked: lifetimeSessions >= 1,
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      id: 'five_logs',
      label: '5 Workouts',
      hint: lifetimeSessions >= 5 ? 'Earned' : `${Math.max(0, 5 - lifetimeSessions)} to go`,
      unlocked: lifetimeSessions >= 5,
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 6.5L17.5 17.5M14.5 3.5L20.5 9.5M3.5 14.5L9.5 20.5M9 9L15 15" />
        </svg>
      ),
    },
    {
      id: 'twentyfive_logs',
      label: '25 Workouts',
      hint: lifetimeSessions >= 25 ? 'Earned' : `${Math.max(0, 25 - lifetimeSessions)} to go`,
      unlocked: lifetimeSessions >= 25,
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1 3-6z" />
        </svg>
      ),
    },
    {
      id: 'streak_3',
      label: '3-Day Streak',
      hint: longestStreak >= 3 ? 'Earned' : `${Math.max(0, 3 - streakDays)} day${streakDays === 2 ? '' : 's'} to go`,
      unlocked: longestStreak >= 3,
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      ),
    },
    {
      id: 'streak_7',
      label: '7-Day Streak',
      hint: longestStreak >= 7 ? 'Earned' : `${Math.max(0, 7 - longestStreak)} day${longestStreak === 6 ? '' : 's'} to go`,
      unlocked: longestStreak >= 7,
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      ),
    },
    {
      id: 'streak_30',
      label: '30-Day Streak',
      hint: longestStreak >= 30 ? 'Earned' : `${Math.max(0, 30 - longestStreak)} days to go`,
      unlocked: longestStreak >= 30,
      icon: (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="6" />
          <path d="M9 14l-2 8 5-3 5 3-2-8" />
        </svg>
      ),
    },
  ]

  return (
    <div
      style={{
        background: TOK.bg,
        minHeight: '100dvh',
        color: TOK.fg,
        fontFamily: 'var(--sans)',
        paddingBottom: 120,
      }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
        :root {
          --sans: 'Geist', system-ui, -apple-system, sans-serif;
          --mono: 'Geist Mono', ui-monospace, monospace;
          --serif: 'Instrument Serif', Georgia, serif;
        }
        @keyframes sheetUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Top brand bar */}
      <div
        style={{
          padding: '14px 20px 6px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderBottom: `1px solid ${TOK.hairline}`,
        }}
      >
        <CountLogo />
      </div>

      {/* Page header */}
      <div style={{ padding: '14px 20px 0' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: TOK.muted,
          }}
        >
          Account
        </div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 28,
            color: TOK.fg,
            letterSpacing: '-0.015em',
            marginTop: 2,
            lineHeight: 1.1,
          }}
        >
          Profile
        </div>
      </div>

      {/* Identity block — avatar + name + handle + tier chip */}
      <div style={{ padding: '16px 20px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: TOK.card,
            border: `1px solid ${TOK.hairline}`,
            borderRadius: 18,
            padding: '18px 18px',
          }}
        >
          <div
            onClick={() => avatarInputRef.current?.click()}
            title="Tap to change photo"
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              flexShrink: 0,
              cursor: 'pointer',
              border: `2px solid ${tierColor}`,
              position: 'relative',
              background: avatarUrl ? 'transparent' : `${tierColor}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 30,
                  color: tierColor,
                  letterSpacing: '-0.02em',
                }}
              >
                {(user.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 20,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  color: '#fff',
                  fontFamily: 'var(--mono)',
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                {uploadingAvatar ? '…' : 'Edit'}
              </span>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 24,
                color: TOK.fg,
                letterSpacing: '-0.015em',
                lineHeight: 1.1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.name}
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: TOK.muted,
                marginTop: 4,
                letterSpacing: '0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {handle}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 10,
                padding: '4px 10px',
                borderRadius: 999,
                background: `${tierColor}18`,
                border: `1px solid ${tierColor}55`,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: tierColor,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: tierColor,
                  fontWeight: 700,
                }}
              >
                {getTierLabel(tier)}
              </span>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  color: TOK.muted,
                  letterSpacing: '0.08em',
                }}
              >
                · {getTierMultiplier(tier)}×
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Streak hero */}
      <StreakHero streakDays={streakDays} longestStreak={longestStreak} multiplier={multiplier} />

      {/* 2x2 Stats grid */}
      <div
        style={{
          padding: '14px 16px 0',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        <StatTile label="Balance" value={user.points_balance.toLocaleString()} suffix="coins" accent={TOK.copper} />
        <StatTile label="Earned" value={(user.points_lifetime_earned ?? 0).toLocaleString()} suffix="total" />
        <StatTile label="Sessions" value={lifetimeSessions} suffix="all time" />
        <StatTile label="Redeemed" value={pointsRedeemed.toLocaleString()} suffix="coins" />
      </div>

      {/* Achievements */}
      <SectionHead
        eyebrow="Milestones"
        title="Achievements"
        right={
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: '0.2em',
              color: TOK.muted,
              textTransform: 'uppercase',
              paddingBottom: 4,
            }}
          >
            {achievements.filter((a) => a.unlocked).length}/{achievements.length}
          </div>
        }
      />
      <div
        style={{
          padding: '0 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}
      >
        {achievements.map((a) => (
          <AchievementTile key={a.id} a={a} />
        ))}
      </div>

      {/* Link rows */}
      <SectionHead eyebrow="Jump to" title="Quick links" />
      <div
        style={{
          margin: '0 16px',
          background: TOK.card,
          border: `1px solid ${TOK.hairline}`,
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <LinkRow
          href="/invite"
          label="Friends"
          hint="Invite friends · earn bonus coins"
          icon={
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <LinkRow
          href="/history"
          label="History"
          hint="Workouts · redemptions"
          icon={
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
        <LinkRow
          href="/log"
          label="Earn"
          hint="Log a workout · +50–80 coins"
          icon={
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v10M7 12h10" />
            </svg>
          }
        />
        <LinkRow
          href="#settings"
          label="Settings"
          hint="Trackers · body stats · sign out"
          isLast
          icon={
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9 1.65 1.65 0 0 0 4.27 7.18l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.12.31.2.64.2.98 0 .34-.08.67-.2.98z" />
            </svg>
          }
        />
      </div>

      {/* ===== Settings section (anchored) ===== */}
      <div id="settings" style={{ height: 0 }} />

      {/* Body stats card */}
      <SectionHead
        eyebrow="You"
        title="Body stats"
        right={
          <button
            onClick={() => {
              const h = localHeight !== undefined ? localHeight : u.height
              setStatsForm({
                age: String(localAge !== undefined ? localAge ?? '' : u.age ?? ''),
                heightFt: h != null ? String(Math.floor(h)) : '',
                heightIn: h != null ? String(Math.round((h % 1) * 12)) : '',
                weight: String(localWeight !== undefined ? localWeight ?? '' : u.weight ?? ''),
              })
              setEditingStats(true)
            }}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: TOK.copper,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
              fontWeight: 600,
              paddingBottom: 4,
            }}
          >
            Edit →
          </button>
        }
      />
      <div style={{ padding: '0 16px' }}>
        <div
          style={{
            background: TOK.card,
            border: `1px solid ${TOK.hairline}`,
            borderRadius: 14,
            padding: '16px 18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {(() => {
            const age = localAge !== undefined ? localAge : u.age
            return <BodyStat label="Age" value={age ? `${age}` : '—'} suffix={age ? 'yr' : ''} />
          })()}
          {(() => {
            const h = localHeight !== undefined ? localHeight : u.height
            return h != null ? (
              <BodyStat label="Height" value={`${Math.floor(h)}'${Math.round((h % 1) * 12)}"`} />
            ) : (
              <BodyStat label="Height" value="—" />
            )
          })()}
          {(() => {
            const w = localWeight !== undefined ? localWeight : u.weight
            return <BodyStat label="Weight" value={w ? `${w}` : '—'} suffix={w ? 'lbs' : ''} />
          })()}
        </div>
      </div>

      {/* Trackers card */}
      <SectionHead eyebrow="Verify" title="Fitness trackers" />
      <div style={{ padding: '0 16px' }}>
        <div
          style={{
            background: TOK.card,
            border: `1px solid ${TOK.hairline}`,
            borderRadius: 14,
            padding: '14px 16px',
          }}
        >
          <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: TOK.muted, marginBottom: 14, lineHeight: 1.5 }}>
            Connect a tracker to auto-verify your workouts and earn full coins. Unverified sessions earn 10%.
          </div>
          {connectMessage && (
            <div
              style={{
                background: connectMessage.ok ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
                border: `1px solid ${connectMessage.ok ? 'rgba(34,197,94,0.25)' : 'rgba(252,165,165,0.3)'}`,
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 12,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: connectMessage.ok ? '#86efac' : '#fca5a5',
                letterSpacing: '0.02em',
              }}
            >
              {connectMessage.text}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CONNECTABLE_TRACKERS.map(({ type }) => {
              const info = DEVICE_INFO[type]
              const isConnected = connectedTypes.has(type)
              const isLoading = connecting === type || disconnecting === type
              return (
                <div
                  key={type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: isConnected ? 'rgba(22,163,74,0.08)' : TOK.card2,
                    border: `1px solid ${isConnected ? 'rgba(34,197,94,0.22)' : TOK.hairline}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: TOK.card,
                        border: `1px solid ${TOK.hairline}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isConnected ? '#86efac' : TOK.copper,
                      }}
                    >
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: TOK.fg, fontWeight: 600 }}>{info.label}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: TOK.muted, letterSpacing: '0.02em', marginTop: 2 }}>
                        {isConnected ? 'Connected · auto-verified' : 'Tap to connect'}
                      </div>
                    </div>
                  </div>
                  {isConnected ? (
                    <button
                      onClick={() => handleDisconnect(type)}
                      disabled={isLoading}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        background: 'transparent',
                        color: '#fca5a5',
                        border: '1px solid rgba(252,165,165,0.3)',
                        fontFamily: 'var(--mono)',
                        fontSize: 10,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        cursor: isLoading ? 'default' : 'pointer',
                        opacity: isLoading ? 0.5 : 1,
                      }}
                    >
                      {isLoading ? '…' : 'Disconnect'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnectStrava()}
                      disabled={isLoading || connecting !== null}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 999,
                        background: TOK.copper,
                        color: '#fff',
                        border: 'none',
                        fontFamily: 'var(--mono)',
                        fontSize: 10,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        cursor: isLoading || connecting !== null ? 'default' : 'pointer',
                        opacity: isLoading || connecting !== null ? 0.5 : 1,
                      }}
                    >
                      {isLoading ? 'Opening…' : 'Connect'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <div
            style={{
              marginTop: 10,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(22,163,74,0.08)',
              border: '1px solid rgba(34,197,94,0.22)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: TOK.card,
                border: `1px solid ${TOK.hairline}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#86efac',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: TOK.fg, fontWeight: 600 }}>GPS Check-in</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: TOK.muted, letterSpacing: '0.02em', marginTop: 2 }}>
                Always active · auto-used when logging
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connected devices (non-GPS) */}
      {devices.filter((d) => d.type !== 'gps').length > 0 && (
        <>
          <SectionHead eyebrow="Linked" title="Devices" />
          <div style={{ padding: '0 16px' }}>
            <div
              style={{
                background: TOK.card,
                border: `1px solid ${TOK.hairline}`,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              {devices
                .filter((d) => d.type !== 'gps')
                .map((d, i, arr) => (
                  <div
                    key={`${d.type}-${i}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: i < arr.length - 1 ? `1px solid ${TOK.hairline}` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: TOK.card2,
                          border: `1px solid ${TOK.hairline}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: TOK.copper,
                        }}
                      >
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: TOK.fg, fontWeight: 600 }}>
                          {DEVICE_INFO[d.type]?.label ?? d.type}
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: TOK.muted, letterSpacing: '0.04em', marginTop: 2 }}>
                          Connected{' '}
                          {new Date(d.connected_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: d.status === 'active' ? '#86efac' : '#fca5a5',
                        background: d.status === 'active' ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                        padding: '4px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {d.status}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {/* Redemption history */}
      <SectionHead eyebrow="Claimed" title="Redemption history" />
      <div style={{ padding: '0 16px' }}>
        <div
          style={{
            background: TOK.card,
            border: `1px solid ${TOK.hairline}`,
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {redemptions.length === 0 ? (
            <div style={{ padding: '22px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: TOK.muted }}>No redemptions yet.</div>
              <Link
                href="/rewards"
                style={{
                  display: 'inline-block',
                  marginTop: 8,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: TOK.copper,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Browse rewards →
              </Link>
            </div>
          ) : (
            redemptions.map((r, i) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: i < redemptions.length - 1 ? `1px solid ${TOK.hairline}` : 'none',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: TOK.muted }}>
                    {r.reward?.brand_name ?? 'COUNT'}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--sans)',
                      fontSize: 13,
                      color: TOK.fg,
                      fontWeight: 500,
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.reward?.product_name ?? 'Reward'}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: TOK.muted, letterSpacing: '0.04em', marginTop: 2 }}>
                    {new Date(r.redeemed_at ?? r.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 13,
                    color: TOK.copper,
                    fontWeight: 600,
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  −{r.points_spent.toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sign out */}
      <div style={{ padding: '20px 16px 0' }}>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: 'transparent',
            color: '#f87171',
            border: '1px solid rgba(239,68,68,0.28)',
            borderRadius: 12,
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 700,
            cursor: signingOut ? 'default' : 'pointer',
            opacity: signingOut ? 0.6 : 1,
          }}
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>

      {/* Footer */}
      <div style={{ padding: '20px 20px 24px', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: TOK.muted,
          }}
        >
          Joined{' '}
          {new Date(user.created_at).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </div>
      </div>

      {/* ===== Body stats edit sheet ===== */}
      {editingStats && (
        <div
          onClick={() => setEditingStats(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#121211',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              border: `1px solid ${TOK.hairline2}`,
              borderBottom: 'none',
              padding: '12px 20px 28px',
              animation: 'sheetUp 280ms cubic-bezier(.2,.8,.2,1)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(245,240,234,0.2)', margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: TOK.muted }}>
              Edit
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: TOK.fg, letterSpacing: '-0.015em', marginTop: 2, lineHeight: 1.1 }}>
              Body stats
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <label style={{ display: 'block' }}>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: TOK.muted,
                  }}
                >
                  Age
                </div>
                <input
                  type="number"
                  value={statsForm.age}
                  onChange={(e) => setStatsForm((f) => ({ ...f, age: e.target.value }))}
                  placeholder="35"
                  style={inputStyle()}
                />
              </label>
              <label style={{ display: 'block' }}>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: TOK.muted,
                  }}
                >
                  Height
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <input
                    type="number"
                    value={statsForm.heightFt}
                    onChange={(e) => setStatsForm((f) => ({ ...f, heightFt: e.target.value }))}
                    placeholder="6"
                    style={{ ...inputStyle(), marginTop: 0 }}
                  />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: TOK.muted }}>ft</span>
                  <input
                    type="number"
                    value={statsForm.heightIn}
                    onChange={(e) => setStatsForm((f) => ({ ...f, heightIn: e.target.value }))}
                    placeholder="0"
                    min="0"
                    max="11"
                    style={{ ...inputStyle(), marginTop: 0 }}
                  />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: TOK.muted }}>in</span>
                </div>
              </label>
              <label style={{ display: 'block' }}>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: TOK.muted,
                  }}
                >
                  Weight (lbs)
                </div>
                <input
                  type="number"
                  value={statsForm.weight}
                  onChange={(e) => setStatsForm((f) => ({ ...f, weight: e.target.value }))}
                  placeholder="175"
                  style={inputStyle()}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setEditingStats(false)}
                style={{
                  flex: '0 0 auto',
                  padding: '14px 18px',
                  borderRadius: 14,
                  background: 'transparent',
                  color: TOK.muted,
                  border: `1px solid ${TOK.hairline2}`,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStats}
                disabled={savingStats}
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  borderRadius: 14,
                  background: TOK.copper,
                  color: '#fff',
                  border: 'none',
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  cursor: savingStats ? 'default' : 'pointer',
                  opacity: savingStats ? 0.6 : 1,
                }}
              >
                {savingStats ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BodyStat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: TOK.muted,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 24,
            color: TOK.fg,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            fontFeatureSettings: '"tnum"',
          }}
        >
          {value}
        </span>
        {suffix && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: TOK.muted, letterSpacing: '0.06em' }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function inputStyle(): React.CSSProperties {
  return {
    background: '#1A1A19',
    border: `1px solid ${TOK.hairline2}`,
    borderRadius: 10,
    padding: '10px 12px',
    color: TOK.fg,
    fontFamily: 'var(--mono)',
    fontSize: 13,
    outline: 'none',
    marginTop: 6,
    width: '100%',
    boxSizing: 'border-box' as const,
  }
}
