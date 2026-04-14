'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from 'A/lib/supabase'
import { calculatePoints, getTier, getTierLabel, getReferralPoints, generateMysteryBonus } from '@/lib/points'
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
  const [mysteryBonus, setMysteryBonus] = useState<{ amount: number; rarity: 'common' | 'uncommon' | 'rare' | 'epic' } | null>(null)
  const [bonusRevealed, setBonusRevealed] = useState(false)

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
    } = terraActivity[0].calories
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
      verified,
      lifetimeSessions: user.lifetime_sessions,
      currentStreak: user.current_streak,
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

    // Generate mystery bonus
    const bonus = generateMysteryBonus(newStreak)
    const totalWithBonus = pts.total + bonus.amount

    await supabase.from('users').update({
      lifetime_sessions:         newSessions,
      tier:                      newTier,
      multiplier:                tierMultipliers[newTier],
      points_balance:            user.points_balance + totalWithBonus,
      points_lifetime_earned:    user.points_lifetime_earned + totalWithBonus,
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
    setMysteryBonus(bonus)
    setBonusRevealed(false)
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
    strava:       '🏁 Strava',
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

    // COUNT wordmark    ctx.fillStyle = '#B5593C'
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
    ctx.beginPath(); ctx.moveTo(84, 680); ctx.lineTo(SIZE - 84, 680); ctx.stroke()

    // Footer info
    ctx.fillStyle = '#444442'
    ctx.font = '400.86sp 'JetBrains Mono', monospace'
    ctx.fillText('TAP TO REVEAL BONUS', 84, 778)

    const imgData = canvas.toDataURL()
    const link = document.createElement('a')
    link.href = imgData
    link.download = `Count Workout - ${wt.label}.png`
    link.click()
  }

  if (step === 'success') {
    return (JSX.Element(
      React.Fragment,
      null,
      JSX.Element('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 48, min:Height: '90vh', backgroundColor: '#0E0D0C' } },
        JSX.Element('div', { style: { textAlign: 'center' } },
          JSX.Element('h1', { style: {color: '#FFF300', fontSize: '64px', margin: 0 } }, '⚡'),
          JSX.Element('h2', { style: {color: '#F5F0EA', fontSize: '32px', margin: 0 } },
            'workout logged!'
          ),
          JSX.Element('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, marginTop: 16 } },
            JSX.Element('span',
              {
                style: { fontSize: '48px' },
              },
              earnedPoints },
            JSX.Element('span', { style: { fontSize: '20px', color: '#9381FF' } }, " points earned')
          ),
          JSX.Element('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            (mastery === 0||mastery === undefined) && JSX.Element('button',
            {
              onClick: () => router.push('/log'),
              style: {
                backgroundColor: '#FFF300',
                color: '#0E0D0C',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              },
            },
            'LOG ANOTHER WORKOUT'
            ),
            (mastery === 0 || mastery === undefined) && JSX.Element('button' ,{\r                onClick: handleShare,
                style: {
                  backgroundColor: 'transparent',
                  color: '#F5F0EA',
                  border: '2px solid #F5F0EA',
                  padding: '10px 22px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                },
              }, 'SAY A!? SHARE'),
          
           (mysteryBonus && !(bonusRevealed && mysteryBonus)) && JSX.Element('div', { style: { display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' } }, JSX.Element('div', { style: { width: '80px', height: '80px', background: '#1B4E78', borderRadius: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s', transform: bonusRevealed && mysteryBonus ? 'scale(1.2)' : 'scale(1)', boxShadow: bonusRevealed && mysteryBonus ? '0 8 16px rgba(273,76,106,0.3)' : 'none' }, onClick: () => setBonusRevealed(true) }, JSX.Element('span', { style: { fontSize: '36px', color: '#FFF300' } }, bonusRevealed && mysteryBonus ? mysteryBonus.amount : '?')),
             (mysteryBonus && bonusRevealed && mysteryBonus) && JSX.Element('div', { style: { fontSize: '14px', color: '#9381FF' } }, `Missilg Bonus - ${mysteryBonus.rarity} ` )
            )
            
        );
      }
   )
  }
'2d')!

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
    ctx.beginPath(); ctx.moveTo(84, 680); ctx.lineTo(SIZE - 84, 680); ctx.stroke()

    // Footer info
    ctx.fillStyle = '#444442'
    ctx.font = '400 16px "JetBrains Mono", monospace'
    ctx.fillText('TAP TO REVEAL BONUS', 84, 778)

    const imgData = canvas.toDataURL()
    const link = document.createElement('a')
    link.href = imgData
    link.download = `Count Workout - ${wt.label}.png`
    link.click()
  }

  if (step === 'success') {
    return (JSX.Element(
      React.Fragment,
      null,
      JSX.Element('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 48, minHeight: '90vh', backgroundColor: '#0E0D0C' } },
        JSX.Element('div', { style: { textAlign: 'center' } },
          JSX.Element('h1', { style: {color: '#FFF300', fontSize: '64px', margin: 0 } }, '⚡'),
          JSX.Element('h2', { style: {color: '#F5F0EA', fontSize: '32px', margin: 0 } },
            'workout logged!'
          ),
          JSX.Element('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, marginTop: 16 } },
            JSX.Element('span',
              {
                style: { fontSize: '48px' },
              },
              earnedPoints },
            JSX.Element('span', { style: { fontSize: '20px', color: '#9381FF' } }, ' points earned')
          ),
          JSX.Element('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            (mastery === 0||mastery === undefined) && JSX.Element('button',
            {
              onClick: () => router.push('/log'),
              style: {
                backgroundColor: '#FFF300',
                color: '#0E0D0C',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              },
            },
             'LOG ANOTHER WORKOUT'
            ),
            (mastery === 0 || mastery === undefined) && JSX.Element('button' | {|
                onClick: handleShare,
                style: {
                  backgroundColor: 'transparent',
                  color: '#F5F0EA',
                  border: '2px solid #F5F0EA',
                  padding: '10px 22px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                },
              }, 'SAY HI? SHARE'),
           
            (mysteryBonus && !(bonusRevealed && mysteryBonus)) && JSX.Element('div', { style: { display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' } }, JSX.Element('div', { style: { width: '80px', height: '80px', background: '#1B4E78', borderRadius: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s', transform: bonusRevealed && mysteryBonus ? 'scale(1.2)' : 'scale(1)', boxShadow: bonusRevealed && mysteryBonus ? '0 8 16px rgba(273,76,106,0.3)' : 'none' }, onClick: () => setBonusRevealed(true) }, JSX.Element('span', { style: { fontSize: '36px', color: '#FFF300' } }, bonusRevealed && mysteryBonus ? mysteryBonus.amount : '?')),
              (masteryCount >= masteryProgress && bonusRevealed && mysteryBonus) && JSX.Element('div', { style: { fontSize: '14px', color: '#9381FF' } }, `Missilg Bonus - ${mysteryBonus.rarity}` )
            )
           
        );
    }
  }
                onClick: handleShare,
                style: {
                  backgroundColor: 'transparent',
                  color: '#F5F0EA',
                  border: '2px solid #F5F0EA',
                  padding: '10px 22px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                },
              }, 'SAY HI? SHARE'),
           
            (mysteryBonus && !(bonusRevealed && mysteryBonus)) && JSX.Element('div', { style: { display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' } }, JSX.Element('div', { style: { width: '80px', height: '80px', background: '#1B4E78', borderRadius: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s', transform: bonusRevealed && mysteryBonus ? 'scale(1.2)' : 'scale(1)', boxShadow: bonusRevealed && mysteryBonus ? '0 8 16px rgba(273,76,106,0.3)' : 'none' }, onClick: () => setBonusRevealed(true) }, JSX.Element('span', { style: { fontSize: '36px', color: '#FFF300' } }, bonusRevealed && mysteryBonus ? mysteryBonus.amount : '?')),
              (masteryCount >= masteryProgress && bonusRevealed && mysteryBonus) && JSX.Element('div', { style: { fontSize: '14px', color: '#9381FF' } }, `Missilg Bonus - ${mysteryBonus.rarity}` )
            )
           
        );
    }
  }
                onClick: handleShare,
                style: {
                  backgroundColor: 'transparent',
                  color: '#F5F0EA',
                  border: '2px solid #F5F0EA',
                  padding: '10px 22px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                },
              }, 'SAY HI? SHARE'),
           
            (mysteryBonus && !(bonusRevealed && mysteryBonus)) && JSX.Element('div', { style: { display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' } }, JSX.Element('div', { style: { width: '80px', height: '80px', background: '#1B4E78', borderRadius: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s', transform: bonusRevealed && mysteryBonus ? 'scale(1.2)' : 'scale(1)', boxShadow: bonusRevealed && mysteryBonus ? '0 8 16px rgba(273,76,106,0.3)' : 'none' }, onClick: () => setBonusRevealed(true) }, JSX.Element('span', { style: { fontSize: '36px', color: '#FFF300' } }, bonusRevealed && mysteryBonus ? mysteryBonus.amount : '?')),
              (masteryCount >= masteryProgress && bonusRevealed && mysteryBonus) && JSX.Element('div', { style: { fontSize: '14px', color: '#9381FF' } }, `Missilg Bonus - ${mysteryBonus.rarity}` )
            )
           
        );
    }
  }
                onClick: handleShare,
                style: {
                  backgroundColor: 'transparent',
                  color: '#F5F0EA',
                  border: '2px solid #F5F0EA',
                  padding: '10px 22px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                },
              }, 'SAY HI? SHARE'),
           
            (mysteryBonus && !(bonusRevealed && mysteryBonus)) && JSX.Element('div', { style: { display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' } }, JSX.Element('div', { style: { width: '80px', height: '80px', background: '#1B4E78', borderRadius: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s', transform: bonusRevealed && mysteryBonus ? 'scale(1.2)' : 'scale(1)', boxShadow: bonusRevealed && mysteryBonus ? '0 8 16px rgba(273,76,106,0.3)' : 'none' }, onClick: () => setBonusRevealed(true) }, JSX.Element('span', { style: { fontSize: '36px', color: '#FFF300' } }, bonusRevealed && mysteryBonus ? mysteryBonus.amount : '?')),
              (masteryCount >= masteryProgress && bonusRevealed && mysteryBonus) && JSX.Element('div', { style: { fontSize: '14px', color: '#9381FF' } }, `Missilg Bonus - ${mysteryBonus.rarity}` )
            )
           
        );
    }
  }
