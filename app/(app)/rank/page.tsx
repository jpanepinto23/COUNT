 'use client'

import { useAuth } from '@/lib/auth-context'
import { getTier, getTierLabel, getTierMultiplier, getNextTierSessions } from '@/lib/points'

const TIERS = [
  { key: 'bronze', label: 'Bronze', range: '0–29 sessions', multiplier: '1.0x', color: '#B5593C', perks: ['Base points', '1x multiplier', 'Access to all rewards'] },
  { key: 'silver', label: 'Silver', range: '30–59 sessions', multiplier: '1.5x', color: '#6B7280', perks: ['1.5x point multiplier', 'Priority reward access', 'Streak badges'] },
  { key: 'gold', label: 'Gold', range: '60–119 sessions', multiplier: '2.0x', color: '#D97706', perks: ['2.0x point multiplier', 'Exclusive gold rewards', 'Monthly bonus points'] },
  { key: 'platinum', label: 'Platinum', range: '120+ sessions', multiplier: '3.0x', color: '#7C3AED', perks: ['3.0x point multiplier', 'Platinum-only rewards', 'Top 3 leaderboard bonus'] },
]

const MILESTONES = [
  { sessions: 1,   emoji: '🌱', label: 'First Rep',      color: '#4ADE80' },
  { sessions: 5,   emoji: '🔥', label: 'On Fire',        color: '#FB923C' },
  { sessions: 10,  emoji: '💪', label: 'Getting Strong', color: '#B5593C' },
  { sessions: 25,  emoji: '🏅', label: 'Dedicated',      color: '#D97706' },
  { sessions: 50,  emoji: '⚡', label: 'Powerhouse',     color: '#6B7280' },
  { sessions: 100, emoji: '🏆', label: 'Legend',         color: '#7C3AED' },
]

