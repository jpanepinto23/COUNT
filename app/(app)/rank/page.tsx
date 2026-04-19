'use client'

import { useAuth } from '@/lib/auth-context'
import { getTier, getTierLabel, getTierMultiplier, getNextTierSessions } from '@/lib/points'
import Icon from '@/components/Icon'

const TIERS = [
  { key: 'bronze',   label: 'Bronze',   range: '0–29 sessions',   multiplier: '1.0x', color: '#B5593C', perks: ['Base points', '1x multiplier', 'Access to all rewards'] },
  { key: 'silver',   label: 'Silver',   range: '30–59 sessions',  multiplier: '1.5x', color: '#6B7280', perks: ['1.5x point multiplier', 'Priority reward access', 'Streak badges'] },
  { key: 'gold',     label: 'Gold',     range: '60–119 sessions', multiplier: '2.0x', color: '#D97706', perks: ['2.0x point multiplier', 'Exclusive gold rewards', 'Monthly bonus points'] },
  { key: 'platinum', label: 'Platinum', range: '120+ sessions',   multiplier: '3.0x', color: '#7C3AED', perks: ['3.0x point multiplier', 'Platinum-only rewards', 'Top 3 leaderboard bonus'] },
]

const MILESTONES = [
  { sessions: 1,   icon: 'Rocket', label: 'First Rep',      color: '#4ADE80' },
  { sessions: 5,   icon: 'Flame', label: 'On Fire',        color: '#FB923C' },
  { sessions: 10,  icon: 'Dumbbell', label: 'Getting Strong', color: '#B5593C' },
  { sessions: 25,  icon: 'Target', label: 'Dedicated',      color: '#D97706' },
  { sessions: 50,  icon: 'Zap', label: 'Powerhouse',     color: '#6B7280' },
  { sessions: 100, icon: 'Crown', label: 'Legend',         color: '#7C3AED' },
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
    ? Math.min(100, ((user.lifetime_sessions - start) / (threshold - start)) * 100)
    : 100

  const currentTierData = TIERS.find(t => t.key === tier)!
  const earnedMilestones = MILESTONES.filter(m => user.lifetime_sessions >= m.sessions)
  const nextMilestone = MILESTONES.find(m => user.lifetime_sessions < m.sessions)

  return (
    <div className="min-h-screen bg-[#0E0E0D] text-white pb-28">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-white/40 mb-1">Your rank</p>
        <h1 className="text-3xl font-black tracking-tight">Progress</h1>
      </div>

      {/* Current Tier Hero */}
      <div className="mx-5 mb-5">
        <div
          className="rounded-2xl p-6 border"
          style={{
            background: `linear-gradient(135deg, ${currentTierData.color}22 0%, #0E0E0D 100%)`,
            borderColor: `${currentTierData.color}44`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div
                className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-2"
                style={{ background: `${currentTierData.color}33`, color: currentTierData.color }}
              >
                {currentTierData.label}
              </div>
              <div className="text-4xl font-black">{user.lifetime_sessions}</div>
              <div className="text-sm text-white/50">lifetime sessions</div>
            </div>
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl border"
              style={{ background: `${currentTierData.color}22`, borderColor: `${currentTierData.color}44` }}
            >
              {tier === 'bronze' ? <Icon emoji="Award" size={40} /> : tier === 'silver' ? <Icon emoji="Medal" size={40} /> : tier === 'gold' ? <Icon emoji="Trophy" size={40} /> : <Icon emoji="Crown" size={40} />}
            </div>
          </div>

          {/* Progress bar */}
          {next ? (
            <div>
              <div className="flex justify-between text-xs text-white/50 mb-2">
                <span>{user.lifetime_sessions} sessions</span>
                <span>{sessionsNeeded} more to {getTierLabel(next)}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${currentTierData.color}, ${TIERS.find(t => t.key === next)?.color ?? currentTierData.color})`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm font-semibold" style={{ color: currentTierData.color }}>
              ✓ Max tier reached
            </div>
          )}
        </div>
      </div>

      {/* Multiplier badge */}
      <div className="mx-5 mb-5">
        <div className="bg-[#1A1A18] border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-white/50 uppercase tracking-widest font-semibold mb-1">Point Multiplier</div>
            <div className="text-2xl font-black" style={{ color: currentTierData.color }}>{tierMultiplier}x</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/50 mb-1">Earning rate</div>
            <div className="text-sm text-white/80">
              Every session earns<br />
              <span className="font-bold text-white">{tierMultiplier}x base points</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tier perks */}
      <div className="mx-5 mb-5">
        <h2 className="text-xs font-semibold tracking-[0.15em] uppercase text-white/40 mb-3">Current perks</h2>
        <div className="bg-[#1A1A18] border border-white/[0.08] rounded-2xl overflow-hidden">
          {currentTierData.perks.map((perk, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: i < currentTierData.perks.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: currentTierData.color }}
              />
              <span className="text-sm text-white/80">{perk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* All tiers */}
      <div className="mx-5 mb-5">
        <h2 className="text-xs font-semibold tracking-[0.15em] uppercase text-white/40 mb-3">All tiers</h2>
        <div className="flex flex-col gap-3">
          {TIERS.map(t => {
            const isActive = t.key === tier
            const isPast = TIERS.findIndex(x => x.key === tier) > TIERS.findIndex(x => x.key === t.key)
            return (
              <div
                key={t.key}
                className="rounded-2xl p-4 border flex items-center gap-4"
                style={{
                  background: isActive ? `${t.color}18` : '#1A1A18',
                  borderColor: isActive ? `${t.color}55` : 'rgba(255,255,255,0.06)',
                  opacity: !isActive && !isPast ? 0.5 : 1,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border flex-shrink-0"
                  style={{ background: `${t.color}22`, borderColor: `${t.color}44` }}
                >
                  {t.key === 'bronze' ? <Icon emoji="Award" size={20} /> : t.key === 'silver' ? <Icon emoji="Medal" size={20} /> : t.key === 'gold' ? <Icon emoji="Trophy" size={20} /> : <Icon emoji="Crown" size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-sm" style={{ color: isActive ? t.color : isPast ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' }}>
                      {t.label}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${t.color}33`, color: t.color }}>
                        Current
                      </span>
                    )}
                    {isPast && (
                      <span className="text-[10px] text-white/30">✓ Completed</span>
                    )}
                  </div>
                  <div className="text-xs text-white/40">{t.range} · {t.multiplier}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Milestones */}
      <div className="mx-5 mb-5">
        <h2 className="text-xs font-semibold tracking-[0.15em] uppercase text-white/40 mb-3">Milestones</h2>
        <div className="grid grid-cols-3 gap-3">
          {MILESTONES.map(m => {
            const earned = user.lifetime_sessions >= m.sessions
            return (
              <div
                key={m.sessions}
                className="rounded-2xl p-4 border text-center"
                style={{
                  background: earned ? `${m.color}18` : '#1A1A18',
                  borderColor: earned ? `${m.color}44` : 'rgba(255,255,255,0.06)',
                  opacity: earned ? 1 : 0.45,
                }}
              >
                <div className="text-3xl mb-2 flex justify-center">
                  {earned ? <Icon emoji={m.icon} size={32} /> : <Icon emoji="Lock" size={32} />}
                </div>
                <div className="text-[10px] font-bold tracking-wide" style={{ color: earned ? m.color : 'rgba(255,255,255,0.3)' }}>
                  {m.label}
                </div>
                <div className="text-[10px] text-white/30 mt-0.5">{m.sessions} sessions</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Next milestone callout */}
      {nextMilestone && (
        <div className="mx-5 mb-5">
          <div
            className="rounded-2xl p-4 border flex items-center gap-4"
            style={{ background: `${nextMilestone.color}12`, borderColor: `${nextMilestone.color}33` }}
          >
            <div className="text-3xl flex"><Icon emoji={nextMilestone.icon} size={32} /></div>
            <div>
              <div className="text-sm font-bold text-white/90">Next: {nextMilestone.label}</div>
              <div className="text-xs text-white/50">
                {nextMilestone.sessions - user.lifetime_sessions} more session{nextMilestone.sessions - user.lifetime_sessions !== 1 ? 's' : ''} to unlock
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  
)=


  'window._fullB64 stored";
