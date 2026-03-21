'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { calculatePoints, getTier, getTierLabel } from '@/lib/points'
import type { WorkoutType } from '@/lib/types'

const WORKOUT_TYPES: { value: WorkoutType; label: string; photo: string }[] = [
  { value: 'push',      label: 'Push',      photo: '4488764' },
  { value: 'pull',      label: 'Pull',      photo: '6922157' },
  { value: 'legs',      label: 'Legs',      photo: '583722' },
  { value: 'upper',     label: 'Upper',     photo: '3916766' },
  { value: 'lower',     label: 'Lower',     photo: '4944435' },
  { value: 'full_body', label: 'Full Body', photo: '6628962' },
  { value: 'cardio',    label: 'Cardio',    photo: '5327545' },
  { value: 'hiit',      label: 'HIIT',      photo: '2261481' },
  { value: 'custom',    label: 'Custom',    photo: '3999606' },
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
  const [verificationSource, setVerificationSource] = useState<string | null>(null)

  if (!user) return null

  const tier = getTier(user.lifetime_sessions)
  const { base, multiplier, total, verificationMultiplier } = calculatePoints({
    durationMinutes: duration,
    verified: false,
    freeUnverifiedRemaining: user.free_unverified_remaining,
    lifetimeSessions: user.lifetime_sessions,
  })
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

    let verified = false
    let verificationMethod: string = 'unverified'
    let heartRateAvg: number | null = null
    let calories: number | null = null

    const { data: terraActivity } = await supabase
      .from('terra_activities')
      .select('provider, heart_rate_avg, calories, duration_seconds, start_time')
      .eq('user_id', user.id)
      .gte('start_time', todayStart.toISOString())
      .order('start_time', { ascending: false })
      .limit(1)

    if (terraActivity && terraActivity.length > 0) {
      verified = true
      const provider = terraActivity[0].provider?.toUpperCase()
      verificationMethod =
        provider === 'APPLE'   ? 'apple_health' :
        provider === 'GARMIN'  ? 'garmin'       :
        provider === 'FITBIT'  ? 'fitbit'        :
        provider === 'GOOGLE'  ? 'google_fit'    :
        provider?.toLowerCase() ?? 'unverified'
      heartRateAvg = terraActivity[0].heart_rate_avg
      calories     = terraActivity[0].calories
    }

    if (!verified) {
      try {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => { verified = true; verificationMethod = 'gps'; resolve() },
            () => resolve(),
            { timeout: 5000 }
          )
        })
      } catch {
        // no geolocation
      }
    }

    if (verified && verificationMethod === 'gps') {
      await supabase.from('connected_devices').upsert(
        { user_id: user.id, type: 'gps', status: 'active' },
        { onConflict: 'user_id,type', ignoreDuplicates: true }
      )
    }

    const pts = calculatePoints({
      durationMinutes: duration,
      verified,
      freeUnverifiedRemaining: user.free_unverified_remaining,
      lifetimeSessions: user.lifetime_sessions,
    })

    const { error: workoutError } = await supabase.from('workouts').insert({
      user_id:              user.id,
      type:                 workoutType,
      custom_name:          workoutType === 'custom' ? customName : null,
      duration_minutes:     duration,
      verification_method:  verificationMethod,
      verified,
      heart_rate_avg:       heartRateAvg,
      calories,
      base_points:          pts.base,
      multiplier_applied:   pts.multiplier,
      total_points_earned:  pts.total,
    })

    if (workoutError) { setError(workoutError.message); setLoading(false); return }

    const newSessions = user.lifetime_sessions + 1
    const newTier = getTier(newSessions)
    const tierMultipliers: Record<string, number> = { bronze: 1.0, silver: 1.5, gold: 2.0, platinum: 3.0 }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    const { data: yesterdaySession } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', user.id)
      .gte('logged_at', yesterday.toISOString())
      .lt('logged_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
      .limit(1)

    const newStreak  = (yesterdaySession && yesterdaySession.length > 0) ? user.current_streak + 1 : 1
    const newLongest = Math.max(user.longest_streak, newStreak)
    const newFreeUnverified = !verified
      ? Math.max(0, user.free_unverified_remaining - 1)
      : user.free_unverified_remaining

    await supabase.from('users').update({
      lifetime_sessions:      newSessions,
      tier:                   newTier,
      multiplier:             tierMultipliers[newTier],
      points_balance:         user.points_balance + pts.total,
      points_lifetime_earned: user.points_lifetime_earned + pts.total,
      current_streak:         newStreak,
      longest_streak:         newLongest,
      free_unverified_remaining: newFreeUnverified,
    }).eq('id', user.id)

    // ── Referral bonus: award 500 pts to referrer on first workout ──
    if (user.lifetime_sessions === 0 && user.referred_by && !user.referral_bonus_claimed) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id, points_balance, points_lifetime_earned')
        .eq('id', user.referred_by)
        .single()
      if (referrer) {
        await supabase.from('users').update({
          points_balance:         referrer.points_balance + 500,
          points_lifetime_earned: referrer.points_lifetime_earned + 500,
        }).eq('id', referrer.id)
        await supabase.from('users').update({
          referral_bonus_claimed: true,
        }).eq('id', user.id)
        await supabase.from('referrals')
          .update({ bonus_awarded: true, bonus_awarded_at: new Date().toISOString() })
          .eq('referred_id', user.id)
      }
    }

    setEarnedPoints(pts.total)
    setVerificationSource(verified ? verificationMethod : null)
    await refreshUser()
    setLoading(false)
    setStep('success')
  }

  const VERIFICATION_LABELS: Record<string, string> = {
    apple_health: '🍎 Apple Health',
    garmin:       '⌚ Garmin',
    fitbit:       '💚 Fitbit',
    google_fit:   '🏃 Google Fit',
    gps:          '📍 GPS',
  }

  if (step === 'success') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#FAF8F4' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏆</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, marginBottom: 8, fontFamily: 'Archivo, sans-serif' }}>Session logged!</h2>
          <p style={{ color: '#8A8478', marginBottom: 24 }}>You showed up. That&apos;s what counts.</p>
          <div style={{ background: '#111110', borderRadius: 16, padding: '20px 32px', marginBottom: verificationSource ? 12 : 28, display: 'inline-block' }}>
            <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Points Earned</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 44, fontWeight: 900, color: '#B5593C', lineHeight: 1 }}>
              +{earnedPoints}
            </p>
            <p style={{ color: '#8A8478', fontSize: 12, marginTop: 4 }}>
              {getTierLabel(tier)} tier · {multiplier}x multiplier
            </p>
          </div>
          {verificationSource && (
            <div style={{ background: '#F0FDF4', border: '1px solid #86efac', borderRadius: 10, padding: '8px 16px', marginBottom: 28, fontSize: 12, color: '#166534', fontWeight: 700 }}>
              ✓ Verified via {VERIFICATION_LABELS[verificationSource] ?? verificationSource}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => router.push('/home')} style={{ flex: 1, padding: 15, background: '#111110', color: '#F5F0EA', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, fontFamily: 'Archivo, sans-serif', cursor: 'pointer' }}>Back to Home</button>
            <button onClick={() => router.push('/rewards')} style={{ flex: 1, padding: 15, background: '#FDF5F1', color: '#B5593C', border: '1.5px solid #B5593C', borderRadius: 10, fontSize: 14, fontWeight: 800, fontFamily: 'Archivo, sans-serif', cursor: 'pointer' }}>Shop Rewards</button>
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
                  position: 'relative',
                  height: 90,
                  backgroundImage: `url(https://images.pexels.com/photos/${t.photo}/pexels-photo-${t.photo}.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: workoutType === t.value ? '2.5px solid #B5593C' : '2px solid transparent',
                  borderRadius: 12,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  padding: 0,
                  outline: 'none',
                }}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: workoutType === t.value
                    ? 'linear-gradient(to top, rgba(181,89,60,0.50) 0%, rgba(0,0,0,0.30) 50%, rgba(0,0,0,0.15) 100%)'
                    : 'linear-gradient(to top, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0.08) 100%)',
                  borderRadius: 10,
                  transition: 'background 0.15s',
                }} />
                <span style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 900,
                  color: '#FFFFFF',
                  fontFamily: 'Archivo, sans-serif',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
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

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', marginTop: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94A3B8', marginBottom: 10 }}>How it works</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span>🏆</span>
                <span style={{ fontSize: 12, color: '#334155' }}><strong>Earn points every session</strong> — each workout adds to your score and moves you up the leaderboard.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span>📍</span>
                <span style={{ fontSize: 12, color: '#334155' }}><strong>Verify with GPS or a wearable</strong> (Apple Health, Garmin, Fitbit, Google Fit) to earn <strong>100% of your points</strong>.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span>✅</span>
                <span style={{ fontSize: 12, color: '#334155' }}><strong>Unverified sessions still count</strong> — you earn fewer points, but every workout matters.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span>⚖️</span>
                <span style={{ fontSize: 12, color: '#334155' }}><strong>Why verify?</strong> It keeps the leaderboard fair and honest for everyone competing.</span>
              </div>
            </div>
          </div>
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

          <div style={{ background: '#FDF5F1', border: '1.5px solid #E0D9CE', borderRadius: 14, padding: 16, marginBottom: 20 }}>
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

          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', marginBottom: 8 }}>🔒 Verify your workout for full points</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#0C4A6E' }}>
                <span>📍</span><span><strong>GPS</strong> — allow location access when prompted</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#0C4A6E' }}>
                <span>⌚</span><span><strong>Wearable</strong> — Apple Health, Garmin, Fitbit, or Google Fit</span>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#0369A1', marginTop: 8, marginBottom: 0 }}>Verified sessions earn <strong>100% of your points</strong>. Unverified sessions still count for less.</p>
          </div>

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
