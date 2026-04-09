'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import type { Workout } from '@/lib/types'

const WORKOUT_EMOJIS: Record<string, string> = {
  push: '🤜', pull: '💪', legs: '🦵', upper: '🏋️',
  lower: '🚴', full_body: '⚡', cardio: '🏃', hiit: '🔥', custom: '✏️',
}

const BG     = '#0E0E0D'
const CARD   = '#111110'
const CARD2  = '#1A1A18'
const BORDER = 'rgba(245,240,234,0.08)'
const TEXT   = '#F5F0EA'
const MUTED  = 'rgba(245,240,234,0.45)'
const STONE  = '#8A8478'

const TIER_COLORS: Record<string, string> = {
  bronze:   '#B5593C',
  silver:   '#6B7280',
  gold:     '#D97706',
  platinum: '#7C3AED',
}

const WORKOUT_LABELS: Record<string, string> = {
  push: 'Push', pull: 'Pull', legs: 'Legs', upper: 'Upper',
  lower: 'Lower', full_body: 'Full Body', cardio: 'Cardio',
  hiit: 'HIIT', custom: 'Custom',
}

export default function HistoryPage() {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [sharingId, setSharingId] = useState<string | null>(null)
  const supabase = createClient()

  const handleShareWorkout = async (w: Workout) => {
    setSharingId(w.id)
    const label = w.custom_name || WORKOUT_LABELS[w.type] || w.type
    const emoji = WORKOUT_EMOJIS[w.type] || '🏋️'
    const pts = w.total_points_earned ?? 0

    await document.fonts.ready

    const SIZE = 1080
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')!

    const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE)
    bg.addColorStop(0, '#1C1B19')
    bg.addColorStop(1, '#0E0D0C')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, SIZE, SIZE)

    ctx.strokeStyle = 'rgba(181,89,60,0.35)'
    ctx.lineWidth = 3
    ctx.strokeRect(44, 44, SIZE - 88, SIZE - 88)

    ctx.fillStyle = '#B5593C'
    ctx.font = '900 78px Archivo, sans-serif'
    ctx.fillText('COUNT', 84, 158)

    ctx.fillStyle = '#2A2A28'
    ctx.font = '500 26px "JetBrains Mono", monospace'
    ctx.fillText('MAKE IT COUNT', 86, 204)

    ctx.strokeStyle = 'rgba(245,240,234,0.07)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(84, 238); ctx.lineTo(SIZE - 84, 238); ctx.stroke()

    ctx.font = '170px serif'
    ctx.fillText(emoji, 76, 474)

    ctx.fillStyle = '#F5F0EA'
    ctx.font = '900 96px Archivo, sans-serif'
    ctx.fillText(label.toUpperCase(), 84, 592)

    ctx.fillStyle = '#444442'
    ctx.font = '500 30px "JetBrains Mono", monospace'
    ctx.fillText('SESSION LOGGED', 84, 642)

    ctx.strokeStyle = 'rgba(245,240,234,0.07)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(84, 678); ctx.lineTo(SIZE - 84, 678); ctx.stroke()

    ctx.fillStyle = 'rgba(181,89,60,0.1)'
    ctx.beginPath()
    ctx.roundRect(84, 706, SIZE - 168, 230, 18)
    ctx.fill()
    ctx.strokeStyle = 'rgba(181,89,60,0.2)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = '#444442'
    ctx.font = '500 27px "JetBrains Mono", monospace'
    ctx.fillText('POINTS EARNED', 114, 754)
    ctx.fillStyle = '#B5593C'
    ctx.font = '900 108px "JetBrains Mono", monospace'
    ctx.fillText(`+${pts}`, 114, 884)

    ctx.fillStyle = '#252523'
    ctx.font = '500 26px "JetBrains Mono", monospace'
    ctx.fillText('countfitness.app', 84, SIZE - 66)

    canvas.toBlob(async (blob) => {
      setSharingId(null)
      if (!blob) return
      const file = new File([blob], 'count-workout.png', { type: 'image/png' })
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `${label} · +${pts} pts` })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'count-workout.png'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      } catch { /* dismissed */ }
    }, 'image/png')
  }

  useEffect(() => {
    if (!user) return
    const since = new Date()
    since.setDate(since.getDate() - 89)
    supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', since.toISOString())
      .order('logged_at', { ascending: false })
      .then(({ data }) => {
        if (data) setWorkouts(data)
        setLoading(false)
      })
  }, [user?.id]) // eslint-disable-line

  if (!user) return null

  const tier = user.tier ?? 'bronze'
  const tierColor = TIER_COLORS[tier]

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()

  const workoutDateSet = new Set(
    workouts.map(w => {
      const d = new Date(w.logged_at)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )
  const hasWorkout = (day: number) => workoutDateSet.has(`${year}-${month}-${day}`)

  const monthStart = new Date(year, month, 1)
  const monthWorkouts = workouts.filter(w => new Date(w.logged_at) >= monthStart)
  const monthSessions = monthWorkouts.length
  const monthPoints = monthWorkouts.reduce((sum, w) => sum + (w.total_points_earned ?? 0), 0)
  const monthVerified = monthWorkouts.filter(w => w.verified).length
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  const grouped: Record<string, Workout[]> = {}
  workouts.forEach(w => {
    const key = new Date(w.logged_at).toDateString()
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(w)
  })
  const groupedEntries = Object.entries(grouped)

  const typeBreakdown: Record<string, number> = {}
  workouts.forEach(w => {
    typeBreakdown[w.type] = (typeBreakdown[w.type] ?? 0) + 1
  })
  const topTypes = Object.entries(typeBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 100, background: BG, minHeight: '100dvh' }}>
      <p style={{ color: STONE, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>
        Your Progress
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif', marginBottom: 16, color: TEXT }}>
        History
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <StatCard label="This month" value={monthSessions} unit="sessions" color={tierColor} />
        <StatCard label="Points" value={monthPoints} unit="earned" color={tierColor} />
        <StatCard label="Verified" value={monthVerified} unit={`of ${monthSessions}`} color="#22c55e" />
      </div>

      <div style={{ background: CARD, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: STONE, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
          All Time
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <BigStat label="Total sessions" value={user.lifetime_sessions} color={tierColor} />
          <BigStat label="Lifetime points" value={user.points_lifetime_earned} color={tierColor} />
          <BigStat label="Best streak" value={user.longest_streak} suffix="days" color={tierColor} />
          <BigStat label="Current streak" value={user.current_streak} suffix="days"
            color={user.current_streak > 2 ? '#f59e0b' : user.current_streak > 0 ? tierColor : MUTED} />
        </div>
      </div>

      {topTypes.length > 0 && (
        <div style={{ background: CARD, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: STONE, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
            Your Go-To Workouts
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topTypes.map(([type, count], i) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: MUTED, width: 16, textAlign: 'center', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
                      {WORKOUT_LABELS[type] || type}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: STONE }}>{count} sessions</span>
                  </div>
                  <div style={{ height: 4, background: BORDER, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(count / topTypes[0][1]) * 100}%`,
                      background: i === 0 ? tierColor : i === 1 ? tierColor + 'AA' : tierColor + '55',
                      borderRadius: 99,
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, fontWeight: 800, color: STONE, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
        Recent Sessions
      </p>
      {loading ? (
        <p style={{ color: STONE, fontSize: 13, textAlign: 'center', padding: 20 }}>Loading...</p>
      ) : workouts.length === 0 ? (
        <div style={{ background: CARD, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 28, marginBottom: 6 }}>🏋️</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>No workouts yet</p>
          <p style={{ fontSize: 12, color: STONE, marginTop: 4 }}>Log your first session to start building your history</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groupedEntries.map(([dateStr, dayWorkouts]) => (
            <div key={dateStr}>
              <p style={{ fontSize: 11, fontWeight: 700, color: STONE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>
                {formatGroupDate(dateStr)}
              </p>
              {dayWorkouts.map(w => (
                <div key={w.id} style={{
                  background: CARD,
                  border: `1.5px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  marginBottom: 6,
                }}>
                  <div style={{
                    width: 36, height: 36,
                    background: tierColor + '15',
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 900, color: tierColor }}>
                      {workoutAbbr(w.type)}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: TEXT, marginBottom: 1 }}>
                      {w.custom_name || WORKOUT_LABELS[w.type] || w.type}
                    </p>
                    <p style={{ fontSize: 11, color: STONE }}>
                      {w.duration_minutes}min{' '}
                      <span style={{ color: w.verified ? '#22c55e' : '#f59e0b', marginLeft: 6 }}>
                        {w.verified ? 'verified' : 'unverified'}
                      </span>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 900, color: tierColor }}>
                      +{(w.total_points_earned ?? 0).toLocaleString()}
                    </p>
                    <p style={{ fontSize: 10, color: MUTED }}>pts</p>
                  </div>
                  <button
                    onClick={() => handleShareWorkout(w)}
                    disabled={sharingId === w.id}
                    title="Share workout"
                    style={{
                      background: 'none', border: 'none', cursor: sharingId === w.id ? 'wait' : 'pointer',
                      padding: '4px 2px', fontSize: 18, lineHeight: 1,
                      opacity: sharingId === w.id ? 0.35 : 0.65,
                      flexShrink: 0,
                    }}
                  >
                    📸
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div style={{ background: CARD, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px', marginTop: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: STONE, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
          {monthName}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: MUTED }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const hit = hasWorkout(day)
            const isToday = day === now.getDate()
            return (
              <div key={day} style={{
                aspectRatio: '1',
                borderRadius: 4,
                background: hit ? tierColor : 'rgba(245,240,234,0.05)',
                border: isToday ? `2px solid ${tierColor}` : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: hit ? 'rgba(255,255,255,0.85)' : MUTED }}>
                  {day}
                </span>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: tierColor }} />
            <span style={{ fontSize: 10, color: STONE }}>Workout</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(245,240,234,0.05)', border: `1px solid ${BORDER}` }} />
            <span style={{ fontSize: 10, color: STONE }}>Rest day</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
      <p style={{ fontSize: 9, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{value.toLocaleString()}</p>
      <p style={{ fontSize: 9, color: '#8A8478', marginTop: 2 }}>{unit}</p>
    </div>
  )
}

function BigStat({ label, value, suffix, color }: { label: string; value: number; suffix?: string; color: string }) {
  return (
    <div style={{ background: '#1A1A18', borderRadius: 10, padding: '12px 14px' }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>
        {value.toLocaleString()}
        {suffix && <span style={{ fontSize: 12, marginLeft: 4, color: '#8A8478' }}>{suffix}</span>}
      </p>
    </div>
  )
}

function workoutAbbr(type: string) {
  const map: Record<string, string> = {
    push: 'PSH', pull: 'PUL', legs: 'LEG', upper: 'UPR',
    lower: 'LWR', full_body: 'FBD', cardio: 'CDO', hiit: 'HIT', custom: 'CST',
  }
  return map[type] ?? type.slice(0, 3).toUpperCase()
}

function formatGroupDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}