export default function RankPage() {
  const { user } = useAuth()

  if (!user) return null

  const tier = getTier(user.lifetime_sessions)
  const tierMultiplier = getTierMultiplier(tier)
  const { next, sessionsNeeded, threshold } = getNextTierSessions(user.lifetime_sessions)

  const tierStart: Record<string, number> = { bronze: 0, silver: 30, gold: 60, platinum: 120 }
  const start = tierStart[tier]
  const progress = next
    ? ((user.lifetime_sessions - start) / (threshold - start)) * 100
    : 100

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Header */}
      <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Your Rank</p>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif', marginBottom: 20 }}>Tier Status</h1>

      {/* Current tier card */}
      <div style={{
        background: '#111110',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 120, height: 120, borderRadius: '50%',
          background: TIERS.find(t => t.key === tier)?.color,
          opacity: 0.2,
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Current Tier</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TierStar color={TIERS.find(t => t.key === tier)?.color ?? '#B5593C'} size={24} />
              <h2 style={{
                fontFamily: 'Archivo, sans-serif',
                fontSize: 28,
                fontWeight: 900,
                color: TIERS.find(t => t.key === tier)?.color,
                letterSpacing: -1,
              }}>
                {getTierLabel(tier)}
              </h2>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#8A8478', fontSize: 11, marginBottom: 4 }}>Multiplier</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 32, fontWeight: 900, color: '#F5F0EA', lineHeight: 1 }}>
              {tierMultiplier}x
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ color: '#8A8478', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>All-Time Sessions</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 900, color: '#F5F0EA' }}>{user.lifetime_sessions}</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ color: '#8A8478', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Best Streak</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 900, color: '#F5F0EA' }}>{user.longest_streak}</p>
          </div>
        </div>

        {/* Progress to next */}
        {next && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ color: '#8A8478', fontSize: 11 }}>{sessionsNeeded} sessions to {getTierLabel(next)}</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#F5F0EA' }}>
                {user.lifetime_sessions}/{threshold}
              </p>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(progress, 100)}%`,
                background: TIERS.find(t => t.key === next)?.color ?? '#B5593C',
                borderRadius: 3,
              }} />
            </div>
          </div>
        )}
        {!next && (
          <div style={{
            background: 'rgba(124,58,237,0.2)',
            borderRadius: 10,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>👑</span>
            <p style={{ fontSize: 13, color: '#F5F0EA', fontWeight: 700 }}>You&apos;ve reached the highest tier!</p>
          </div>
        )}
      </div>

      {/* All tiers */}
      <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 12 }}>All Tiers</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {TIERS.map(t => {
          const isCurrentTier = t.key === tier
          const isPastTier = TIERS.indexOf(t) < TIERS.findIndex(ti => ti.key === tier)
          return (
            <div key={t.key} style={{
              background: '#fff',
              border: `1.5px solid ${isCurrentTier ? t.color : '#E0D9CE'}`,
              borderRadius: 14,
              padding: '14px 16px',
              opacity: isPastTier ? 0.6 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCurrentTier ? 10 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <TierStar color={t.color} size={18} filled={isCurrentTier || isPastTier} />
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 900, fontFamily: 'Archivo, sans-serif', color: isCurrentTier ? t.color : '#111110' }}>
                      {t.label}
                      {isCurrentTier && <span style={{ fontSize: 10, background: t.color + '18', color: t.color, padding: '2px 8px', borderRadius: 10, marginLeft: 8, fontWeight: 700 }}>CURRENT</span>}
                    </p>
                    <p style={{ fontSize: 11, color: '#8A8478' }}>{t.range}</p>
                  </div>
                </div>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 18,
                  fontWeight: 900,
                  color: t.color,
                }}>
                  {t.multiplier}
                </span>
              </div>
              {isCurrentTier && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {t.perks.map(perk => (
                    <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: t.color, fontSize: 12 }}>✓</span>
                      <span style={{ fontSize: 12, color: '#8A8478' }}>{perk}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Lifetime stats */}
      <div style={{
        background: '#fff',
        border: '1.5px solid #E0D9CE',
        borderRadius: 14,
        padding: '14px 16px',
        marginTop: 16,
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <Stat label="Total Earned" value={user.points_lifetime_earned.toLocaleString() + ' pts'} />
        <div style={{ width: 1, background: '#E0D9CE' }} />
        <Stat label="Redeemed" value={((user.points_lifetime_earned - user.points_balance)).toLocaleString() + ' pts'} />
        <div style={{ width: 1, background: '#E0D9CE' }} />
        <Stat label="Balance" value={user.points_balance.toLocaleString() + ' pts'} accent="#B5593C" />
      </div>
  
      {/* Trophy Room */}
      <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 12, marginTop: 20 }}>Trophy Room</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {MILESTONES.map(m => {
          const unlocked = user.lifetime_sessions >= m.sessions
          return (
            <div key={m.sessions} style={{ background: unlocked ? '#111110' : 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '14px 10px', textAlign: 'center', border: `1.5px solid ${unlocked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`, opacity: unlocked ? 1 : 0.5, position: 'relative', overflow: 'hidden' }}>
              {unlocked && <div style={{ position: 'absolute', top: -12, right: -12, width: 48, height: 48, borderRadius: '50%', background: m.color, opacity: 0.2 }} />}
              <span style={{ fontSize: 28, filter: unlocked ? 'none' : 'grayscale(1)' }}>{m.emoji}</span>
              <p style={{ fontFamily: "'Archivo', sans-serif", fontSize: 11, fontWeight: 900, color: unlocked ? '#F5F0EA' : '#8A8478', marginTop: 6, lineHeight: 1.2 }}>{m.label}</p>
              <p style={{ fontSize: 9, color: unlocked ? m.color : '#8A8478', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{m.sessions} sessions</p>
            </div>
          )
        })}
      </div>
  </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 900, color: accent ?? '#111110' }}>{value}</p>
    </div>
  )
}

function TierStar({ color, size, filled }: { color: string; size: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled !== false ? color : 'none'} stroke={color} strokeWidth="1.5">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>
  )
}
