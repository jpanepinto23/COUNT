'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { getTierLabel, getTierMultiplier, getNextTierSessions } from '@/lib/points'
import type { Workout } from '@/lib/types'

const TIER_COLORS: Record<string, string> = {
  bronze:   '#B5593C',
  silver:   '#6B7280',
  gold:     '#D97706',
  platinum: '#7C3AED',
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const POINTS_CARD_PHOTO = 'https://images.pexels.com/photos/1552249/pexels-photo-1552249.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&dpr=1'

export default function HomePage() {
  const { user, refreshUser } = useAuth()
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([])
  const [referralCount, setReferralCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setRecentWorkouts(data) })

    // Fetch referral count
    if (user.referral_code) {
      supabase
        .from('referrals')
        .select('id', { count: 'exact' })
        .eq('referrer_id', user.id)
        .then(({ count }) => { if (count !== null) setReferralCount(count) })
    }

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
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return d
  })
  const workedOutDates = new Set(
    recentWorkouts.map(w => new Date(w.logged_at).toDateString())
  )

  const referralLink = `https://count-fitness-app.vercel.app/auth/signup?ref=${user.referral_code ?? ''}`

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on COUNT',
          text: `I've been earning points every time I work out. Join COUNT with my code ${user.referral_code} and we both get 500 bonus points! 💪`,
          url: referralLink,
        })
      } catch {}
    } else {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 8 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ color: '#8A8478', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            {greeting()}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif' }}>
            {user.name.split(' ')[0]}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/rank" style={{ textDecoration: 'none' }}>
            <div style={{ background: tierColor + '18', border: `1.5px solid ${tierColor}`, borderRadius: 20, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <TierIcon tier={tier} color={tierColor} />
              <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 12, fontWeight: 800, color: tierColor, textTransform: 'uppercase', letterSpacing: 1 }}>
                {getTierLabel(tier)}
              </span>
            </div>
          </Link>
          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: tierColor + '18', border: `1.5px solid ${tierColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Archivo, sans-serif', fontSize: 13, fontWeight: 900, color: tierColor }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          </Link>
        </div>
      </div>

      {/* Points card */}
      <div style={{
        backgroundImage: `url(${POINTS_CARD_PHOTO})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 40%',
        borderRadius: 16,
        padding: '20px',
        marginBottom: 14,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,9,0.82)', borderRadius: 16 }} />
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: '#B5593C', opacity: 0.12 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Points Balance</p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 38, fontWeight: 900, color: '#F5F0EA', lineHeight: 1, marginBottom: 8 }}>
            {user.points_balance.toLocaleString()}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#8A8478', fontSize: 12 }}>
              {user.points_lifetime_earned.toLocaleString()} earned all time
            </p>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#B5593C', fontWeight: 700 }}>
              {getTierMultiplier(tier)}x
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <StatCard label="Streak"   value={user.current_streak}    unit="days"  accent="#B5593C" />
        <StatCard label="Sessions" value={user.lifetime_sessions}  unit="total" accent="#111110" />
        <StatCard label="Best"     value={user.longest_streak}     unit="days"  accent="#111110" />
      </div>

      {/* ── INVITE A FRIEND ── prominent, dark card, same visual weight as Log */}
      <div style={{ background: '#111110', borderRadius: 16, padding: '18px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        {/* Rust accent blobs */}
        <div style={{ position: 'absolute', top: -24, right: -24, width: 90, height: 90, borderRadius: '50%', background: '#B5593C', opacity: 0.18 }} />
        <div style={{ position: 'absolute', bottom: -16, left: -16, width: 60, height: 60, borderRadius: '50%', background: '#B5593C', opacity: 0.10 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 3 }}>Invite a Friend</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#F5F0EA', fontFamily: 'Archivo, sans-serif', lineHeight: 1.2 }}>
                Give 500 pts.<br />Get 500 pts.
              </p>
            </div>
            <div style={{ background: '#B5593C', borderRadius: 10, padding: '6px 8px', fontSize: 18 }}>🔗</div>
          </div>

          {/* Referral code pill */}
          <div style={{ background: 'rgba(245,240,234,0.07)', border: '1px solid rgba(245,240,234,0.12)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 900, color: '#F5F0EA', letterSpacing: 4 }}>
              {user.referral_code ?? '------'}
            </span>
            <span style={{ fontSize: 11, color: '#8A8478', fontFamily: 'Archivo, sans-serif' }}>
              {referralCount} {referralCount === 1 ? 'friend' : 'friends'} joined
            </span>
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            style={{ width: '100%', padding: '12px', background: '#B5593C', color: '#F5F0EA', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Archivo, sans-serif', letterSpacing: 0.3 }}
          >
            {copied ? '✓ Link Copied!' : 'Share Your Link →'}
          </button>
        </div>
      </div>

      {/* Weekly view */}
      <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>This Week</p>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#B5593C', fontWeight: 700 }}>
            🔥 {user.current_streak} streak
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {week.map((d, i) => {
            const isToday  = d.toDateString() === today.toDateString()
            const done     = workedOutDates.has(d.toDateString())
            const isFuture = d > today
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: isToday ? '#B5593C' : '#8A8478', textTransform: 'uppercase' }}>
                  {DAY_LABELS[d.getDay()]}
                </span>
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: 8, background: done ? '#B5593C' : isFuture ? '#EDEBE5' : '#FEE2E2', border: isToday && !done ? '1.5px dashed #B5593C' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {done && <span style={{ color: '#F5F0EA', fontSize: 10, fontWeight: 900 }}>✓</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tier progress */}
      {next && (
        <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Tier Progress</p>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#8A8478' }}>
              {sessionsNeeded} sessions to {getTierLabel(next)}
            </span>
          </div>
          <div style={{ height: 6, background: '#EDEBE5', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: tierColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#8A8478' }}>
              {getTierLabel(tier)}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: TIER_COLORS[next] }}>
              {getTierLabel(next)} {getTierMultiplier(next)}x
            </span>
          </div>
        </div>
      )}

      {/* Recent workouts */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Recent Sessions</p>
        </div>
        {recentWorkouts.length === 0 ? (
          <div style={{ background: '#fff', border: '1.5px dashed #E0D9CE', borderRadius: 14, padding: 24, textAlign: 'center' }}>
            <p style={{ color: '#8A8478', fontSize: 14, marginBottom: 8 }}>No sessions yet.</p>
            <Link href="/log" style={{ display: 'inline-block', background: '#B5593C', color: '#F5F0EA', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
              Log Your First Session →
            </Link>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, overflow: 'hidden' }}>
            {recentWorkouts.map((w, i) => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: i > 0 ? '1px solid #F0EDE6' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FDF5F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 900, color: '#B5593C', textTransform: 'uppercase' }}>
                    {workoutAbbr(w.type)}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{w.type.replace('_', ' ')}</p>
                    <p style={{ fontSize: 11, color: '#8A8478' }}>{w.duration_minutes}min · {formatDate(w.logged_at)}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 900, color: '#B5593C' }}>
                    +{w.total_points_earned}
                  </p>
                  <p style={{ fontSize: 10, color: w.verified ? '#22c55e' : '#f59e0b' }}>
                    {w.verified ? '✓ verified' : '⚠ unverified'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

function StatCard({ label, value, unit, accent }: { label: string; value: number; unit: string; accent: string }) {
  return (
    <div style={{ flex: 1, background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
      <p style={{ fontSize: 9, fontWeight: 800, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 900, color: accent, lineHeight: 1 }}>{value}</p>
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
  const map: Record<string, string> = {
    push: 'PSH', pull: 'PUL', legs: 'LEG', upper: 'UPR',
    lower: 'LWR', full_body: 'FBD', cardio: 'CDO', hiit: 'HIT', custom: 'CST',
  }
  return map[type] ?? type.slice(0, 3).toUpperCase()
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
