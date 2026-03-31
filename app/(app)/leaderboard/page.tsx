'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { getTierLabel } from '@/lib/points'
import type { LeaderboardEntry } from '@/lib/types'

const TIER_COLORS: Record<string, string> = {
  bronze: '#B5593C', silver: '#6B7280', gold: '#D97706', platinum: '#7C3AED',
}

const CROWN = ['👑', '🥈', '🥉']

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const resetDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('leaderboard')
        .select('user_id, month, points_earned_this_month, rank, users (name, current_streak, tier)')
        .eq('month', currentMonth)
        .order('points_earned_this_month', { ascending: false })
        .limit(50)
      if (data) {
        const enriched = data.map((row: any, i: number) => ({
          user_id: row.user_id,
          month: row.month,
          points_earned_this_month: row.points_earned_this_month,
          rank: i + 1,
          name: row.users?.name ?? 'Anonymous',
          current_streak: row.users?.current_streak ?? 0,
          tier: row.users?.tier ?? 'bronze',
        }))
        setEntries(enriched)
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  const userEntry = entries.find(e => e.user_id === user?.id)
  const podium = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div style={{ background: '#0E0E0D', minHeight: '100dvh', paddingBottom: 100 }}>
      {/* Dark header */}
      <div style={{ padding: '20px 16px 0' }}>
        <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Leaderboard</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif', color: '#F5F0EA' }}>{monthLabel}</h1>
          <p style={{ fontSize: 11, color: '#8A8478' }}>Resets {resetDate}</p>
        </div>
      </div>

      {/* Your position pill */}
      {userEntry && (
        <div style={{ margin: '12px 16px', background: 'rgba(181,89,60,0.15)', border: '1px solid rgba(181,89,60,0.35)', borderRadius: 14, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#8A8478', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Your Rank</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 26, fontWeight: 900, color: '#F5F0EA', lineHeight: 1 }}>#{userEntry.rank}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color: '#B5593C' }}>{userEntry.points_earned_this_month.toLocaleString()}</p>
            <p style={{ color: '#8A8478', fontSize: 11 }}>pts this month</p>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8A8478' }}>Loading...</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🏆</p>
          <p style={{ fontWeight: 800, color: '#F5F0EA', marginBottom: 6 }}>No entries yet</p>
          <p style={{ color: '#8A8478', fontSize: 14 }}>Be the first to log a session this month!</p>
        </div>
      ) : (
        <>
          {/* Stepping Podium */}
          {podium.length > 0 && (
            <div style={{ padding: '20px 16px 0' }}>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 16 }}>Top 3</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                {(podium.length >= 3 ? [podium[1], podium[0], podium[2]] : podium).map((e) => {
                  const isFirst = e.rank === 1
                  const isUser = e.user_id === user?.id
                  const tc = TIER_COLORS[e.tier] ?? '#B5593C'
                  const barH = e.rank === 1 ? 100 : e.rank === 2 ? 76 : 60
                  const cardGrad = isFirst
                    ? 'linear-gradient(160deg, rgba(181,89,60,0.70) 0%, rgba(181,89,60,0.25) 100%)'
                    : 'linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)'
                  return (
                    <div key={e.user_id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '100%',
                        background: cardGrad,
                        border: '1.5px solid ' + (isFirst ? 'rgba(181,89,60,0.5)' : 'rgba(255,255,255,0.08)'),
                        borderRadius: '14px 14px 0 0',
                        padding: '16px 8px 12px',
                        textAlign: 'center',
                        position: 'relative',
                      }}>
                        {isUser && <div style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#B5593C' }} />}
                        <div style={{ fontSize: isFirst ? 28 : 20, marginBottom: 6 }}>{CROWN[e.rank - 1]}</div>
                        <p style={{ fontSize: 12, fontWeight: 800, color: '#F5F0EA', marginBottom: 2 }}>
                          {isUser ? 'You' : e.name.split(' ')[0]}
                        </p>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: isFirst ? 15 : 12, fontWeight: 900, color: isFirst ? '#F5F0EA' : '#B5593C' }}>
                          {e.points_earned_this_month.toLocaleString()}
                        </p>
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>pts</p>
                        <div style={{ marginTop: 4 }}>
                          <span style={{ fontSize: 9, color: tc, fontWeight: 800 }}>{getTierLabel(e.tier)}</span>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: barH, background: isFirst ? 'rgba(181,89,60,0.2)' : 'rgba(255,255,255,0.04)', borderRadius: '0 0 8px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 10 }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 900, color: isFirst ? '#B5593C' : '#4B4B46' }}>
                          #{e.rank}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Rest of list */}
          {rest.length > 0 && (
            <div style={{ margin: '16px 16px 0' }}>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 10 }}>Rankings</p>
              <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                {rest.map((e, i) => {
                  const isUser = e.user_id === user?.id
                  const tc = TIER_COLORS[e.tier] ?? '#B5593C'
                  return (
                    <div key={e.user_id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                      borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      background: isUser ? 'rgba(181,89,60,0.12)' : 'rgba(255,255,255,0.03)',
                    }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: '#4B4B46', width: 28, textAlign: 'center' }}>#{e.rank}</span>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: tc, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: isUser ? '#B5593C' : '#F5F0EA' }}>
                          {isUser ? 'You' : e.name.split(' ')[0] + ' ' + (e.name.split(' ')[1]?.[0] ?? '') + '.'}
                        </p>
                        <p style={{ fontSize: 11, color: '#8A8478' }}>🔥 {e.current_streak} · {getTierLabel(e.tier)}</p>
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 900, color: isUser ? '#B5593C' : '#F5F0EA' }}>
                        {e.points_earned_this_month.toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
