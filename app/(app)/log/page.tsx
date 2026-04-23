'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { calculatePoints, getTier, getTierLabel, getReferralPoints, generateMysteryBonus } from '@/lib/points'
import type { WorkoutType, Tier } from '@/lib/types'

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

type WT = { value: WorkoutType; label: string; photo: string }
const WORKOUT_TYPES: WT[] = [
  { value: 'push', label: 'Push', photo: '4488764' },
  { value: 'pull', label: 'Pull', photo: '6922157' },
  { value: 'legs', label: 'Legs', photo: '8846443' },
  { value: 'upper', label: 'Upper', photo: '3916766' },
  { value: 'lower', label: 'Lower', photo: '4944435' },
  { value: 'full_body', label: 'Full Body', photo: '6628962' },
  { value: 'cardio', label: 'Cardio', photo: '5327545' },
  { value: 'hiit', label: 'HIIT', photo: '2261481' },
  { value: 'custom', label: 'Custom', photo: '3999606' },
]

// First 4 are shown as tall "featured" tiles (2x2)
const FEATURED_ORDER: WorkoutType[] = ['push', 'legs', 'cardio', 'pull']

const DURATIONS = [30, 45, 60, 75, 90]

const EFFORT_LABELS = ['', 'Recovery', 'Easy', 'Moderate', 'Hard', 'Max effort']

type MilestoneMeta = { title: string; message: string; Icon: () => React.ReactElement }
const StarIcon = () => (
  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1 3-6z" />
  </svg>
)
const FireIcon = () => (
  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
)
const TrophyIcon = () => (
  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 21h8M12 17v4M17 4h3v4a5 5 0 0 1-5 5M7 4H4v4a5 5 0 0 0 5 5M17 4H7v9a5 5 0 0 0 10 0V4z" />
  </svg>
)
const MedalIcon = () => (
  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="15" r="6" />
    <path d="M9 21l3-3 3 3M7 4l5 5 5-5" />
  </svg>
)

const MILESTONES: Record<number, MilestoneMeta> = {
  1: { title: 'First session!', message: 'Every legend starts somewhere. You just took your first step.', Icon: StarIcon },
  5: { title: '5 sessions strong!', message: 'You\u2019re building a habit. Keep showing up.', Icon: FireIcon },
  10: { title: '10 sessions down!', message: 'Double digits. You\u2019re officially consistent.', Icon: StarIcon },
  25: { title: '25 sessions!', message: 'A quarter century of workouts. Top-tier commitment.', Icon: MedalIcon },
  50: { title: '50 sessions!', message: 'Fifty sessions. Most people quit at 5. You didn\u2019t.', Icon: TrophyIcon },
  100: { title: '100 sessions!', message: 'One hundred. You are a COUNT legend. Truly elite.', Icon: TrophyIcon },
}

const VERIFICATION_LABELS: Record<string, string> = {
  apple_health: 'Apple Health',
  garmin: 'Garmin',
  fitbit: 'Fitbit',
  google_fit: 'Google Fit',
  gps: 'GPS',
  gps_denied: 'GPS Blocked',
  strava: 'Strava',
}

function pexelsUrl(id: string) {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2`
}

// ===== COUNT logo (matches rewards/home/profile) =====
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

// ===== Photo tile (featured or small) =====
function PhotoTile({
  type,
  variant,
  pointsPreview,
  onClick,
}: {
  type: WT
  variant: 'featured' | 'small'
  pointsPreview?: number
  onClick: () => void
}) {
  const h = variant === 'featured' ? 160 : 100
  const radius = variant === 'featured' ? 18 : 14
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        height: h,
        borderRadius: radius,
        overflow: 'hidden',
        border: `1px solid ${TOK.hairline}`,
        backgroundImage: `url(${pexelsUrl(type.photo)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        color: TOK.fg,
        width: '100%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(14,14,13,0.10) 0%, rgba(14,14,13,0.55) 65%, rgba(14,14,13,0.90) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 10px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: variant === 'featured' ? '14px 16px' : '10px 12px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: variant === 'featured' ? 9 : 8,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(245,240,234,0.7)',
          }}
        >
          {type.value === 'cardio' || type.value === 'hiit' || type.value === 'custom' ? type.value === 'custom' ? 'Log your own' : 'Cardio' : 'Strength'}
        </div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: variant === 'featured' ? 24 : 18,
            letterSpacing: '-0.015em',
            lineHeight: 1.1,
            color: TOK.fg,
            marginTop: 2,
          }}
        >
          {type.label}
        </div>
        {variant === 'featured' && pointsPreview != null && (
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: TOK.copper2,
              marginTop: 6,
              fontWeight: 600,
            }}
          >
            +{pointsPreview} coins
          </div>
        )}
      </div>
    </button>
  )
}

