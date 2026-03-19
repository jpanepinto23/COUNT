'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import { getTierLabel } from '@/lib/points'
import type { LeaderboardEntry } from '@/lib/types'

const TIER_COLORS: Record<string, string> = {
  bronze: '#B5593C', silver: '#6B7280', gold: '#D97706', platinum: '#7C3AED',
}

const PODIUM_MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  useEffect(() => {
    async function load() {
      // Get top 50 for current month, joined with user data
      const { data } = await supabase
        .from('leaderboard')
        .select(`
          user_id,
          month,
          points_earned_this_month,
          rank,
          users (name, current_streak, tier)
        `)
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
    <div style={{ padding: '20px 16px' }}>
      {/* Header */}
      <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Leaderboard</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, fontFamily: 'Archivo, sans-serif' }}>{monthLabel}</h1>
        <p style={{ fontSize: 11, color: '#8A8478' }}>Resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
      </div>

      {/* Your position */}
      {userEntry && (
        <div style={{
          background: '#111110',
          borderRadius: 14,
          padding: '14px 16px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ color: '#8A8478', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Your Rank</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 900, color: '#F5F0EA', lineHeight: 1 }}>
              #{userEntry.rank}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color: '#B5593C' }}>
              {userEntry.points_earned_this_month.toLocaleString()}
            </p>
            <p style={{ color: '#8A8478', fontSize: 11 }}>pts this month</p>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8A8478' }}>Loading...</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🏆</p>
          <p style={{ fontWeight: 800, marginBottom: 6 }}>No entries yet</p>
          <p style={{ color: '#8A8478', fontSize: 14 }}>Be the first to log a session this month!</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {podium.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8478', marginBottom: 10 }}>Top 3</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {podium.map((e, i) => (
                  <div key={e.user_id} style={{
                    flex: 1,
                    background: '#fff',
                    border: `1.5px solid ${e.user_id === user?.id ? '#B5593C' : '#E0D9CE'}`,
                    borderRadius: 14,
                    padding: '14px 10px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{PODIUM_MEDALS[i]}</div>
                    <p style={{
                      fontSize: 13,
                      fontWeight: 800,
                      marginBottom: 4,
                      color: e.user_id === user?.id ? '#B5593C' : '#111110',
                    }}>
                      {e.user_id === user?.id ? 'You' : e.name.split(' ')[0]}
                    </p>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 900, color: '#B5593C' }}>
                      {e.points_earned_this_month.toLocaleString()}
                    </p>
                    <p style={{ fontSize: 9, color: '#8A8478', marginTop: 2 }}>pts</p>
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 9, color: TIER_COLORS[e.tier], fontWeight: 800 }}>
                        {getTierLabel(e.tier)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rest of list */}
          {rest.length > 0 && (
            <div style={{ background: '#fff', border: '1.5px solid #E0D9CE', borderRadius: 14, overflow: 'hidden' }}>
              {rest.map((e, i) => (
                <div key={e.user_id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderTop: i > 0 ? '1px solid #F0EDE6' : 'none',
                  background: e.user_id === user?.id ? '#FDF5F1' : 'transparent',
                }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#8A8478',
                    width: 28,
                    textAlign: 'center',
                  }}>
                    #{e.rank}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: e.user_id === user?.id ? '#B5593C' : '#111110' }}>
                      {e.user_id === user?.id ? 'You' : e.name.split(' ')[0] + ' ' + (e.name.split(' ')[1]?.[0] ?? '') + '.'}
                    </p>
                    <p style={{ fontSize: 11, color: '#8A8478' }}>
                      🔥 {e.current_streak} · {getTierLabel(e.tier)}
                    </p>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 900, color: '#B5593C' }}>
                    {e.points_earned_this_month.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
