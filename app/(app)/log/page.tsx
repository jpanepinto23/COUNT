'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { calculatePoints, getTier, getTierLabel, getReferralPoints } from '@/lib/points'
import type { WorkoutType, Tier } from '@/lib/types'

const WORKOUT_TYPES: { value: WorkoutType; label: string; photo: string; emoji: string }[] = [
  { value: 'push',      label: 'Push',      photo: '4488764', emoji: '🤜' },
  { value: 'pull',      label: 'Pull',      photo: '6922157', emoji: '💪' },
  { value: 'legs',      label: 'Legs',      photo: '8846443',  emoji: '🦵' },
  { value: 'upper',     label: 'Upper',     photo: '3916766', emoji: '🏋️' },
  { value: 'lower',     label: 'Lower',     photo: '4944435', emoji: '🚴' },
  { value: 'full_body', label: 'Full Body', photo: '6628962', emoji: '⚡' },
  { value: 'cardio',    label: 'Cardio',    photo: '5327545', emoji: '🏃' },
  { value: 'hiit',      label: 'HIIT',      photo: '2261481', emoji: '🔥' },
  { value: 'custom',    label: 'Custom',    photo: '3999606', emoji: '✏️' },
]

const DURATIONS = [30, 45, 60, 75, 90]

const MILESTONES: Record<number, { emoji: string; title: string; message: string }> = {
  1:   { emoji: '🌱', title: 'First session!',     message: "Every legend starts somewhere. You just took your first step." },
  5:   { emoji: '🔥', title: '5 sessions strong!', message: "You're building a habit. Keep showing up." },
  10:  { emoji: '💪', title: '10 sessions down!',  message: "Double digits. You're officially consistent." },
  25:  { emoji: '🏅', title: '25 sessions!',        message: "A quarter century of workouts. You're in the top tier of commitment." },
  50:  { emoji: '⚡', title: '50 sessions!',         message: "Fifty sessions. Most people quit at 5. You didn't." },
  100: { emoji: '🏆', title: '100 sessions!',       message: "One hundred. You are a COUNT legend. Truly elite." },
}

