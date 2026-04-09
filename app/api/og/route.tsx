import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const TIER_COLORS: Record<string, string> = {
  bronze:   '#B5593C',
  silver:   '#6B7280',
  gold:     '#D97706',
  platinum: '#7C3AED',
}

const TIER_LABELS: Record<string, string> = {
  bronze:   'Bronze',
  silver:   'Silver',
  gold:     'Gold',
  platinum: 'Platinum',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name     = searchParams.get('name')     ?? 'COUNT Member'
  const tier     = searchParams.get('tier')     ?? 'bronze'
  const streak   = searchParams.get('streak')   ?? '0'
  const sessions = searchParams.get('sessions') ?? '0'
  const points   = searchParams.get('points')   ?? '0'

  const color      = TIER_COLORS[tier]  ?? '#B5593C'
  const tierLabel  = TIER_LABELS[tier]  ?? 'Bronze'
  const ptsDisplay = Number(points).toLocaleString()

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#0E0E0D',
          padding: '52px 56px',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: color, opacity: 0.18, display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: color, opacity: 0.10, display: 'flex' }} />

        {/* App wordmark */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 36 }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: '#F5F0EA', letterSpacing: -1 }}>COUNT</span>
          <span style={{ fontSize: 12, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 3 }}>fitness</span>
        </div>

        {/* Name */}
        <div style={{ fontSize: 52, fontWeight: 900, color: '#F5F0EA', letterSpacing: -2, lineHeight: 1, marginBottom: 12, display: 'flex' }}>
          {name}
        </div>

        {/* Tier badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 44 }}>
          <div style={{
            fontSize: 13, fontWeight: 800, color: color,
            textTransform: 'uppercase', letterSpacing: 2,
            background: color + '22', padding: '5px 16px',
            borderRadius: 20, border: `1px solid ${color}44`,
            display: 'flex',
          }}>
            {tierLabel}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, flex: 1 }}>
          {[
            { label: '🔥 Day Streak', value: streak,     accent: '#F5F0EA' },
            { label: '💪 Sessions',   value: sessions,   accent: '#F5F0EA' },
            { label: '💰 Points',     value: ptsDisplay, accent: color     },
          ].map(stat => (
            <div
              key={stat.label}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 18, padding: '22px 26px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span style={{ fontSize: 52, fontWeight: 900, color: stat.accent, lineHeight: 1, display: 'flex' }}>{stat.value}</span>
              <span style={{ fontSize: 13, color: '#8A8478', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 10, display: 'flex' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Footer URL */}
        <div style={{ position: 'absolute', bottom: 44, right: 56, fontSize: 14, color: '#8A8478', display: 'flex' }}>
          countfitness.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