// ===== Main page =====
export default function LogPage() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'select' | 'success'>('select')
  const [sheetOpen, setSheetOpen] = useState(false)
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
  const { total, multiplier } = calculatePoints({
    verified: false,
    lifetimeSessions: user.lifetime_sessions,
    currentStreak: user.current_streak,
  })
  const verifiedPoints = calculatePoints({
    verified: true,
    lifetimeSessions: user.lifetime_sessions,
    currentStreak: user.current_streak,
  })

  function openSheet(value: WorkoutType) {
    setWorkoutType(value)
    setEffortRating(0)
    setNotes('')
    setDuration(60)
    setCustomName('')
    setError('')
    setSheetOpen(true)
  }

  async function handleLog() {
    if (!user) return
    if (workoutType === 'custom' && !customName.trim()) {
      setError('Name your custom session first.')
      return
    }
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
      setError('You\u2019ve already logged a session today. One per day.')
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
        provider === 'APPLE' ? 'apple_health' :
        provider === 'GARMIN' ? 'garmin' :
        provider === 'FITBIT' ? 'fitbit' :
        provider === 'GOOGLE' ? 'google_fit' :
        provider?.toLowerCase() ?? 'unverified'
      heartRateAvg = terraActivity[0].heart_rate_avg
      calories = terraActivity[0].calories
    }

    if (!verified) {
      const { data: stravaConn } = await supabase
        .from('strava_connections')
        .select('access_token, token_expires_at')
        .eq('user_id', user.id)
        .single()

      if (stravaConn && new Date(stravaConn.token_expires_at) > new Date()) {
        try {
          const _today = new Date()
          const _after = Math.floor(new Date(_today.getFullYear(), _today.getMonth(), _today.getDate()).getTime() / 1000)
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
        } catch {
          /* strava check is best-effort */
        }
      }
    }

    const pts = calculatePoints({
      verified,
      lifetimeSessions: user.lifetime_sessions,
      currentStreak: user.current_streak,
    })

    const { error: workoutError } = await supabase.from('workouts').insert({
      user_id: user.id,
      type: workoutType,
      custom_name: workoutType === 'custom' ? customName : null,
      duration_minutes: duration,
      verification_method: verificationMethod,
      verified,
      heart_rate_avg: heartRateAvg,
      calories,
      base_points: pts.base,
      multiplier_applied: pts.multiplier,
      total_points_earned: pts.total,
      effort_rating: effortRating || null,
      notes: notes.trim() || null,
    })

    if (workoutError) {
      setError(workoutError.message)
      setLoading(false)
      return
    }

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
      .lt('logged_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .limit(1)

    const newStreak = yesterdaySession && yesterdaySession.length > 0 ? user.current_streak + 1 : 1
    const newLongest = Math.max(user.longest_streak, newStreak)

    const bonus = generateMysteryBonus(newStreak)
    const totalWithBonus = pts.total + bonus.amount

    await supabase
      .from('users')
      .update({
        lifetime_sessions: newSessions,
        tier: newTier,
        multiplier: tierMultipliers[newTier],
        points_balance: user.points_balance + totalWithBonus,
        points_lifetime_earned: user.points_lifetime_earned + totalWithBonus,
        current_streak: newStreak,
        longest_streak: newLongest,
      })
      .eq('id', user.id)

    if (user.lifetime_sessions === 0 && user.referred_by && !user.referral_bonus_claimed) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id, points_balance, points_lifetime_earned, tier')
        .eq('id', user.referred_by)
        .single()
      if (referrer) {
        await supabase
          .from('users')
          .update({
            points_balance: referrer.points_balance + getReferralPoints(referrer.tier as Tier),
            points_lifetime_earned: referrer.points_lifetime_earned + getReferralPoints(referrer.tier as Tier),
          })
          .eq('id', referrer.id)
        await supabase.from('users').update({ referral_bonus_claimed: true }).eq('id', user.id)
        await supabase
          .from('referrals')
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
    setSheetOpen(false)
    setStep('success')
  }

  async function handleShare() {
    const wt = WORKOUT_TYPES.find((t) => t.value === workoutType)!
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
    ctx.font = '500 26px "Geist Mono", "JetBrains Mono", monospace'
    ctx.fillText('MAKE IT COUNT', 86, 204)

    ctx.strokeStyle = 'rgba(245,240,234,0.07)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(84, 238)
    ctx.lineTo(SIZE - 84, 238)
    ctx.stroke()

    ctx.fillStyle = '#F5F0EA'
    ctx.font = '400 144px "Instrument Serif", Georgia, serif'
    ctx.fillText(wt.label, 84, 440)

    ctx.fillStyle = '#444442'
    ctx.font = '500 30px "Geist Mono", "JetBrains Mono", monospace'
    ctx.fillText('SESSION LOGGED', 84, 490)

    ctx.strokeStyle = 'rgba(245,240,234,0.07)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(84, 528)
    ctx.lineTo(SIZE - 84, 528)
    ctx.stroke()

    ctx.fillStyle = 'rgba(181,89,60,0.1)'
    ctx.beginPath()
    ctx.roundRect(84, 560, 460, 230, 18)
    ctx.fill()
    ctx.strokeStyle = 'rgba(181,89,60,0.2)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = '#444442'
    ctx.font = '500 27px "Geist Mono", "JetBrains Mono", monospace'
    ctx.fillText('COINS EARNED', 114, 608)
    ctx.fillStyle = '#B5593C'
    ctx.font = '400 140px "Instrument Serif", Georgia, serif'
    ctx.fillText(`+${earnedPoints}`, 114, 748)

    if (sharedStreak > 0) {
      ctx.fillStyle = '#1A1A18'
      ctx.beginPath()
      ctx.roundRect(564, 560, 432, 230, 18)
      ctx.fill()
      ctx.strokeStyle = 'rgba(245,240,234,0.07)'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = '#444442'
      ctx.font = '500 27px "Geist Mono", "JetBrains Mono", monospace'
      ctx.fillText('STREAK', 594, 608)
      ctx.fillStyle = '#F5F0EA'
      ctx.font = '400 132px "Instrument Serif", Georgia, serif'
      ctx.fillText(`${sharedStreak}`, 594, 748)
    }

    ctx.fillStyle = '#252523'
    ctx.font = '500 26px "Geist Mono", "JetBrains Mono", monospace'
    ctx.fillText('countfitness.app', 84, SIZE - 66)

    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'count-workout.png', { type: 'image/png' })
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `${wt.label} · +${earnedPoints} coins` })
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
      } catch {
        /* dismissed */
      }
    }, 'image/png')
  }

  // ===== Success screen =====
  if (step === 'success') {
    const milestone = MILESTONES[newSessionCount]
    const wt = WORKOUT_TYPES.find((t) => t.value === workoutType)!
    const MilestoneIcon = milestone?.Icon
    const isStreakMilestone = [3, 7, 14, 21, 30].includes(sharedStreak)
    const bonusColor =
      mysteryBonus?.rarity === 'epic' ? '#A855F7' :
      mysteryBonus?.rarity === 'rare' ? '#EAB308' :
      TOK.copper
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
          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>

        <div
          style={{
            padding: '14px 20px 6px',
            display: 'flex',
            justifyContent: 'center',
            borderBottom: `1px solid ${TOK.hairline}`,
          }}
        >
          <CountLogo />
        </div>

        <div style={{ padding: '22px 20px 0', textAlign: 'left' }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: TOK.muted,
            }}
          >
            Session logged
          </div>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 32,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              marginTop: 3,
            }}
          >
            Nice work.
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: TOK.muted, marginTop: 6 }}>
            You showed up. That’s what counts.
          </div>
        </div>

        {/* Milestone banner */}
        {milestone && MilestoneIcon && (
          <div style={{ padding: '16px 16px 0' }}>
            <div
              style={{
                position: 'relative',
                borderRadius: 18,
                overflow: 'hidden',
                border: `1px solid ${TOK.hairline}`,
                background: `linear-gradient(160deg, ${TOK.copper} 0%, ${TOK.copperDim} 55%, ${TOK.bg} 110%)`,
                padding: '18px 20px',
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
              <div
                style={{
                  position: 'absolute',
                  top: -24,
                  right: -18,
                  opacity: 0.18,
                  transform: 'scale(4)',
                  transformOrigin: 'top right',
                }}
              >
                <MilestoneIcon />
              </div>
              <div
                style={{
                  position: 'relative',
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'rgba(245,240,234,0.8)',
                }}
              >
                Milestone unlocked
              </div>
              <div
                style={{
                  position: 'relative',
                  fontFamily: 'var(--serif)',
                  fontSize: 28,
                  letterSpacing: '-0.015em',
                  lineHeight: 1.1,
                  marginTop: 4,
                }}
              >
                {milestone.title}
              </div>
              <div
                style={{
                  position: 'relative',
                  fontFamily: 'var(--sans)',
                  fontSize: 13,
                  color: 'rgba(245,240,234,0.82)',
                  marginTop: 6,
                  lineHeight: 1.4,
                }}
              >
                {milestone.message}
              </div>
            </div>
          </div>
        )}

        {/* Points card */}
        <div style={{ padding: '14px 16px 0' }}>
          <div
            style={{
              background: TOK.card,
              border: `1px solid ${TOK.hairline}`,
              borderRadius: 18,
              padding: '20px 22px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: TOK.muted,
              }}
            >
              Coins earned
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 64,
                  color: TOK.copper,
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  fontFeatureSettings: '"tnum"',
                }}
              >
                +{earnedPoints}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: TOK.muted, marginTop: 6 }}>
              {getTierLabel(tier)} tier · {multiplier}× multiplier
            </div>
            {verificationSource && (
              <div
                style={{
                  marginTop: 12,
                  padding: '6px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(22,163,74,0.10)',
                  border: '1px solid rgba(34,197,94,0.25)',
                  borderRadius: 999,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#86efac',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#86efac' }} />
                Verified · {VERIFICATION_LABELS[verificationSource] ?? verificationSource}
              </div>
            )}
          </div>
        </div>

        {/* Mystery bonus */}
        {mysteryBonus && (
          <div style={{ padding: '14px 16px 0' }}>
            <button
              onClick={() => setBonusRevealed(true)}
              disabled={bonusRevealed}
              style={{
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
                background: bonusRevealed
                  ? `linear-gradient(135deg, ${bonusColor}22 0%, ${bonusColor}11 100%)`
                  : TOK.card,
                border: `1px solid ${bonusRevealed ? `${bonusColor}66` : TOK.hairline2}`,
                borderRadius: 16,
                padding: '18px 20px',
                textAlign: 'left',
                cursor: bonusRevealed ? 'default' : 'pointer',
                transition: 'all 0.4s ease',
                color: TOK.fg,
              }}
            >
              {!bonusRevealed ? (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage:
                        'linear-gradient(90deg, transparent 0%, rgba(181,89,60,0.10) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2.2s infinite linear',
                    }}
                  />
                  <div
                    style={{
                      position: 'relative',
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: TOK.copper,
                    }}
                  >
                    Mystery bonus
                  </div>
                  <div
                    style={{
                      position: 'relative',
                      fontFamily: 'var(--serif)',
                      fontSize: 20,
                      letterSpacing: '-0.015em',
                      lineHeight: 1.1,
                      marginTop: 4,
                    }}
                  >
                    Tap to reveal your bonus coins
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: bonusColor,
                      fontWeight: 600,
                    }}
                  >
                    {mysteryBonus.rarity === 'epic'
                      ? 'Epic bonus!'
                      : mysteryBonus.rarity === 'rare'
                        ? 'Rare bonus!'
                        : mysteryBonus.rarity === 'uncommon'
                          ? 'Nice bonus!'
                          : 'Bonus coins'}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--serif)',
                      fontSize: 44,
                      color: bonusColor,
                      letterSpacing: '-0.04em',
                      lineHeight: 1,
                      marginTop: 4,
                      fontFeatureSettings: '"tnum"',
                    }}
                  >
                    +{mysteryBonus.amount}
                  </div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: TOK.muted, marginTop: 6 }}>
                    bonus coins added to your balance
                  </div>
                </>
              )}
            </button>
          </div>
        )}

        {/* Share card */}
        <div style={{ padding: '14px 16px 0' }}>
          <div
            style={{
              background: TOK.card,
              border: `1px solid ${TOK.hairline}`,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'relative',
                height: 120,
                backgroundImage: `url(${pexelsUrl(wt.photo)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(14,14,13,0.25) 0%, rgba(14,14,13,0.85) 100%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: '12px 16px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'rgba(245,240,234,0.7)',
                  }}
                >
                  Session
                </div>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 22,
                    letterSpacing: '-0.015em',
                    lineHeight: 1.1,
                  }}
                >
                  {workoutType === 'custom' && customName ? customName : wt.label}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', padding: '14px 16px', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: TOK.muted,
                  }}
                >
                  Earned
                </div>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 26,
                    color: TOK.copper,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                    marginTop: 4,
                    fontFeatureSettings: '"tnum"',
                  }}
                >
                  +{earnedPoints}
                  {bonusRevealed && mysteryBonus ? (
                    <span style={{ fontSize: 14, color: bonusColor, marginLeft: 6 }}>
                      +{mysteryBonus.amount}
                    </span>
                  ) : null}
                </div>
              </div>
              {sharedStreak > 0 && (
                <div style={{ flex: 1, borderLeft: `1px solid ${TOK.hairline}`, paddingLeft: 14 }}>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 9,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: TOK.muted,
                    }}
                  >
                    Streak
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--serif)',
                      fontSize: 26,
                      color: TOK.fg,
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                      marginTop: 4,
                      fontFeatureSettings: '"tnum"',
                    }}
                  >
                    {sharedStreak}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: TOK.muted, marginLeft: 4 }}>
                      {sharedStreak === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleShare}
            style={{
              width: '100%',
              marginTop: 10,
              padding: '13px 14px',
              background: shareCopied ? 'rgba(22,163,74,0.12)' : 'transparent',
              color: shareCopied ? '#86efac' : TOK.copper,
              border: `1px solid ${shareCopied ? 'rgba(34,197,94,0.35)' : `${TOK.copper}66`}`,
              borderRadius: 12,
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {shareCopied ? 'Copied to clipboard' : 'Share your workout →'}
          </button>
        </div>

        {/* Referral nudge */}
        {user.referral_code && (
          <div style={{ padding: '14px 16px 0' }}>
            <Link href="/invite" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div
                style={{
                  background: isStreakMilestone
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(181,89,60,0.10) 100%)'
                    : TOK.card,
                  border: `1px solid ${isStreakMilestone ? 'rgba(34,197,94,0.28)' : TOK.hairline}`,
                  borderRadius: 14,
                  padding: '14px 16px',
                }}
              >
                {isStreakMilestone ? (
                  <>
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 10,
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: '#86efac',
                        fontWeight: 600,
                      }}
                    >
                      {sharedStreak}-day streak!
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--serif)',
                        fontSize: 20,
                        letterSpacing: '-0.015em',
                        lineHeight: 1.1,
                        marginTop: 4,
                      }}
                    >
                      Challenge a friend to match it
                    </div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: TOK.muted, marginTop: 6 }}>
                      You both earn <span style={{ color: '#86efac', fontWeight: 600 }}>500 bonus coins</span> when they join.
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 9,
                          letterSpacing: '0.22em',
                          textTransform: 'uppercase',
                          color: TOK.muted,
                        }}
                      >
                        Bring a friend
                      </div>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: TOK.fg, fontWeight: 500, marginTop: 2 }}>
                        Invite and both earn <span style={{ color: '#86efac', fontWeight: 600 }}>500 coins</span>
                      </div>
                    </div>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={TOK.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  </div>
                )}
              </div>
            </Link>
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: '18px 16px 0', display: 'flex', gap: 10 }}>
          <button
            onClick={() => router.push('/home')}
            style={{
              flex: 1,
              padding: '14px 16px',
              background: TOK.card,
              color: TOK.fg,
              border: `1px solid ${TOK.hairline2}`,
              borderRadius: 12,
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Home
          </button>
          <button
            onClick={() => router.push('/rewards')}
            style={{
              flex: 1,
              padding: '14px 16px',
              background: TOK.copper,
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Shop rewards
          </button>
        </div>
      </div>
    )
  }

  // ===== Select screen =====
  const featured = FEATURED_ORDER.map((v) => WORKOUT_TYPES.find((t) => t.value === v)!)
  const rest = WORKOUT_TYPES.filter((t) => !FEATURED_ORDER.includes(t.value))
  const sheetType = WORKOUT_TYPES.find((t) => t.value === workoutType)!

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
          borderBottom: `1px solid ${TOK.hairline}`,
        }}
      >
        <CountLogo />
      </div>

      {/* Hero */}
      <div style={{ padding: '18px 20px 0' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: TOK.muted,
          }}
        >
          For you · Today
        </div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 34,
            letterSpacing: '-0.02em',
            lineHeight: 1.02,
            marginTop: 4,
          }}
        >
          What’d you do<br />today?
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: TOK.muted, marginTop: 8 }}>
          Tap one — log it in three seconds.
        </div>
      </div>

      {/* Featured 2x2 */}
      <div
        style={{
          padding: '16px 16px 0',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        {featured.map((t) => (
          <PhotoTile key={t.value} type={t} variant="featured" pointsPreview={total} onClick={() => openSheet(t.value)} />
        ))}
      </div>

      {/* More types */}
      <div style={{ padding: '20px 20px 8px' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: TOK.muted,
          }}
        >
          More types
        </div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 22,
            letterSpacing: '-0.015em',
            lineHeight: 1.1,
            marginTop: 3,
          }}
        >
          Everything else
        </div>
      </div>
      <div
        style={{
          padding: '0 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {rest.map((t) => (
          <PhotoTile key={t.value} type={t} variant="small" onClick={() => openSheet(t.value)} />
        ))}
      </div>

      {/* How it works */}
      <div style={{ padding: '22px 16px 0' }}>
        <div
          style={{
            background: TOK.card,
            border: `1px solid ${TOK.hairline}`,
            borderRadius: 14,
            padding: '16px 18px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: TOK.muted,
              marginBottom: 12,
            }}
          >
            How it works
          </div>
          <HowRow
            title="Earn every session"
            body="Each workout adds to your coin balance."
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            }
          />
          <HowRow
            title="Verify for full coins"
            body="Apple Health, Garmin, Fitbit, Google Fit, or Strava."
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <HowRow
            title="Unverified earn 10%"
            body="Still worth logging. Verified is always better."
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 1 1 8 0v3" />
              </svg>
            }
            last
          />
        </div>
      </div>

      {/* ===== Bottom sheet ===== */}
      {sheetOpen && (
        <div
          onClick={() => !loading && setSheetOpen(false)}
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
              animation: 'sheetUp 280ms cubic-bezier(.2,.8,.2,1)',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(245,240,234,0.2)', margin: '12px auto 8px' }} />

            {/* Sheet hero w/ photo */}
            <div
              style={{
                position: 'relative',
                height: 140,
                margin: '0 16px',
                borderRadius: 18,
                overflow: 'hidden',
                backgroundImage: `url(${pexelsUrl(sheetType.photo)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: `1px solid ${TOK.hairline}`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(14,14,13,0.15) 0%, rgba(14,14,13,0.90) 100%)',
                }}
              />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 16px' }}>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'rgba(245,240,234,0.7)',
                  }}
                >
                  Log session
                </div>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 28,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                  }}
                >
                  {sheetType.label}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 20px 24px' }}>
              {/* Custom name */}
              {workoutType === 'custom' && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 9,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: TOK.muted,
                      marginBottom: 6,
                    }}
                  >
                    Session name
                  </div>
                  <input
                    placeholder="e.g. Yoga, Climbing, Swim"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={inputStyle()}
                  />
                </div>
              )}

              {/* Duration */}
              <div style={{ marginBottom: 16 }}>
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
                  Duration
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {DURATIONS.map((d) => {
                    const on = duration === d
                    return (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        style={{
                          flex: 1,
                          padding: '12px 0',
                          background: on ? TOK.copper : TOK.card,
                          border: `1px solid ${on ? TOK.copper : TOK.hairline}`,
                          borderRadius: 10,
                          fontFamily: 'var(--mono)',
                          fontSize: 13,
                          fontWeight: 500,
                          color: on ? '#fff' : TOK.fg,
                          cursor: 'pointer',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {d}
                        <span style={{ marginLeft: 3, fontSize: 9, opacity: 0.65, letterSpacing: '0.12em' }}>m</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Effort */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 9,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: TOK.muted,
                    }}
                  >
                    Effort
                  </div>
                  {effortRating > 0 && (
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: TOK.copper, letterSpacing: '0.1em' }}>
                      {EFFORT_LABELS[effortRating]}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = n <= effortRating
                    return (
                      <button
                        key={n}
                        onClick={() => setEffortRating(effortRating === n ? 0 : n)}
                        style={{
                          flex: 1,
                          padding: '12px 0',
                          background: active ? `${TOK.copper}22` : TOK.card,
                          border: `1px solid ${active ? TOK.copper : TOK.hairline}`,
                          borderRadius: 10,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: effortRating > 0 && !active ? 0.35 : 1,
                          color: active ? TOK.copper : TOK.muted,
                        }}
                      >
                        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                        </svg>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: TOK.muted,
                    marginBottom: 6,
                  }}
                >
                  Notes · optional
                </div>
                <textarea
                  placeholder="What did you crush?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={280}
                  rows={2}
                  style={{ ...inputStyle(), resize: 'none', lineHeight: 1.45, fontFamily: 'var(--sans)' }}
                />
              </div>

              {/* Points preview */}
              <div
                style={{
                  background: TOK.card,
                  border: `1px solid ${TOK.hairline}`,
                  borderRadius: 14,
                  padding: '14px 16px',
                  marginBottom: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 9,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: TOK.muted,
                    }}
                  >
                    You’ll earn
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span
                      style={{
                        fontFamily: 'var(--serif)',
                        fontSize: 28,
                        color: TOK.copper,
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                        fontFeatureSettings: '"tnum"',
                      }}
                    >
                      {total}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: TOK.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                      coins
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    color: TOK.muted,
                    letterSpacing: '0.04em',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    {getTierLabel(tier)} tier · {multiplier}×
                  </span>
                  <span style={{ color: '#86efac' }}>
                    +{verifiedPoints.total - total} if verified
                  </span>
                </div>
              </div>

              {error && (
                <div
                  style={{
                    background: 'rgba(220,38,38,0.10)',
                    border: '1px solid rgba(220,38,38,0.30)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: '#fca5a5',
                    marginBottom: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => !loading && setSheetOpen(false)}
                  disabled={loading}
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
                    cursor: loading ? 'default' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLog}
                  disabled={loading}
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
                    cursor: loading ? 'default' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Logging\u2026' : `Log · +${total} coins`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function HowRow({ title, body, icon, last }: { title: string; body: string; icon: React.ReactNode; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        paddingBottom: last ? 0 : 10,
        marginBottom: last ? 0 : 10,
        borderBottom: last ? 'none' : `1px solid ${TOK.hairline}`,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: TOK.card2,
          border: `1px solid ${TOK.hairline}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: TOK.copper,
          marginTop: 1,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: TOK.fg, fontWeight: 500 }}>{title}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: TOK.muted, letterSpacing: '0.02em', marginTop: 2 }}>
          {body}
        </div>
      </div>
    </div>
  )
}

function inputStyle(): React.CSSProperties {
  return {
    background: '#1A1A19',
    border: `1px solid ${TOK.hairline2}`,
    borderRadius: 10,
    padding: '12px 14px',
    color: TOK.fg,
    fontFamily: 'var(--mono)',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  }
}
