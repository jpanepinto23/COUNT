'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import type { Workout } from '@/lib/types'

const TIER_COLORS: Record<string, string> = {
  bronze: '#B5593C', silver: '#6B7280', gold: '#D97706', platinum: '#7C3AED',
}

const WORKOUT_LABELS: Record<string, string> = {
  push: 'Push', pull: 'Pull', legs: 'Legs', upper: 'Upper',
  lower: 'Lower', full_body: 'Full Body', cardio: 'Cardio', hiit: 'HIIT', custom: 'Custom',
}

export default function HistoryPage() {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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

  // Calendar for current month
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

  // Monthly stats
  const monthStart = new Date(year, month, 1)
  const monthWorkouts = workouts.filter(w => new Date(w.logged_at) >= monthStart)
  const monthSessions = monthWorkouts.length
  const monthPoints = monthWorkouts.reduce((sum, w) => sum + (w.total_points_earned ?? 0), 0)
  const monthVerified = monthWorkouts.filter(w => w.verified).length

  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  // Group workouts by date
  const grouped: Record<string, Workout[]> = {}
  workouts.forEach(w => {
    const key = new Date(w.logged_at).toDateString()
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(w)
  })
  const groupedEntries = Object.entries(grouped)

  // Workout type breakdown
  const typeBreakdown: Record<string, number> = {}
  workouts.forEach(w => {
    typeBreakdown[w.type] = (typeBreakdown[w.type] ?? 0) + 1
  })
  const topTypes = Object.entries(typeBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 24 }}>
      <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>
        Your Progress
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif', marginBottom: 16 }}>
        History
      </h1>

      {/* Monthly stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <StatCard label="This month" value={monthSessions} unit="sessions" color={tierColor} />
        <StatCard label="Points" value={monthPoints} unit="earned" color={tierColor} />
        <StatCard label="Verified" value={monthVerified} unit={`of ${monthSessions}`} color="#22c55e" />
      </div>

      {/* Calendar heatmap */}
      <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
          {monthName}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#C4BFBA' }}>{d}</div>
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
                background: hit ? tierColor : '#F5F0EA',
                border: isToday ? `2px solid ${tierColor}` : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: hit ? 'rgba(255,255,255,0.85)' : '#C4BFBA' }}>
                  {day}
                </span>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: tierColor }} />
            <span style={{ fontSize: 10, color: '#8A8478' }}>Workout</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#F5F0EA', border: '1px solid #E0D9CE' }} />
            <span style={{ fontSize: 10, color: '#8A8478' }}>Rest day</span>
          </div>
        </div>
      </div>

      {/* All-time stats */}
      <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
          All Time
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <BigStat label="Total sessions" value={user.lifetime_sessions} color={tierColor} />
          <BigStat label="Lifetime points" value={user.points_lifetime_earned} color={tierColor} />
          <BigStat label="Best streak" value={user.longest_streak} suffix="days" color={tierColor} />
          <BigStat label="Current streak" value={user.current_streak} suffix="days" color={user.current_streak > 2 ? '#f59e0b' : user.current_streak > 0 ? tierColor : '#C4BFBA'} />
        </div>
      </div>

      {/* Top workout types */}
      {topTypes.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
            Your Go-To Workouts
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topTypes.map(([type, count], i) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#C4BFBA', width: 16, textAlign: 'center', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>
                      {WORKOUT_LABELS[type] || type}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#8A8478' }}>{count} sessions</span>
                  </div>
                  <div style={{ height: 4, background: '#F5F0EA', borderRadius: 99, overflow: 'hidden' }}>
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

      {/* Workout history list */}
      <p style={{ fontSize: 11, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
        Recent Sessions
      </p>
      {loading ? (
        <p style={{ color: '#8A8478', fontSize: 13, textAlign: 'center', padding: 20 }}>Loading...</p>
      ) : workouts.length === 0 ? (
        <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 28, marginBottom: 6 }}>🏋️</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#111110' }}>No workouts yet</p>
          <p style={{ fontSize: 12, color: '#8A8478', marginTop: 4 }}>Log your first session to start building your history</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groupedEntries.map(([dateStr, dayWorkouts]) => (
            <div key={dateStr}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>
                {formatGroupDate(dateStr)}
              </p>
              {dayWorkouts.map(w => (
                <div key={w.id} style={{
                  background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 12,
                  padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
                }}>
                  <div style={{
                    width: 36, height: 36, background: tierColor + '15', borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 900, color: tierColor }}>
                      {workoutAbbr(w.type)}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#111110', marginBottom: 1 }}>
                      {w.custom_name || WORKOUT_LABELS[w.type] || w.type}
                    </p>
                    <p style={{ fontSize: 11, color: '#8A8478' }}>
                      {w.duration_minutes}min
                      <span style={{ color: w.verified ? '#22c55e' : '#f59e0b', marginLeft: 6 }}>
                        {w.verified ? '✓ verified' : '⚠ unverified'}
                      </span>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 900, color: tierColor }}>
                      +{(w.total_points_earned ?? 0).toLocaleString()}
                    </p>
                    <p style={{ fontSize: 10, color: '#C4BFBA' }}>pts</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
      <p style={{ fontSize: 9, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{value.toLocaleString()}</p>
      <p style={{ fontSize: 9, color: '#8A8478', marginTop: 2 }}>{unit}</p>
    </div>
  )
}

function BigStat({ label, value, suffix, color }: { label: string; value: number; suffix?: string; color: string }) {
  return (
    <div style={{ background: '#FAF8F4', borderRadius: 10, padding: '12px 14px' }}>
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
