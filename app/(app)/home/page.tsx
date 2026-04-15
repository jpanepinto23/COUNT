'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { getTierLabel, getTierMultiplier, getNextTierSessions, calculatePoints } from '@/lib/points'
import type { Workout, WorkoutType } from '@/lib/types'
import { generateDailyMissions, todayDateStr, DIFFICULTY_COLORS, type Mission, type MissionContext } from '@/lib/missions'
import TallyLogo from '@/components/TallyLogo'
import { subscribeToPush, isPushSubscribed } from '@/lib/push'

const TIER_COLORS: Record<string, string> = {
  bronze: '#B5593C',
  silver: '#6B7280',
  gold: '#D97706',
  platinum: '#7C3AED',
}
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const POINTS_CARD_PHOTO = 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&fit=crop'
const WEEKLY_GOAL = 4
const MONTHLY_GOAL = 12
const FREEZE_COST = 100

export default function HomePage() {
  const { user, refreshUser } = useAuth()
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([])
  const [referralCount, setReferralCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [monthlyCount, setMonthlyCount] = useState(0)
  const [userRank, setUserRank] = useState<number | null>(null)
  const [pointsToPassAbove, setPointsToPassAbove] = useState<number | null>(null)
  const [nextReward, setNextReward] = useState<{ name: string; points_cost: number } | null>(null)
  const [isFrozen, setIsFrozen] = useState(false)
  const [freezing, setFreezing] = useState(false)
  const [freezeSuccess, setFreezeSuccess] = useState(false)
  const [missions, setMissions] = useState<Mission[]>([])
  const [claimingKey, setClaimingKey] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    supabase.from('workouts').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setRecentWorkouts(data) })
    if (user.referral_code) {
      supabase.from('referrals').select('id', { count: 'exact' }).eq('referrer_id', user.id)
        .then(({ count }) => { if (count !== null) setReferralCount(count) })
    }
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
    supabase.from('workouts').select('id', { count: 'exact' }).eq('user_id', user.id).gte('logged_at', monthStart.toISOString())
      .then(({ count }) => { if (count !== null) setMonthlyCount(count) })
    supabase.from('users').select('id', { count: 'exact' }).gt('points_lifetime_earned', user.points_lifetime_earned)
      .then(({ count }) => { if (count !== null) setUserRank(count + 1) })
    supabase.from('users').select('points_lifetime_earned').gt('points_lifetime_earned', user.points_lifetime_earned)
      .order('points_lifetime_earned', { ascending: true }).limit(1)
      .then(({ data }) => { if (data && data[0]) setPointsToPassAbove(data[0].points_lifetime_earned - user.points_lifetime_earned) })
    supabase.from('rewards').select('name, points_cost').gt('points_cost', user.points_balance)
      .order('points_cost', { ascending: true }).limit(1)
      .then(({ data }) => { if (data && data[0]) setNextReward(data[0]) })

    // Fetch mission data
    ;(async () => {
      const dateStr = todayDateStr()
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - weekStart.getDay())

      // Get today's workout info for mission context
      const { data: todayWorkouts } = await supabase
        .from('workouts')
        .select('type, verified, total_points_earned, effort_rating')
        .eq('user_id', user.id)
        .gte('logged_at', todayStart.toISOString())
        .limit(1)

      // Get week session count for missions
      const { count: weekCount } = await supabase
        .from('workouts')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('logged_at', weekStart.toISOString())

      // Get claimed missions for today
      const { data: claims } = await supabase
        .from('mission_claims')
        .select('mission_key')
        .eq('user_id', user.id)
        .eq('date', dateStr)

      const claimedKeys = new Set((claims ?? []).map(c => c.mission_key))
      const tw = todayWorkouts?.[0]

      const ctx: MissionContext = {
        hasLoggedToday: !!tw,
        todayWorkoutType: (tw?.type as WorkoutType) ?? null,
        todayVerified: tw?.verified ?? false,
        todayPoints: tw?.total_points_earned ?? 0,
        todayEffort: tw?.effort_rating ?? 0,
        currentStreak: user.current_streak,
        weekSessionCount: weekCount ?? 0,
        lifetimeSessions: user.lifetime_sessions,
      }

      setMissions(generateDailyMissions(dateStr, ctx, claimedKeys))
    })()

    refreshUser()
  }, [user?.id]) // eslint-disable-line

  if (!user) return null

  const tier = user.tier ?? 'bronze'
  const tierColor = TIER_COLORS[tier]
  const { next, sessionsNeeded, threshold } = getNextTierSessions(user.lifetime_sessions)
  const progress = next
    ? ((user.lifetime_sessions - (threshold - sessionsNeeded - (tier === 'bronze' ? 0 : tier === 'silver' ? 30 : tier === 'gold' ? 60 : 120))) /
        (threshold - (tier === 'bronze' ? 0 : tier === 'silver' ? 30 : tier === 'gold' ? 60 : 120))) * 100
    : 100

  const today = new Date()
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - (6 - i)); return d })
  const workedOutDates = new Set(recentWorkouts.map(w => new Date(w.logged_at).toDateString()))
  const hasLoggedToday = workedOutDates.has(today.toDateString())
  const streakAtRisk = user.current_streak > 0 && !hasLoggedToday
  const weekSessionCount = week.filter(d => workedOutDates.has(d.toDateString())).length
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - today.getDate()
  const monthName = today.toLocaleDateString('en-US', { month: 'long' })
  const referralLink = `https://countfitness.app/auth/signup?ref=${user.referral_code ?? ''}`

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: 'Join me on COUNT', text: `Join COUNT with my code ${user?.referral_code} and we both get 500 bonus points! 💪`, url: referralLink }) } catch {}
    } else {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }


  useEffect(() => {
    isPushSubscribed().then(setPushEnabled)
  }, [])

  async function handleEnablePush() {
    if (!user) return
    const ok = await subscribeToPush(user.id)
    if (ok) setPushEnabled(true)
  }

  async function handleShareStats() {
    if (!user) return
    const tier = user.tier ?? 'bronze'
    const ogUrl = `https://countfitness.app/api/og?name=${encodeURIComponent(user.name)}&tier=${tier}&streak=${user.current_streak}&sessions=${user.lifetime_sessions}&points=${user.points_balance}`
    if (navigator.share) {
      await navigator.share({ title: 'My COUNT Stats', text: `${user.current_streak}-day streak · ${user.lifetime_sessions} sessions on COUNT 💪`, url: ogUrl })
    } else {
      await navigator.clipboard.writeText(ogUrl)
    }
  }

  async function handleClaimMission(mission: Mission) {
    if (!user || claimingKey || mission.claimed || !mission.completed) return
    setClaimingKey(mission.key)
    const dateStr = todayDateStr()
    const { error: claimError } = await supabase.from('mission_claims').insert({
      user_id: user.id,
      mission_key: mission.key,
      date: dateStr,
      coins_claimed: mission.reward,
    })
    if (!claimError) {
      await supabase.from('users').update({
        points_balance: user.points_balance + mission.reward,
        points_lifetime_earned: user.points_lifetime_earned + mission.reward,
      }).eq('id', user.id)
      setMissions(prev => prev.map(m => m.key === mission.key ? { ...m, claimed: true } : m))
      await refreshUser()
    }
    setClaimingKey(null)
  }

  async function handleFreezeStreak() {
    if (!user || freezing || user.points_balance < FREEZE_COST) return
    setFreezing(true)
    await supabase.from('users').update({ points_balance: user.points_balance - FREEZE_COST }).eq('id', user.id)
    await refreshUser()
    setIsFrozen(true)
    setFreezeSuccess(true)
    setFreezing(false)
  }
  return (
    <div style={{ padding: '20px 16px', paddingBottom: 24 }}>

      {/* Logo */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <TallyLogo size={0.8} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <p style={{ color: '#8A8478', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>{greeting()}</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif' }}>{user.name.split(' ')[0]}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/rank" style={{ textDecoration: 'none' }}>
            <div style={{ background: tierColor + '18', border: `1.5px solid ${tierColor}`, borderRadius: 20, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <TierIcon tier={tier} color={tierColor} />
              <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 12, fontWeight: 800, color: tierColor, textTransform: 'uppercase', letterSpacing: 1 }}>{getTierLabel(tier)}</span>
            </div>
          </Link>
          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: user.avatar_url ? `2px solid ${tierColor}` : '2px dashed #C5B9AC', background: user.avatar_url ? 'transparent' : tierColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {user.avatar_url
                ? <img src={user.avatar_url} alt="you" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 14, fontWeight: 900, color: tierColor }}>{user.name.charAt(0).toUpperCase()}</span>}
            </div>
          </Link>
        </div>
      </div>

      {/* Photo nudge */}
      {!user.avatar_url && (
        <Link href="/profile" style={{ textDecoration: 'none', display: 'block', marginBottom: 14 }}>
          <div style={{ background: '#1A1A18', border: '1.5px solid rgba(181,89,60,0.3)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📸</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#B5593C', marginBottom: 1 }}>Add your profile photo</p>
              <p style={{ fontSize: 11, color: 'rgba(245,240,234,0.45)' }}>Make COUNT yours — tap to upload a photo</p>
            </div>
            <span style={{ color: '#C5B9AC', fontSize: 18 }}>›</span>
          </div>
        </Link>
      )}

      {/* Streak at risk */}
      {streakAtRisk && (
        <div style={{ background: 'rgba(249,115,22,0.12)', border: '1.5px solid rgba(249,115,22,0.4)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#C2410C', marginBottom: 1 }}>Streak at risk!</p>
            <p style={{ fontSize: 11, color: '#9A3412' }}>Log today to keep your {user.current_streak}-day streak alive 🔥</p>
          </div>
          <Link href="/log" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#B5593C', whiteSpace: 'nowrap' }}>Log now →</span>
          </Link>
          {isFrozen ? (
            <p style={{ fontSize: 11, color: '#92400e', fontWeight: 700, marginTop: 8 }}>🧊 Streak frozen — safe through tonight!</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <p style={{ fontSize: 11, color: '#92400e' }}>Protect it · {FREEZE_COST} pts</p>
              <button onClick={handleFreezeStreak} disabled={freezing || user.points_balance < FREEZE_COST} style={{ background: '#F97316', border: 'none', borderRadius: 8, padding: '5px 12px', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', opacity: (freezing || user.points_balance < FREEZE_COST) ? 0.5 : 1 }}>
                {freezing ? '...' : freezeSuccess ? '🧊 Done!' : '🧊 Freeze'}
              </button>
            </div>
          )}
        </div>
      )}

      {!pushEnabled && (
        <button onClick={handleEnablePush} style={{ width: '100%', background: '#1A1A18', border: '1px solid rgba(245,240,234,0.08)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#F5F0EA', marginBottom: 1 }}>Enable streak reminders</p>
            <p style={{ fontSize: 11, color: 'rgba(245,240,234,0.5)' }}>Get notified before your streak breaks</p>
          </div>
          <span style={{ color: 'rgba(245,240,234,0.3)', fontSize: 18 }}>›</span>
        </button>
      )}
      {/* Points card */}
      <div style={{ backgroundImage: `url(${POINTS_CARD_PHOTO})`, backgroundSize: 'cover', backgroundPosition: 'center 40%', borderRadius: 16, padding: '20px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,8,7,0.60)', borderRadius: 16 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'rgba(245,240,234,0.65)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>COUNT Coins</p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 42, fontWeight: 900, color: '#F5F0EA', lineHeight: 1, marginBottom: 4 }}>
            {user.points_balance.toLocaleString()}
          </p>
          <p style={{ color: 'rgba(245,240,234,0.55)', fontSize: 12 }}>
            {user.points_lifetime_earned.toLocaleString()} lifetime · {getTierMultiplier(tier)}x multiplier
          </p>
        </div>
      </div>

      {/* ── Compact week strip ── */}
      <div style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(245,240,234,0.4)', textTransform: 'uppercase', letterSpacing: 1.5 }}>This Week</p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#B5593C' }}>🔥 {user.current_streak} day streak</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {week.map((d, i) => {
            const hit = workedOutDates.has(d.toDateString())
            const isToday = d.toDateString() === today.toDateString()
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 8, color: isToday ? tierColor : '#B0A898', fontWeight: 700, letterSpacing: 0.5 }}>{DAY_LABELS[d.getDay()]}</span>
                <span style={{ fontSize: 11, color: isToday ? '#FFFFFF' : '#9CA3AF', fontWeight: isToday ? 800 : 500, fontFamily: "'JetBrains Mono', monospace" }}>{d.getDate()}</span>
                <div style={{ width: '100%', height: 6, borderRadius: 3, background: hit ? tierColor : isToday ? tierColor + '30' : 'rgba(245,240,234,0.08)' }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Goals row: weekly + monthly side by side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {/* Weekly goal */}
        <div style={{ background: weekSessionCount >= WEEKLY_GOAL ? '#F0FDF4' : '#111110', border: 'none', borderRadius: 14, padding: '14px 14px' }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: weekSessionCount >= WEEKLY_GOAL ? '#16a34a' : 'rgba(245,240,234,0.45)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>Weekly</p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', lineHeight: 1, marginBottom: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: weekSessionCount >= WEEKLY_GOAL ? '#16a34a' : tierColor }}>{weekSessionCount}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: weekSessionCount >= WEEKLY_GOAL ? '#86efac' : 'rgba(245,240,234,0.35)' }}>/{WEEKLY_GOAL}</span>
          </p>
          <div style={{ height: 4, background: weekSessionCount >= WEEKLY_GOAL ? '#bbf7d0' : 'rgba(255,255,255,0.12)', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ height: '100%', width: `${Math.min((weekSessionCount / WEEKLY_GOAL) * 100, 100)}%`, background: weekSessionCount >= WEEKLY_GOAL ? '#16a34a' : tierColor, borderRadius: 99 }} />
          </div>
          <p style={{ fontSize: 9, fontWeight: 700, color: weekSessionCount >= WEEKLY_GOAL ? '#16a34a' : 'rgba(245,240,234,0.4)' }}>
            {weekSessionCount >= WEEKLY_GOAL ? '🎉 Done!' : `${WEEKLY_GOAL - weekSessionCount} sessions to go`}
          </p>
        </div>

        {/* Monthly challenge */}
        <div style={{ background: monthlyCount >= MONTHLY_GOAL ? '#F0FDF4' : tierColor + '12', border: `1.5px solid ${monthlyCount >= MONTHLY_GOAL ? 'rgba(134,239,172,0.3)' : tierColor + '30'}`, borderRadius: 14, padding: '14px 14px' }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: monthlyCount >= MONTHLY_GOAL ? '#16a34a' : tierColor, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>{monthName}</p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', lineHeight: 1, marginBottom: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: monthlyCount >= MONTHLY_GOAL ? '#16a34a' : tierColor }}>{monthlyCount}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: monthlyCount >= MONTHLY_GOAL ? '#86efac' : tierColor + '80' }}>/{MONTHLY_GOAL}</span>
          </p>
          <div style={{ height: 4, background: monthlyCount >= MONTHLY_GOAL ? '#bbf7d0' : tierColor + '25', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ height: '100%', width: `${Math.min((monthlyCount / MONTHLY_GOAL) * 100, 100)}%`, background: monthlyCount >= MONTHLY_GOAL ? '#16a34a' : tierColor, borderRadius: 99 }} />
          </div>
          <p style={{ fontSize: 9, fontWeight: 700, color: daysLeft <= 5 && monthlyCount < MONTHLY_GOAL ? '#C2410C' : monthlyCount >= MONTHLY_GOAL ? '#16a34a' : tierColor + 'CC' }}>
            {monthlyCount >= MONTHLY_GOAL ? '🏆 Crushed!' : daysLeft <= 5 ? `⚡ ${daysLeft}d left!` : `${MONTHLY_GOAL - monthlyCount} to go`}
          </p>
        </div>
      </div>

      {/* ── Daily Missions ── */}
      {missions.length > 0 && (
        <div style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1.5 }}>Daily Missions</p>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,240,234,0.3)' }}>Resets at midnight</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {missions.map(mission => {
              const dc = DIFFICULTY_COLORS[mission.difficulty]
              const isComplete = mission.completed
              const isClaimed = mission.claimed
              const isClaiming = claimingKey === mission.key
              return (
                <div key={mission.key} style={{
                  background: isClaimed ? 'rgba(34,197,94,0.06)' : isComplete ? 'rgba(245,240,234,0.04)' : 'rgba(245,240,234,0.02)',
                  border: `1.5px solid ${isClaimed ? 'rgba(34,197,94,0.2)' : isComplete ? dc.border : 'rgba(245,240,234,0.06)'}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  opacity: isClaimed ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{isClaimed ? '✅' : mission.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: isClaimed ? '#22c55e' : '#F5F0EA' }}>
                        {mission.title}
                      </p>
                      <span style={{
                        fontSize: 8,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        color: dc.text,
                        background: dc.bg,
                        border: `1px solid ${dc.border}`,
                        borderRadius: 4,
                        padding: '1px 5px',
                      }}>{mission.difficulty}</span>
                    </div>
                    <p style={{ fontSize: 11, color: isClaimed ? 'rgba(34,197,94,0.5)' : 'rgba(245,240,234,0.4)' }}>
                      {isClaimed ? 'Claimed!' : mission.description}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    {isClaimed ? (
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 900, color: '#22c55e' }}>+{mission.reward}</p>
                    ) : isComplete ? (
                      <button
                        onClick={() => handleClaimMission(mission)}
                        disabled={isClaiming}
                        style={{
                          background: `linear-gradient(135deg, ${dc.text}, ${tierColor})`,
                          border: 'none',
                          borderRadius: 8,
                          padding: '6px 12px',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: 'pointer',
                          fontFamily: 'Archivo, sans-serif',
                          opacity: isClaiming ? 0.6 : 1,
                        }}
                      >
                        {isClaiming ? '...' : `+${mission.reward} 🪙`}
                      </button>
                    ) : (
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: 'rgba(245,240,234,0.2)' }}>{mission.reward} 🪙</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Rank card — dark ── */}
      {userRank !== null && (
        <Link href="/leaderboard" style={{ textDecoration: 'none', display: 'block', marginBottom: 14 }}>
          <div style={{ background: '#111110', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flexShrink: 0 }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(245,240,234,0.4)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Global Rank</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 52, fontWeight: 900, color: tierColor, lineHeight: 1 }}>#{userRank}</p>
            </div>
            <div style={{ flex: 1, borderLeft: '1px solid rgba(245,240,234,0.08)', paddingLeft: 16 }}>
              {pointsToPassAbove !== null && pointsToPassAbove > 0 ? (
                <>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#F5F0EA', marginBottom: 6, lineHeight: 1.3 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: tierColor }}>{pointsToPassAbove.toLocaleString()}</span>
                    <span style={{ color: 'rgba(245,240,234,0.6)', fontWeight: 400 }}> pts to #{userRank - 1}</span>
                  </p>
                  <div style={{ height: 4, background: 'rgba(245,240,234,0.1)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${Math.max(4, 100 - Math.min((pointsToPassAbove / Math.max(user.points_lifetime_earned, 1)) * 200, 94))}%`, background: tierColor, borderRadius: 99 }} />
                  </div>
                  <p style={{ fontSize: 9, color: 'rgba(245,240,234,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Tap to view leaderboard →</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 20, marginBottom: 2 }}>🥇</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#F5F0EA' }}>You&apos;re #1!</p>
                  <p style={{ fontSize: 11, color: 'rgba(245,240,234,0.4)' }}>Keep it up</p>
                </>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* ── Next reward — warm gradient ── */}
      {nextReward && (
        <Link href="/rewards" style={{ textDecoration: 'none', display: 'block', marginBottom: 14 }}>
          <div style={{ background: `linear-gradient(135deg, ${tierColor} 0%, #C2410C 100%)`, borderRadius: 16, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -16, right: -12, fontSize: 90, opacity: 0.1, lineHeight: 1, transform: 'rotate(15deg)' }}>🎁</div>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>Next Reward</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: 'Archivo, sans-serif', marginBottom: 10, position: 'relative' }}>{nextReward.name}</p>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${Math.min((user.points_balance / nextReward.points_cost) * 100, 100)}%`, background: '#fff', borderRadius: 99 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, color: '#fff', fontSize: 14 }}>
                  {(nextReward.points_cost - user.points_balance).toLocaleString()}
                </span> pts away
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
                {user.points_balance.toLocaleString()} / {nextReward.points_cost.toLocaleString()}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* ── Tier progress ── */}
      <div style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1.5 }}>Tier Progress</p>
          <Link href="/rank" style={{ fontSize: 11, color: tierColor, fontWeight: 700, textDecoration: 'none' }}>View rank ›</Link>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <StatCard label="Sessions" value={user.lifetime_sessions} unit="total" accent={tierColor} />
          <StatCard label="Streak" value={user.current_streak} unit="days" accent={tierColor} />
          <StatCard label="Best" value={user.longest_streak} unit="days" accent={tierColor} />
        </div>
        <div style={{ height: 5, background: '#F5F0EA', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: tierColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
        </div>
        {next && (
          <p style={{ fontSize: 11, color: '#8A8478', marginTop: 5 }}>
            {sessionsNeeded} more sessions to <span style={{ color: tierColor, fontWeight: 700 }}>{next}</span>
          </p>
        )}
      </div>

      {/* Referral — enhanced CTA */}
      {user.referral_code && (
        <div style={{ background: 'linear-gradient(135deg, #1C1209 0%, #111110 40%, #0E0E0D 100%)', border: '1.5px solid rgba(181,89,60,0.25)', borderRadius: 18, padding: '20px 18px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(181,89,60,0.20) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(181,89,60,0.10) 0%, transparent 70%)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(181,89,60,0.15)', border: '1.5px solid rgba(181,89,60,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤝</div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 900, color: '#F5F0EA', fontFamily: "'Archivo', sans-serif", lineHeight: 1.1 }}>Invite a Friend</p>
                <p style={{ fontSize: 11, color: '#B5593C', fontWeight: 700 }}>You BOTH earn bonus coins</p>
              </div>
            </div>
            <div style={{ background: 'rgba(181,89,60,0.08)', border: '1px solid rgba(181,89,60,0.15)', borderRadius: 12, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'rgba(245,240,234,0.5)' }}>You get</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 900, color: '#22c55e' }}>+500</span>
              <span style={{ fontSize: 13, color: 'rgba(245,240,234,0.3)' }}>&</span>
              <span style={{ fontSize: 13, color: 'rgba(245,240,234,0.5)' }}>they get</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 900, color: '#22c55e' }}>+500</span>
            </div>
            {referralCount > 0 && (
              <p style={{ fontSize: 11, color: '#8A8478', textAlign: 'center', marginBottom: 10 }}>
                {referralCount} friend{referralCount !== 1 ? 's' : ''} joined so far — keep going!
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleShare} style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg, #B5593C 0%, #D4734F 100%)', color: '#F5F0EA', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: "'Archivo', sans-serif" }}>
                {copied ? '✓ Copied!' : 'Share Invite Link'}
              </button>
              <Link href="/invite" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '13px 16px', background: 'rgba(181,89,60,0.12)', border: '1.5px solid rgba(181,89,60,0.25)', borderRadius: 12, color: '#B5593C', fontSize: 13, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Details →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent workouts */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1.5 }}>Recent</p>
          <Link href="/log" style={{ fontSize: 11, color: '#B5593C', fontWeight: 700, textDecoration: 'none' }}>Log workout ›</Link>
        </div>
        {recentWorkouts.length === 0 ? (
          <div style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: 32, marginBottom: 6 }}>🏋️</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#F5F0EA', marginBottom: 4 }}>No workouts yet</p>
            <p style={{ fontSize: 12, color: '#8A8478' }}>Log your first session to start earning points</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentWorkouts.slice(0, 5).map(w => (
              <div key={w.id} style={{ background: '#111110', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: tierColor + '15', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 900, color: tierColor }}>{workoutAbbr(w.type)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#F5F0EA', marginBottom: 1 }}>{w.custom_name || w.type.replace('_', ' ')}</p>
                  <p style={{ fontSize: 11, color: '#8A8478' }}>{formatDate(w.logged_at)} · {w.duration_minutes}min</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 900, color: tierColor }}>+{w.total_points_earned}</p>
                  <p style={{ fontSize: 10, color: w.verified ? '#22c55e' : '#f59e0b' }}>{w.verified ? 'verified' : 'unverified'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Share stats */}
      <button onClick={handleShareStats} style={{ width: '100%', background: 'linear-gradient(135deg, #111110 0%, #1e1e1c 100%)', border: '1.5px solid #333', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginTop: 6 }}>
        <span style={{ fontSize: 24 }}>📊</span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#F5F0EA', fontFamily: 'Archivo, sans-serif', marginBottom: 2 }}>Share your stats</p>
          <p style={{ fontSize: 11, color: 'rgba(245,240,234,0.45)' }}>Show off your streak &amp; progress</p>
        </div>
        <span style={{ fontSize: 18, color: 'rgba(245,240,234,0.3)' }}>›</span>
      </button>

    </div>
  )
}

function StatCard({ label, value, unit, accent }: { label: string; value: number; unit: string; accent: string }) {
  return (
    <div style={{ flex: 1, background: '#1A1A18', border: '1.5px solid rgba(245,240,234,0.08)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
      <p style={{ fontSize: 9, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{label}</p>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color: accent, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 9, color: '#8A8478', marginTop: 2 }}>{unit}</p>
    </div>
  )
}

function TierIcon({ tier, color }: { tier: string; color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={color}>
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>
  )
}

function workoutAbbr(type: string) {
  const map: Record<string, string> = { push:'PSH', pull:'PUL', legs:'LEG', upper:'UPR', lower:'LWR', full_body:'FBD', cardio:'CDO', hiit:'HIT', custom:'CST' }
  return map[type] ?? type.slice(0,3).toUpperCase()
}

function formatDate(iso: string) {
  const d = new Date(iso); const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
