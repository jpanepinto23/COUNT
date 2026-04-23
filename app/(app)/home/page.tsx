'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'

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
}

const FREEZE_COST = 100
const WEEKLY_GOAL = 5
const MONTHLY_GOAL = 20
const HERO_BG_IMAGE = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=60'

// ===== Tally logo (4 white bars + copper slash + Archivo wordmark) — matches landing page =====
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

// ===== Hero — editorial, big serif coin balance + hero bg image =====
function Hero({
  coins,
  streakDays,
  multiplier,
  weeklyDone,
  weeklyGoal,
}: {
  coins: number
  streakDays: number
  multiplier: number
  weeklyDone: number
  weeklyGoal: number
}) {
  const [displayed, setDisplayed] = useState(coins)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const from = displayed
    const to = coins
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
  }, [coins])

  return (
    <div
      style={{
        position: 'relative',
        margin: '4px 16px 0',
        borderRadius: 20,
        overflow: 'hidden',
        border: `1px solid ${TOK.hairline}`,
        background: TOK.card,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(180deg, rgba(14,14,13,0.55) 0%, rgba(14,14,13,0.85) 70%, ${TOK.bg} 100%), url('${HERO_BG_IMAGE}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div style={{ position: 'relative', padding: '28px 22px 24px' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: TOK.muted,
          }}
        >
          Count Coins
        </div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 84,
            fontWeight: 400,
            letterSpacing: '-0.04em',
            color: TOK.fg,
            lineHeight: 1,
            fontFeatureSettings: '"tnum"',
            marginTop: 4,
          }}
        >
          {displayed.toLocaleString()}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={chipStyle(weeklyDone > 0)}>
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke={weeklyDone > 0 ? '#fff' : TOK.copper}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
            <span style={{ color: weeklyDone > 0 ? '#fff' : TOK.copper, fontWeight: 600, marginLeft: 6 }}>
              {multiplier.toFixed(1)}×
            </span>
            <span style={{ color: weeklyDone > 0 ? 'rgba(255,255,255,0.75)' : TOK.muted, marginLeft: 4 }}>
              streak
            </span>
          </div>
          <div style={chipStyle(weeklyDone > 0)}>
            <span style={{ color: weeklyDone > 0 ? '#fff' : TOK.fg, fontWeight: 600 }}>
              {weeklyDone}/{weeklyGoal}
            </span>
            <span style={{ color: weeklyDone > 0 ? 'rgba(255,255,255,0.75)' : TOK.muted, marginLeft: 4 }}>
              this week
            </span>
          </div>
          <div style={chipStyle(false)}>
            <span style={{ color: TOK.fg, fontWeight: 600 }}>{streakDays}</span>
            <span style={{ color: TOK.muted, marginLeft: 4 }}>day streak</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function chipStyle(filled = false): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    padding: '7px 11px',
    borderRadius: 999,
    background: filled ? TOK.copper : 'rgba(245,240,234,0.04)',
    border: `1px solid ${filled ? TOK.copper : TOK.hairline}`,
    fontFamily: 'var(--mono)',
    fontSize: 11,
    letterSpacing: '0.02em',
    transition: 'background 200ms, border-color 200ms',
  }
}

// ===== Week strip — 7 dots, copper for done days =====
function WeekStrip({ done }: { done: boolean[] }) {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  return (
    <div style={{ padding: '6px 20px 0' }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: TOK.muted,
          marginBottom: 10,
        }}
      >
        This week
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {labels.map((d, i) => {
          const isDone = !!done[i]
          const isToday = i === todayIdx
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                flex: 1,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  color: TOK.muted,
                  letterSpacing: '0.1em',
                }}
              >
                {d}
              </div>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: isDone ? TOK.copper : isToday ? 'rgba(245,240,234,0.24)' : 'rgba(245,240,234,0.08)',
                  boxShadow: isToday && !isDone ? '0 0 0 2px rgba(245,240,234,0.06)' : 'none',
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ===== Progress ring =====
function Ring({
  size = 90,
  stroke = 5,
  pct,
  color,
  trackColor = 'rgba(245,240,234,0.06)',
}: {
  size?: number
  stroke?: number
  pct: number
  color: string
  trackColor?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, pct))}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(.2,.8,.2,1)' }}
      />
    </svg>
  )
}