export default function LogPage() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'type' | 'details' | 'confirm' | 'success'>('type')
  const [workoutType, setWorkoutType] = useState<WorkoutType>('push')
  const [customName, setCustomName] = useState('')
  const [duration, setDuration] = useState(60)
  const [effortRating, setEffortRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [earnedPoints, setEarnedPoints] = useState(0)
  const [verificationSource, setVerificationSource] = useState<string | null>(null)
  const [newSessionCount, setNewSessionCount] = useState(0)
  const [sharedStreak, setSharedStreak] = useState(0)
  const [shareCopied, setShareCopied] = useState(false)

  if (!user) return null

  const tier = getTier(user.lifetime_sessions)
  const { base, multiplier, total, verificationMultiplier, streakMultiplier } = calculatePoints({
    verified: false,
    lifetimeSessions: user.lifetime_sessions,
    currentStreak: user.current_streak,
  })
  const verifiedPoints = calculatePoints({
    verified: true,
    lifetimeSessions: user.lifetime_sessions,
    currentStreak: user.current_streak,
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
        provider === 'APPLE'  ? 'apple_health' :
        provider === 'GARMIN' ? 'garmin' :
        provider === 'FITBIT' ? 'fitbit' :
        provider === 'GOOGLE' ? 'google_fit' :
        provider?.toLowerCase() ?? 'unverified'
      heartRateAvg = terraActivity[0].heart_rate_avg
      calories     = terraActivity[0].calories
    }

    if (!verified) {
      const { data: stravaConn } = await supabase
        .from('strava_connections')
        .select('access_token, token_expires_at')
        .eq('user_id', user.id)
        .single()

      if (stravaConn && new Date(stravaConn.token_expires_at) > new Date()) {
        try {
          const _today  = new Date()
          const _after  = Math.floor(new Date(_today.getFullYear(), _today.getMonth(), _today.getDate()).getTime() / 1000)
          const _stravaRes = await fetch(
            `https://www.strava.com/api/v3/athlete/activities?after=${_after}&before=${_after + 86400}&per_page=1`,
            { headers: { Authorization: `Bearer ${stravaConn.access_token}` } }
          )
          if (_stravaRes.ok) {
            const _acts = await _stravaRes.json()
            if (Array.isArray(_acts) && _acts.length > 0) {
              verified = true
              verificationMethod = 'strava'
            }
          }
        } catch { /* strava check is best-effort */ }
      }
    }

    const pts = calculatePoints({
      durationMinutes: duration,
      verified,
      freeUnverifiedRemaining: user.free_unverified_remaining,
      lifetimeSessions: user.lifetime_sessions,
    })

    const { error: workoutError } = await supabase.from('workouts').insert({
      user_id:             user.id,
      type:                workoutType,
      custom_name:         workoutType === 'custom' ? customName : null,
      duration_minutes:    duration,
      verification_method: verificationMethod,
      verified,
      heart_rate_avg:      heartRateAvg,
      calories,
      base_points:         pts.base,
      multiplier_applied:  pts.multiplier,
      total_points_earned: pts.total,
      effort_rating:       effortRating || null,
      notes:               notes.trim() || null,
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
  
    await supabase.from('users').update({
      lifetime_sessions:         newSessions,
      tier:                      newTier,
      multiplier:                tierMultipliers[newTier],
      points_balance:            user.points_balance + pts.total,
      points_lifetime_earned:    user.points_lifetime_earned + pts.total,
      current_streak:            newStreak,
      longest_streak:            newLongest,
      }).eq('id', user.id)

    if (user.lifetime_sessions === 0 && user.referred_by && !user.referral_bonus_claimed) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id, points_balance, points_lifetime_earned, tier')
        .eq('id', user.referred_by)
        .single()
      if (referrer) {
        await supabase.from('users').update({
          points_balance:         referrer.points_balance + getReferralPoints(referrer.tier as Tier),
          points_lifetime_earned: referrer.points_lifetime_earned + getReferralPoints(referrer.tier as Tier),
        }).eq('id', referrer.id)
        await supabase.from('users').update({ referral_bonus_claimed: true }).eq('id', user.id)
        await supabase.from('referrals')
          .update({ bonus_awarded: true, bonus_awarded_at: new Date().toISOString() })
          .eq('referred_id', user.id)
      }
    }

    setEarnedPoints(pts.total)
    setNewSessionCount(newSessions)
    setSharedStreak(newStreak)
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
    gps_denied:   '⚠️ GPS Blocked',
    strava:       '🏊 Strava',
  }

  const handleShare = async () => {
    const wt = WORKOUT_TYPES.find(t => t.value === workoutType)!
    await document.fonts.ready

    const SIZE = 1080
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')!

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE)
    bg.addColorStop(0, '#1C1B19')
    bg.addColorStop(1, '#0E0D0C')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, SIZE, SIZE)

    // Border
    ctx.strokeStyle = 'rgba(181,89,60,0.35)'
    ctx.lineWidth = 3
    ctx.strokeRect(44, 44, SIZE - 88, SIZE - 88)

    // COUNT wordmark
    ctx.fillStyle = '#B5593C'
    ctx.font = '900 78px Archivo, sans-serif'
    ctx.fillText('COUNT', 84, 158)

    // Tagline
    ctx.fillStyle = '#2A2A28'
    ctx.font = '500 26px "JetBrains Mono", monospace'
    ctx.fillText('MAKE IT COUNT', 86, 204)

    // Divider
    ctx.strokeStyle = 'rgba(245,240,234,0.07)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(84, 238); ctx.lineTo(SIZE - 84, 238); ctx.stroke()

    // Emoji
    ctx.font = '170px serif'
    ctx.fillText(wt.emoji, 76, 474)

    // Workout name
    ctx.fillStyle = '#F5F0EA'
    ctx.font = '900 96px Archivo, sans-serif'
    ctx.fillText(wt.label.toUpperCase(), 84, 592)

    // Session label
    ctx.fillStyle = '#444442'
    ctx.font = '500 30px "JetBrains Mono", monospace'
    ctx.fillText('SESSION LOGGED', 84, 642)

    // Divider
    ctx.strokeStyle = 'rgba(245,240,234,0.07)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(84, 678); ctx.lineTo(SIZE - 84, 678); ctx.stroke()

    // Points box
    ctx.fillStyle = 'rgba(181,89,60,0.1)'
    ctx.beginPath()
    ctx.roundRect(84, 706, 460, 230, 18)
    ctx.fill()
    ctx.strokeStyle = 'rgba(181,89,60,0.2)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = '#444442'
    ctx.font = '500 27px "JetBrains Mono", monospace'
    ctx.fillText('POINTS EARNED', 114, 754)
    ctx.fillStyle = '#B5593C'
    ctx.font = '900 108px "JetBrains Mono", monospace'
    ctx.fillText(`+${earnedPoints}`, 114, 884)

    // Streak box
    if (sharedStreak > 0) {
      ctx.fillStyle = '#1A1A18'
      ctx.beginPath()
      ctx.roundRect(564, 706, 432, 230, 18)
      ctx.fill()
      ctx.strokeStyle = 'rgba(245,240,234,0.07)'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = '#444442'
      ctx.font = '500 27px "JetBrains Mono", monospace'
      ctx.fillText('STREAK', 594, 754)
      ctx.fillStyle = '#F5F0EA'
      ctx.font = '900 90px "JetBrains Mono", monospace'
      ctx.fillText(`${sharedStreak}`, 594, 876)
      ctx.font = '500 68px serif'
      ctx.fillText('ð¥', 594 + ctx.measureText(`${sharedStreak}`).width + 10, 876)
    }

    // URL
    ctx.fillStyle = '#252523'
    ctx.font = '500 26px "JetBrains Mono", monospace'
    ctx.fillText('countfitness.app', 84, SIZE - 66)

    // Generate PNG and share
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'count-workout.png', { type: 'image/png' })
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `${wt.label} Â· +${earnedPoints} pts` })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'count-workout.png'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          setShareCopied(true)
          setTimeout(() => setShareCopied(false), 2500)
        }
      } catch { /* dismissed */ }
    }, 'image/png')
  }
  if (step === 'success') {
    const milestone = MILESTONES[newSessionCount]
    const wt = WORKOUT_TYPES.find(t => t.value === workoutType)!
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0E0E0D' }}>
        <div style={{ textAlign: 'center', width: '100%', maxWidth: 360 }}>
          {milestone && (
            <div style={{ background: 'linear-gradient(135deg, #B5593C 0%, #D97706 100%)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.15, lineHeight: 1 }}>{milestone.emoji}</div>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>Milestone Unlocked</p>
              <p style={{ fontSize: 32, marginBottom: 6 }}>{milestone.emoji}</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: 'Archivo, sans-serif', marginBottom: 6 }}>{milestone.title}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>{milestone.message}</p>
            </div>
          )}
          <div style={{ fontSize: milestone ? 40 : 56, marginBottom: 12 }}>🏆</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, marginBottom: 8, fontFamily: 'Archivo, sans-serif' }}>Session logged!</h2>
          <p style={{ color: 'rgba(245,240,234,0.5)', marginBottom: 20 }}>You showed up. That&apos;s what counts.</p>
          <div style={{ background: '#111110', borderRadius: 16, padding: '20px 32px', marginBottom: verificationSource ? 12 : 24, display: 'inline-block', width: '100%' }}>
            <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Points Earned</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 44, fontWeight: 900, color: '#B5593C', lineHeight: 1 }}>+{earnedPoints}</p>
            <p style={{ color: '#8A8478', fontSize: 12, marginTop: 4 }}>{getTierLabel(tier)} tier &middot; {multiplier}x multiplier</p>
          </div>
          {verificationSource && (
            <div style={{ background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '8px 16px', marginBottom: 20, fontSize: 12, color: '#4ade80', fontWeight: 700 }}>
              ✓ Verified via {VERIFICATION_LABELS[verificationSource] ?? verificationSource}
            </div>
          )}
          {/* Share card */}
          <div style={{ background: 'linear-gradient(145deg, #1C1B19 0%, #141413 100%)', border: '1px solid rgba(181,89,60,0.25)', borderRadius: 16, padding: '18px 20px', marginBottom: 14, textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -24, right: -24, fontSize: 80, opacity: 0.06, lineHeight: 1, userSelect: 'none' }}>{wt.emoji}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 12, fontWeight: 900, letterSpacing: '0.2em', color: '#B5593C', textTransform: 'uppercase' }}>COUNT</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#333', letterSpacing: 1, textTransform: 'uppercase' }}>make it count</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 26 }}>{wt.emoji}</span>
              <div>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 }}>Session logged</p>
                <p style={{ fontFamily: 'Archivo, sans-serif', fontSize: 18, fontWeight: 900, color: '#F5F0EA', lineHeight: 1 }}>{wt.label}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, background: 'rgba(181,89,60,0.1)', border: '1px solid rgba(181,89,60,0.2)', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Earned</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 900, color: '#B5593C', lineHeight: 1 }}>+{earnedPoints}</p>
              </div>
              {sharedStreak > 0 && (
                <div style={{ flex: 1, background: '#1A1A18', border: '1px solid rgba(245,240,234,0.07)', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Streak</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 900, color: '#F5F0EA', lineHeight: 1 }}>{sharedStreak} 🔥</p>
                </div>
              )}
            </div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#2E2E2C', letterSpacing: 0.8, textAlign: 'center' }}>countfitness.app</p>
          </div>
          <button onClick={handleShare} style={{ width: '100%', padding: '13px 0', background: shareCopied ? 'rgba(93,187,99,0.15)' : 'rgba(181,89,60,0.1)', border: `1.5px solid ${shareCopied ? 'rgba(93,187,99,0.4)' : 'rgba(181,89,60,0.3)'}`, borderRadius: 10, color: shareCopied ? '#5DBB63' : '#B5593C', fontSize: 14, fontWeight: 800, fontFamily: 'Archivo, sans-serif', cursor: 'pointer', marginBottom: 10, transition: 'all 0.2s ease' }}>
            {shareCopied ? '✓ Copied to clipboard' : '↗ Share your workout'}
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => router.push('/home')} style={{ flex: 1, padding: 15, background: '#111110', color: '#F5F0EA', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, fontFamily: 'Archivo, sans-serif', cursor: 'pointer' }}>Back to Home</button>
            <button onClick={() => router.push('/rewards')} style={{ flex: 1, padding: 15, background: 'transparent', color: '#B5593C', border: '1.5px solid #B5593C', borderRadius: 10, fontSize: 14, fontWeight: 800, fontFamily: 'Archivo, sans-serif', cursor: 'pointer' }}>Shop Rewards</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px', minHeight: '100dvh', background: '#0E0E0D' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>Log Workout</p>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif', color: '#F5F0EA' }}>What did you do?</h1>
      </div>

      {step === 'type' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
            {WORKOUT_TYPES.map(t => {
              const isSelected = workoutType === t.value
              return (
                <button key={t.value} onClick={() => setWorkoutType(t.value)} style={{
                  position: 'relative', height: 120,
                  backgroundImage: `url(https://images.pexels.com/photos/${t.photo}/pexels-photo-${t.photo}.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2)`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  border: isSelected ? '2.5px solid #B5593C' : '2px solid transparent',
                  borderRadius: 12, cursor: 'pointer', overflow: 'hidden', padding: 0, outline: 'none',
                  transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  boxShadow: isSelected ? '0 4px 16px rgba(181,89,60,0.35)' : 'none',
                  zIndex: isSelected ? 1 : 0,
                }}>
                  <div style={{ position: 'absolute', inset: 0, background: isSelected ? 'linear-gradient(to top, rgba(181,89,60,0.65) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.10) 100%)' : 'linear-gradient(to top, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.20) 60%, rgba(0,0,0,0.08) 100%)', borderRadius: 10, transition: 'background 0.15s' }} />
                  {isSelected && (
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: '#B5593C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', fontWeight: 900, lineHeight: 1 }}>✓</div>
                  )}
                  <div style={{ position: 'absolute', top: 8, left: 8 }}>
                    <span style={{ fontSize: 20, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}>{t.emoji}</span>
                  </div>
                  <span style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontSize: 11, fontWeight: 900, color: '#FFFFFF', fontFamily: 'Archivo, sans-serif', letterSpacing: 0.5, textTransform: 'uppercase', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>{t.label}</span>
                </button>
              )
            })}
          </div>

          {workoutType === 'custom' && (
            <input placeholder="Session name" value={customName} onChange={e => setCustomName(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} />
          )}

          <button onClick={() => setStep('details')} style={btnPrimary}>Next →</button>

          <div style={{ background: '#111110', border: '1px solid rgba(245,240,234,0.08)', borderRadius: 12, padding: '14px 16px', marginTop: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(245,240,234,0.4)', marginBottom: 10 }}>How it works</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span>🏆</span>
                <span style={{ fontSize: 12, color: '#F5F0EA' }}><strong>Earn points every session</strong> — each workout adds to your score and moves you up the leaderboard.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span>📍</span>
                <span style={{ fontSize: 12, color: '#F5F0EA' }}><strong>Verify with a wearable</strong> (Apple Health, Garmin, Fitbit, Google Fit) to earn <strong>100% of your points</strong>.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span>✅</span>
                <span style={{ fontSize: 12, color: '#F5F0EA' }}><strong>Unverified sessions earn 10%</strong> — still worth logging, verified is always better.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span>⚖️</span>
                <span style={{ fontSize: 12, color: '#F5F0EA' }}><strong>Why verify?</strong> It keeps the leaderboard fair and honest for everyone competing.</span>
              </div>
            </div>
          </div>
        </>
      )}

      {step === 'details' && (
        <>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, color: '#F5F0EA' }}>Duration</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {DURATIONS.map(d => (
                <button key={d} onClick={() => setDuration(d)} style={{
                  flex: 1, padding: '14px 0',
                  background: duration === d ? '#B5593C' : '#1A1A18',
                  border: `1.5px solid ${duration === d ? '#B5593C' : 'rgba(245,240,234,0.1)'}`,
                  borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#F5F0EA',
                }}>{d}</button>
              ))}
            </div>
            <p style={{ color: '#8A8478', fontSize: 11, marginTop: 6 }}>minutes</p>
          </div>

          <div style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, color: 'rgba(245,240,234,0.4)' }}>Points Preview</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#8A8478' }}>Base (flat)</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#F5F0EA' }}>200 pts</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#8A8478' }}>{getTierLabel(tier)} tier</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#F5F0EA' }}>{multiplier}x</span>
            </div>
            <div style={{ height: 1, background: 'rgba(245,240,234,0.08)', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#F5F0EA' }}>Verified total</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 900, color: '#B5593C' }}>{verifiedPoints.total} pts</span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, color: '#F5F0EA' }}>
              How hard was it?
              {effortRating > 0 && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#B5593C', marginLeft: 8 }}>
                {['', 'Recovery', 'Easy', 'Moderate', 'Hard', 'Max Effort'][effortRating]}
              </span>}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setEffortRating(effortRating === n ? 0 : n)} style={{
                  flex: 1, padding: '12px 0', fontSize: 22,
                  background: n <= effortRating ? 'rgba(181,89,60,0.15)' : '#1A1A18',
                  border: `1.5px solid ${n <= effortRating ? '#B5593C' : 'rgba(245,240,234,0.1)'}`,
                  borderRadius: 10, cursor: 'pointer',
                  opacity: effortRating > 0 && n > effortRating ? 0.35 : 1,
                  transition: 'all 0.15s ease',
                }}>🔥</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <textarea
              placeholder="What did you crush? (optional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={280}
              rows={2}
              style={{
                ...inputStyle,
                resize: 'none',
                lineHeight: 1.5,
                fontSize: 14,
              }}
            />
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <div style={{ background: '#111110', border: '1px solid rgba(245,240,234,0.08)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#F5F0EA', marginBottom: 8 }}>🔒 Verify your workout for full points</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'rgba(245,240,234,0.7)' }}>
                <span>⌚</span><span><strong>Wearable</strong> — Apple Health, Garmin, Fitbit, or Google Fit</span>
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(245,240,234,0.5)', marginTop: 8, marginBottom: 0 }}>Verified sessions earn <strong>100% of your points</strong>. Unverified sessions earn <strong>10%</strong>.</p>
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
  border: '1.5px solid rgba(245,240,234,0.12)',
  borderRadius: 10,
  fontSize: 15,
  fontFamily: 'Archivo, sans-serif',
  background: '#1A1A18',
  color: '#F5F0EA',
  outline: 'none',
  width: '100%',
}

const btnPrimary: React.CSSProperties = {
  flex: 1,
  width: '100%',
  padding: 15,
  background: '#B5593C',
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
  background: '#1A1A18',
  color: '#F5F0EA',
  border: '1.5px solid rgba(245,240,234,0.12)',
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 800,
  fontFamily: 'Archivo, sans-serif',
  cursor: 'pointer',
}
