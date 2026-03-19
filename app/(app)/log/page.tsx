'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { calculatePoints, getTier, getTierLabel } from '@/lib/points'
import type { WorkoutType } from '@/lib/types'

const WORKOUT_TYPES: { value: WorkoutType; label: string; emoji: string }[] = [
  { value: 'push', label: 'Push', emoji: '🫸' },
  { value: 'pull', label: 'Pull', emoji: '🫷' },
  { value: 'legs', label: 'Legs', emoji: '🦵' },
  { value: 'upper', label: 'Upper', emoji: '💪' },
  { value: 'lower', label: 'Lower', emoji: '🏋️' },
  { value: 'full_body', label: 'Full Body', emoji: '⚡' },
  { value: 'cardio', label: 'Cardio', emoji: '🏃' },
  { value: 'hiit', label: 'HIIT', emoji: '🔥' },
  { value: 'custom', label: 'Custom', emoji: '✏️' },
]

const DURATIONS = [30, 45, 60, 75, 90]

export default function LogPage() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'type' | 'details' | 'confirm' | 'success'>('type')
  const [workoutType, setWorkoutType] = useState<WorkoutType>('push')
  const [customName, setCustomName] = useState('')
  const [duration, setDuration] = useState(60)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [earnedPoints, setEarnedPoints] = useState(0)

  if (!user) return null

  const tier = getTier(user.lifetime_sessions)
  const { base, multiplier, total, verificationMultiplier } = calculatePoints({
    durationMinutes: duration,
    verified: false, // GPS/photo not yet connected — treated as unverified for preview
    freeUnverifiedRemaining: user.free_unverified_remaining,
    lifetimeSessions: user.lifetime_sessions,
  })
  // For MVP: auto-use GPS verification if browser supports it
  const verifiedPoints = calculatePoints({
    durationMinutes: duration,
    verified: true,
    freeUnverifiedRemaining: user.free_unverified_remaining,
    lifetimeSessions: user.lifetime_sessions,
  })

  async function handleLog() {
    if (!user) return
    setLoading(true)
    setError('')

    // Check: one session per calendar day
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data: todaySession } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', user.id)
      .gte('logged_at', todayStart.toISOString())
      .limit(1)

    if (todaySession && todaySession.length > 0) {
      setError("You've already logged a session today. One per day maximum.")
      setLoading(false)
      return
    }

    // Try GPS verification
    let verified = false
    let verificationMethod: string = 'unverified'
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => { verified = true; verificationMethod = 'gps'; resolve() },
          () => resolve(), // fail silently, just unverified
          { timeout: 5000 }
        )
      })
    } catch {
      // no geolocation
    }

    const pts = calculatePoints({
      durationMinutes: duration,
      verified,
      freeUnverifiedRemaining: user.free_unverified_remaining,
      lifetimeSessions: user.lifetime_sessions,
    })

    // Register GPS as connected device (upsert — only once per user)
    if (verified && verificationMethod === 'gps') {
      await supabase.from('connected_devices').upsert(
        { user_id: user.id, type: 'gps', status: 'active' },
        { onConflict: 'user_id,type', ignoreDuplicates: true }
      )
    }

    // Insert workout
    const { error: workoutError } = await supabase.from('workouts').insert({
      user_id: user.id,
      type: workoutType,
      custom_name: workoutType === 'custom' ? customName : null,
      duration_minutes: duration,
      verification_method: verificationMethod,
      verified,
      base_points: pts.base,
      multiplier_applied: pts.multiplier,
      total_points_earned: pts.total,
    })

    if (workoutError) { setError(workoutError.message); setLoading(false); return }

    // Update user stats
    const newSessions = user.lifetime_sessions + 1
    const newTier = getTier(newSessions)
    const tierMultipliers: Record<string, number> = { bronze: 1.0, silver: 1.5, gold: 2.0, platinum: 3.0 }

    // Update streak
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    const { data: yesterdaySession } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', user.id)
      .gte('logged_at', yesterday.toISOString())
      .lt('logged_at', new Date().setHours(0,0,0,0) > 0 ? new Date(new Date().setHours(0,0,0,0)).toISOString() : new Date().toISOString())
      .limit(1)

    const newStreak = (yesterdaySession && yesterdaySession.length > 0) ? user.current_streak + 1 : 1
    const newLongest = Math.max(user.longest_streak, newStreak)
    const newFreeUnverified = !verified ? Math.max(0, user.free_unverified_remaining - 1) : user.free_unverified_remaining

    await supabase.from('users').update({
      lifetime_sessions: newSessions,
      tier: newTier,
      multiplier: tierMultipliers[newTier],
      points_balance: user.points_balance + pts.total,
      points_lifetime_earned: user.points_lifetime_earned + pts.total,
      current_streak: newStreak,
      longest_streak: newLongest,
      free_unverified_remaining: newFreeUnverified,
    }).eq('id', user.id)

    setEarnedPoints(pts.total)
    await refreshUser()
    setLoading(false)
    setStep('success')
  }

  if (step === 'success') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#FAF8F4' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏆</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, marginBottom: 8, fontFamily: 'Archivo, sans-serif' }}>Session logged!</h2>
          <p style={{ color: '#8A8478', marginBottom: 24 }}>You showed up. That&apos;s what counts.</p>
          <div style={{
            background: '#111110',
            borderRadius: 16,
            padding: '20px 32px',
            marginBottom: 28,
            display: 'inline-block',
          }}>
            <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Points Earned</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 44, fontWeight: 900, color: '#B5593C', lineHeight: 1 }}>
              +{earnedPoints}
            </p>
            <p style={{ color: '#8A8478', fontSize: 12, marginTop: 4 }}>
              {getTierLabel(tier)} tier · {multiplier}x multiplier
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => router.push('/home')} style={{
              flex: 1, padding: 15, background: '#111110', color: '#F5F0EA',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, fontFamily: 'Archivo, sans-serif', cursor: 'pointer',
            }}>Back to Home</button>
            <button onClick={() => router.push('/rewards')} style={{
              flex: 1, padding: 15, background: '#FDF5F1', color: '#B5593C',
              border: '1.5px solid #B5593C', borderRadius: 10, fontSize: 14, fontWeight: 800, fontFamily: 'Archivo, sans-serif', cursor: 'pointer',
            }}>Shop Rewards</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>Log Workout</p>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif' }}>What did you do?</h1>
      </div>

      {step === 'type' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
            {WORKOUT_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setWorkoutType(t.value)}
                style={{
                  padding: '16px 10px',
                  background: workoutType === t.value ? '#111110' : '#fff',
                  border: `1.5px solid ${workoutType === t.value ? '#111110' : '#E0D9CE'}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{t.emoji}</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: workoutType === t.value ? '#F5F0EA' : '#111110',
                  fontFamily: 'Archivo, sans-serif',
                }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
          {workoutType === 'custom' && (
            <input
              placeholder="Session name"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              style={{ ...inputStyle, marginBottom: 16 }}
            />
          )}
          <button onClick={() => setStep('details')} style={btnPrimary}>Next →</button>
        </>
      )}

      {step === 'details' && (
        <>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Duration</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  style={{
                    flex: 1,
                    padding: '14px 0',
                    background: duration === d ? '#B5593C' : '#fff',
                    border: `1.5px solid ${duration === d ? '#B5593C' : '#E0D9CE'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13,
                    fontWeight: 700,
                    color: duration === d ? '#F5F0EA' : '#111110',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
            <p style={{ color: '#8A8478', fontSize: 11, marginTop: 6 }}>minutes</p>
          </div>

          {/* Points preview */}
          <div style={{
            background: '#FDF5F1',
            border: '1.5px solid #E0D9CE',
            borderRadius: 14,
            padding: 16,
            marginBottom: 20,
          }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, color: '#8A8478' }}>Points Preview</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#8A8478' }}>Base ({duration}min)</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700 }}>{verifiedPoints.base} pts</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#8A8478' }}>{getTierLabel(tier)} tier</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700 }}>{multiplier}x</span>
            </div>
            <div style={{ height: 1, background: '#E0D9CE', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>Verified total</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 900, color: '#B5593C' }}>{verifiedPoints.total} pts</span>
            </div>
            {user.free_unverified_remaining > 0 && (
              <p style={{ fontSize: 11, color: '#8A8478', marginTop: 6 }}>
                {user.free_unverified_remaining} free unverified sessions remaining (25% pts)
              </p>
            )}
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('type')} style={btnSecondary}>← Back</button>
            <button onClick={handleLog} disabled={loading} style={{ ...btnPrimary, flex: 2 }}>
              {loading ? 'Logging...' : 'Log Session ✓'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '14px 16px',
  border: '1.5px solid #E0D9CE',
  borderRadius: 10,
  fontSize: 15,
  fontFamily: 'Archivo, sans-serif',
  background: '#fff',
  color: '#111110',
  outline: 'none',
  width: '100%',
}

const btnPrimary: React.CSSProperties = {
  flex: 1,
  width: '100%',
  padding: 15,
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
  flex: 1,
  padding: 15,
  background: '#fff',
  color: '#111110',
  border: '1.5px solid #E0D9CE',
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 800,
  fontFamily: 'Archivo, sans-serif',
  cursor: 'pointer',
}