// ===== Quick start tile =====
function QuickStartTile({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '14px 8px',
        background: TOK.card,
        border: `1px solid ${TOK.hairline}`,
        borderRadius: 14,
        textDecoration: 'none',
        color: TOK.fg,
        height: 88,
      }}
    >
      <div style={{ color: TOK.copper }}>{icon}</div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: TOK.fg,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </Link>
  )
}

// ===== Page =====
export default function HomePage() {
  const { user, refreshUser } = useAuth()
  const [weeklyCount, setWeeklyCount] = useState(0)
  const [monthlyCount, setMonthlyCount] = useState(0)
  const [weekDone, setWeekDone] = useState<boolean[]>([false, false, false, false, false, false, false])
  const [recentWorkouts, setRecentWorkouts] = useState<Array<{ id: string; type: string; logged_at: string; points_earned?: number }>>([])
  const [totalSessions, setTotalSessions] = useState(0)
  const [freezing, setFreezing] = useState(false)
  const [freezeError, setFreezeError] = useState<string | null>(null)
  const [freezeSuccess, setFreezeSuccess] = useState(false)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const now = new Date()
    const weekStart = new Date(now)
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
    weekStart.setDate(now.getDate() - dayOfWeek)
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Weekly count + per-day map
    supabase
      .from('workouts')
      .select('id, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', weekStart.toISOString())
      .then(({ data }) => {
        const rows = data || []
        setWeeklyCount(rows.length)
        const done = [false, false, false, false, false, false, false]
        rows.forEach((r: any) => {
          const d = new Date(r.logged_at)
          const idx = d.getDay() === 0 ? 6 : d.getDay() - 1
          done[idx] = true
        })
        setWeekDone(done)
      })

    // Monthly count
    supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('logged_at', monthStart.toISOString())
      .then(({ count }) => setMonthlyCount(count || 0))

    // Total sessions all-time
    supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setTotalSessions(count || 0))

    // Recent 3 workouts
    supabase
      .from('workouts')
      .select('id, type, logged_at, points_earned')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) setRecentWorkouts(data as any[])
      })
  }, [user])

  async function handleFreeze() {
    if (!user || freezing) return
    if ((user.points_balance ?? 0) < FREEZE_COST) {
      setFreezeError(`Need ${FREEZE_COST} coins`)
      setTimeout(() => setFreezeError(null), 2200)
      return
    }
    setFreezing(true)
    setFreezeError(null)
    try {
      const resp = await fetch('/api/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      })
      if (resp.ok) {
        await refreshUser()
        setFreezeSuccess(true)
        setTimeout(() => setFreezeSuccess(false), 2500)
      } else {
        const body = await resp.json().catch(() => ({}))
        setFreezeError(body.error ?? 'Freeze failed')
        setTimeout(() => setFreezeError(null), 2500)
      }
    } catch {
      setFreezeError('Network error')
      setTimeout(() => setFreezeError(null), 2500)
    }
    setFreezing(false)
  }

  const coins = user?.points_balance ?? 0
  const streakDays = (user as any)?.current_streak ?? 0
  const longestStreak = (user as any)?.longest_streak ?? streakDays
  const multiplier = streakDays >= 30 ? 1.5 : streakDays >= 14 ? 1.3 : streakDays >= 7 ? 1.2 : streakDays >= 3 ? 1.1 : 1.0
  const weeklyPct = Math.min(1, weeklyCount / WEEKLY_GOAL)
  const monthlyPct = Math.min(1, monthlyCount / MONTHLY_GOAL)
  const isFrozen = (user as any)?.streak_frozen_until
    ? new Date((user as any).streak_frozen_until) > new Date()
    : false

  return (
    <div
      style={{
        background: TOK.bg,
        minHeight: '100dvh',
        color: TOK.fg,
        fontFamily: 'var(--sans)',
      }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
        :root {
          --sans: 'Geist', system-ui, -apple-system, sans-serif;
          --mono: 'Geist Mono', ui-monospace, monospace;
          --serif: 'Instrument Serif', Georgia, serif;
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

      {/* Greeting */}
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
          {(() => {
            const h = new Date().getHours()
            if (h < 12) return 'Good morning'
            if (h < 18) return 'Good afternoon'
            return 'Good evening'
          })()}
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
          {user?.name ?? 'Athlete'}
        </div>
      </div>

      {/* Hero w/ COUNT coins */}
      <Hero
        coins={coins}
        streakDays={streakDays}
        multiplier={multiplier}
        weeklyDone={weeklyCount}
        weeklyGoal={WEEKLY_GOAL}
      />

      {/* Today's pick — gradient card linking to log */}
      <div style={{ padding: '20px 16px 0' }}>
        <Link
          href="/log"
          style={{
            display: 'block',
            textDecoration: 'none',
            color: TOK.fg,
            borderRadius: 18,
            overflow: 'hidden',
            position: 'relative',
            background: `linear-gradient(135deg, ${TOK.copper} 0%, ${TOK.bg} 110%)`,
            border: `1px solid ${TOK.hairline}`,
            padding: '18px 20px',
            minHeight: 140,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 10px)',
            }}
          />
          <div style={{ position: 'relative' }}>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'rgba(245,240,234,0.7)',
              }}
            >
              For you · Today
            </div>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 24,
                marginTop: 6,
                letterSpacing: '-0.015em',
                lineHeight: 1.15,
              }}
            >
              Strength &mdash; 50 min
            </div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 12, marginTop: 6, color: 'rgba(245,240,234,0.75)' }}>
              Tap to log a workout. +50–80 coins, multiplied by your streak.
            </div>
            <div
              style={{
                marginTop: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: TOK.fg,
                color: TOK.bg,
                borderRadius: 999,
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Start
            </div>
          </div>
        </Link>
      </div>

      {/* Quick start grid */}
      <div style={{ padding: '14px 16px 0' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: TOK.muted,
            marginBottom: 8,
          }}
        >
          Quick start
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <QuickStartTile
            href="/log?type=strength"
            label="Strength"
            icon={
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 6.5L17.5 17.5M14.5 3.5L20.5 9.5M3.5 14.5L9.5 20.5M9 9L15 15" />
              </svg>
            }
          />
          <QuickStartTile
            href="/log?type=run"
            label="Run"
            icon={
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13" cy="4" r="2" />
                <path d="M4 22l4.5-7 3 1L14 12l3 4 4-1" />
              </svg>
            }
          />
          <QuickStartTile
            href="/log?type=class"
            label="Class"
            icon={
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M10 9l5 3-5 3z" />
              </svg>
            }
          />
          <QuickStartTile
            href="/log?type=checkin"
            label="Check-in"
            icon={
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            }
          />
        </div>
      </div>

      {/* This Week strip */}
      <div style={{ padding: '20px 0 0' }}>
        <WeekStrip done={weekDone} />
      </div>

      {/* Weekly + Monthly progress rings */}
      <div style={{ padding: '20px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Weekly */}
        <div
          style={{
            background: TOK.card,
            border: `1px solid ${TOK.hairline}`,
            borderRadius: 16,
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
            <Ring size={72} stroke={5} pct={weeklyPct} color={TOK.copper} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--serif)',
                fontSize: 22,
                color: TOK.fg,
                fontFeatureSettings: '"tnum"',
              }}
            >
              {weeklyCount}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: TOK.muted }}>
              Weekly
            </div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: TOK.fg, fontWeight: 500, marginTop: 2 }}>
              {weeklyCount} / {WEEKLY_GOAL} sessions
            </div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: TOK.muted, marginTop: 2 }}>
              {Math.max(0, WEEKLY_GOAL - weeklyCount)} to go
            </div>
          </div>
        </div>

        {/* Monthly */}
        <div
          style={{
            background: TOK.card,
            border: `1px solid ${TOK.hairline}`,
            borderRadius: 16,
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
            <Ring size={72} stroke={5} pct={monthlyPct} color={TOK.copper2} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--serif)',
                fontSize: 22,
                color: TOK.fg,
                fontFeatureSettings: '"tnum"',
              }}
            >
              {monthlyCount}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: TOK.muted }}>
              {new Date().toLocaleString('en-US', { month: 'long' })}
            </div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: TOK.fg, fontWeight: 500, marginTop: 2 }}>
              {monthlyCount} / {MONTHLY_GOAL} sessions
            </div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: TOK.muted, marginTop: 2 }}>
              {Math.max(0, MONTHLY_GOAL - monthlyCount)} to go
            </div>
          </div>
        </div>
      </div>

      {/* Freeze button */}
      <div style={{ padding: '14px 16px 0' }}>
        <button
          onClick={handleFreeze}
          disabled={freezing || isFrozen}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            background: isFrozen ? 'rgba(58,138,193,0.10)' : TOK.card,
            border: `1px solid ${isFrozen ? 'rgba(58,138,193,0.35)' : TOK.hairline}`,
            borderRadius: 14,
            color: TOK.fg,
            cursor: freezing || isFrozen ? 'default' : 'pointer',
            opacity: freezing ? 0.6 : 1,
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(58,138,193,0.12)',
              border: '1px solid rgba(58,138,193,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#7BB6E5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 14, color: TOK.fg, fontWeight: 600 }}>
              {isFrozen ? 'Streak Frozen' : 'Freeze your streak'}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: TOK.muted, letterSpacing: '0.06em', marginTop: 2 }}>
              {isFrozen
                ? 'Active — you can skip a day without losing your streak'
                : freezeError
                  ? freezeError
                  : freezeSuccess
                    ? 'Frozen!'
                    : `Costs ${FREEZE_COST} coins · protects you for 24h`}
            </div>
          </div>
          {!isFrozen && (
            <div
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                background: TOK.copper,
                color: '#fff',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              {freezing ? '...' : 'Freeze'}
            </div>
          )}
        </button>
      </div>

      {/* Featured peek — link to /rewards */}
      <div style={{ padding: '20px 16px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: TOK.muted }}>
              Saving toward
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: TOK.fg, letterSpacing: '-0.015em', marginTop: 3, lineHeight: 1.1 }}>
              Your rewards
            </div>
          </div>
          <Link
            href="/rewards"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: TOK.copper,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            View all →
          </Link>
        </div>
        <Link
          href="/rewards"
          style={{
            display: 'block',
            textDecoration: 'none',
            color: TOK.fg,
            background: TOK.card,
            border: `1px solid ${TOK.hairline}`,
            borderRadius: 14,
            padding: '16px',
          }}
        >
          <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: TOK.fg, fontWeight: 500 }}>
            {coins.toLocaleString()} coins ready to redeem
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: TOK.muted, marginTop: 4, letterSpacing: '0.04em' }}>
            Browse Thorne, NOBULL, Momentous, Kane and more →
          </div>
        </Link>
      </div>

      {/* Recent activity */}
      {recentWorkouts.length > 0 && (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: TOK.muted, marginBottom: 8 }}>
            Recent activity
          </div>
          <div style={{ background: TOK.card, border: `1px solid ${TOK.hairline}`, borderRadius: 14, overflow: 'hidden' }}>
            {recentWorkouts.map((w, i) => (
              <div
                key={w.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderTop: i === 0 ? 'none' : `1px solid ${TOK.hairline}`,
                }}
              >
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
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: TOK.fg, fontWeight: 500, textTransform: 'capitalize' }}>
                    {w.type ?? 'Workout'}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: TOK.muted, letterSpacing: '0.06em', marginTop: 2 }}>
                    {new Date(w.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                {w.points_earned != null && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: TOK.copper, fontWeight: 600 }}>
                    +{w.points_earned}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All-time stats footer */}
      <div style={{ padding: '24px 16px 120px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            background: TOK.card,
            border: `1px solid ${TOK.hairline}`,
            borderRadius: 14,
            padding: '16px',
          }}
        >
          <Stat label="Sessions" value={totalSessions} />
          <Stat label="Best streak" value={longestStreak} suffix="d" />
          <Stat label="Multiplier" value={multiplier.toFixed(1)} suffix="×" valueColor={TOK.copper} />
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  suffix,
  valueColor = TOK.fg,
}: {
  label: string
  value: number | string
  suffix?: string
  valueColor?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 30,
            color: valueColor,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            fontFeatureSettings: '"tnum"',
          }}
        >
          {value}
        </span>
        {suffix && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: TOK.muted, letterSpacing: '0.06em' }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}
