'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'
import type { Reward, RewardType } from '@/lib/types'
import { getStreakMultiplierLabel } from '@/lib/points'

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
}

// Per-brand accents for hero gradients (from handoff README)
const BRAND_ACCENT: Record<string, string> = {
  NOBULL: '#B5593C',
  Thorne: '#7a5f3a',
  Momentous: '#3b4b5a',
  Kane: '#6a8a6a',
  LMNT: '#a26a4b',
  AG1: '#1a3d2e',
  'Athletic Greens': '#1a3d2e',
  YoungLA: '#2a2a2a',
  Vuori: '#3a4a3a',
  'Ten Thousand': '#2a2a2a',
  Legends: '#4a3a2e',
  'Create Wellness': '#7a5f3a',
  Amazon: '#B5593C',
}
const accentFor = (brand: string) => BRAND_ACCENT[brand] || TOK.copper

// Local logo overrides (takes precedence is set via fallback || override pattern below)
const BRAND_LOGO_OVERRIDES: Record<string, string> = {
  NOBULL: '/nobull-logo-square.png',
}
function logoFor(brand: string, fallback?: string | null): string | undefined {
  return fallback || BRAND_LOGO_OVERRIDES[brand] || undefined
}

interface FulfillmentData {
  reward_type: RewardType
  fulfillment_value?: string
  affiliate_url?: string
}

// ===== Hero (Orbit style — 200px ring, big serif balance, satellite chips, week strip) =====
function Hero({
  coins,
  multiplier,
  workoutsDone,
  workoutsGoal = 5,
  streakDays,
}: {
  coins: number
  multiplier: number
  workoutsDone: number
  workoutsGoal?: number
  streakDays: number
}) {
  const [displayed, setDisplayed] = useState(coins)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const from = displayed
    const to = coins
    const dur = 700
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const e = 1 - Math.pow(1 - t, 3)
      setDisplayed(Math.round(from + (to - from) * e))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coins])

  const pct = Math.min(1, workoutsDone / workoutsGoal)
  const ringSize = 200
  const r = 86
  const c = 2 * Math.PI * r
  const week = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  return (
    <div style={{ padding: '20px 22px 26px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', paddingTop: 8 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: TOK.muted, marginBottom: 10 }}>
          Your balance
        </div>
        <div style={{ position: 'relative', width: ringSize, height: ringSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={ringSize} height={ringSize} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx={ringSize / 2} cy={ringSize / 2} r={r} stroke="rgba(245,240,234,0.07)" strokeWidth={2} fill="none" />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={r}
              stroke={TOK.copper}
              strokeWidth={2}
              fill="none"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(.2,.8,.2,1)' }}
            />
            {Array.from({ length: workoutsGoal }).map((_, i) => {
              const a = (i / workoutsGoal) * Math.PI * 2 - Math.PI / 2
              const x1 = ringSize / 2 + Math.cos(a) * (r - 6)
              const y1 = ringSize / 2 + Math.sin(a) * (r - 6)
              const x2 = ringSize / 2 + Math.cos(a) * (r + 6)
              const y2 = ringSize / 2 + Math.sin(a) * (r + 6)
              const done = i < workoutsDone
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={done ? TOK.copper : 'rgba(245,240,234,0.18)'}
                  strokeWidth={done ? 2 : 1}
                  strokeLinecap="round"
                />
              )
            })}
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 72, fontWeight: 400, letterSpacing: '-0.04em', color: TOK.fg, lineHeight: 1, fontFeatureSettings: '"tnum"' }}>
              {displayed.toLocaleString()}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: TOK.muted, marginTop: 6 }}>
              coins
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 18, alignItems: 'center' }}>
          <div style={chipStyle(workoutsDone > 0)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={workoutsDone > 0 ? '#fff' : TOK.copper} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
            <span style={{ color: workoutsDone > 0 ? '#fff' : TOK.copper, fontWeight: 600, marginLeft: 6 }}>{multiplier.toFixed(1)}×</span>
            <span style={{ color: workoutsDone > 0 ? 'rgba(255,255,255,0.75)' : TOK.muted, marginLeft: 4 }}>streak</span>
          </div>
          <div style={chipStyle(workoutsDone > 0)}>
            <span style={{ color: workoutsDone > 0 ? '#fff' : TOK.fg, fontWeight: 600 }}>
              {workoutsDone}/{workoutsGoal}
            </span>
            <span style={{ color: workoutsDone > 0 ? 'rgba(255,255,255,0.75)' : TOK.muted, marginLeft: 4 }}>this week</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
          {week.map((d, i) => {
            const done = i < workoutsDone
            const isToday = i === todayIdx
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 28 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: TOK.muted, letterSpacing: '0.1em' }}>{d}</div>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: done ? TOK.copper : isToday ? 'rgba(245,240,234,0.24)' : 'rgba(245,240,234,0.08)',
                    boxShadow: isToday && !done ? '0 0 0 2px rgba(245,240,234,0.06)' : 'none',
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function chipStyle(filled = false): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    padding: '7px 11px',
    borderRadius: 999,
    background: filled ? TOK.copper : 'rgba(245,240,234,0.04)',
    border: `1px solid ${filled ? TOK.copper : TOK.hairline}`,
    fontFamily: 'var(--mono)',
    fontSize: 11,
    letterSpacing: '0.02em',
    transition: 'background 200ms, border-color 200ms',
  }
}

// ===== COUNT logo (matches landing page — 4 tally bars + copper slash + Archivo wordmark) =====
function CountLogo({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const scale = size === 'md' ? 1.4 : 1
  const markW = 35.2 * scale
  const markH = 28.8 * scale
  const barW = 3.2 * scale
  const barH = 22.4 * scale
  const barTop = 3.2 * scale
  const slashW = 38.4 * scale
  const slashH = 2.8 * scale
  const slashTop = 12.8 * scale
  const slashLeft = -1.6 * scale
  const fontSize = 16 * scale
  const gap = 9.6 * scale
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap, justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: markW, height: markH }}>
        {[4.8, 11.2, 17.6, 24].map((leftBase, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: leftBase * scale,
              top: barTop,
              width: barW,
              height: barH,
              background: TOK.fg,
              borderRadius: 2,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            top: slashTop,
            left: slashLeft,
            width: slashW,
            height: slashH,
            background: TOK.copper,
            borderRadius: 2,
            transform: 'rotate(-30deg)',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'Archivo, var(--sans), sans-serif',
          fontSize,
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

// ===== CoinPill =====
function CoinPill({ coins }: { coins: number }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px 6px 8px',
        borderRadius: 999,
        background: TOK.card,
        border: `1px solid ${TOK.hairline}`,
        fontFamily: 'var(--mono)',
        fontSize: 12,
        color: TOK.fg,
      }}
    >
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: TOK.copper, display: 'inline-block' }} />
      <span style={{ fontWeight: 600 }}>{coins.toLocaleString()}</span>
      <span style={{ color: TOK.muted, fontSize: 10, letterSpacing: '0.14em' }}>C</span>
    </div>
  )
}

// ===== Logo helper — SVG-rounded brand mark =====
function BrandMark({ brand, src, size = 40, color = TOK.fg }: { brand: string; src?: string; size?: number; color?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={brand}
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: 6, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
      />
    )
  }
  // Typographic fallback
  return (
    <div
      style={{
        fontFamily: 'var(--mono)',
        fontWeight: 700,
        fontSize: Math.round(size * 0.32),
        letterSpacing: '0.1em',
        color,
        textTransform: 'uppercase',
        textAlign: 'center',
      }}
    >
      {brand}
    </div>
  )
}

// ===== Featured snap-scroll =====
function FeaturedCard({
  reward,
  userCoins,
  onTap,
}: {
  reward: Reward
  userCoins: number
  onTap: (r: Reward) => void
}) {
  const accent = accentFor(reward.brand_name)
  const cost = reward.point_cost
  const needed = Math.max(0, cost - userCoins)
  const pct = Math.min(1, userCoins / Math.max(1, cost))
  const canUnlock = userCoins >= cost && !reward.coming_soon
  const logo = logoFor(reward.brand_name, reward.image_url)

  return (
    <div
      onClick={() => onTap(reward)}
      style={{
        flex: '0 0 270px',
        scrollSnapAlign: 'start',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        height: 340,
        background: TOK.card,
        border: `1px solid ${TOK.hairline}`,
        cursor: 'pointer',
      }}
    >
      {/* Hero gradient half */}
      <div
        style={{
          position: 'relative',
          height: '55%',
          background: `linear-gradient(145deg, ${accent} 0%, ${accent}cc 45%, ${TOK.bg} 100%)`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 10px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-30%',
            left: '-10%',
            width: '80%',
            height: '80%',
            background: 'radial-gradient(circle, rgba(255,230,210,0.28) 0%, transparent 60%)',
            filter: 'blur(8px)',
          }}
        />

        {/* Edition tag */}
        {reward.is_new && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 8px',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(6px)',
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: TOK.fg,
            }}
          >
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: TOK.fg }} />
            New
          </div>
        )}
        {reward.is_hot && !reward.is_new && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              padding: '4px 8px',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(6px)',
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: TOK.fg,
            }}
          >
            Hot
          </div>
        )}

        {/* Lock badge */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: canUnlock ? TOK.fg : 'rgba(0,0,0,0.38)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: canUnlock ? TOK.bg : TOK.fg,
            border: canUnlock ? 'none' : '1px solid rgba(245,240,234,0.25)',
            fontSize: 14,
          }}
        >
          {canUnlock ? '✓' : '🔒'}
        </div>

        {/* Brand mark */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '18px 16px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
          }}
        >
          {logo ? (
            <img
              src={logo}
              alt={reward.brand_name}
              style={{ width: 60, height: 60, objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}
            />
          ) : (
            <BrandMark brand={reward.brand_name} size={32} />
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: TOK.muted, marginBottom: 6 }}>
            {reward.brand_name}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1.15, letterSpacing: '-0.015em', color: TOK.fg }}>
            {reward.product_name}
          </div>
          {reward.description && (
            <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: TOK.muted, marginTop: 4, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {reward.description}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: TOK.fg }}>{cost.toLocaleString()}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: TOK.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>coins</span>
            </div>
            {reward.coming_soon ? (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: TOK.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Soon</span>
            ) : !canUnlock ? (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent, letterSpacing: '0.06em' }}>{needed.toLocaleString()} to go</span>
            ) : (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Ready</span>
            )}
          </div>
          <div style={{ height: 2, background: 'rgba(245,240,234,0.08)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${pct * 100}%`,
                background: canUnlock ? TOK.fg : accent,
                transition: 'width 800ms cubic-bezier(.2,.8,.2,1), background 200ms',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== All Rewards row =====
function RewardRow({
  reward,
  userCoins,
  redeeming,
  onRedeem,
}: {
  reward: Reward
  userCoins: number
  redeeming: boolean
  onRedeem: (r: Reward) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const canAfford = userCoins >= reward.point_cost && !reward.coming_soon
  const accent = accentFor(reward.brand_name)
  const logo = logoFor(reward.brand_name, reward.image_url)

  const click = () => {
    if (!canAfford || redeeming) return
    if (!confirming) setConfirming(true)
  }
  const confirm = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRedeem(reward)
    setConfirming(false)
  }
  const cancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(false)
  }

  return (
    <div
      onClick={click}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 20px',
        position: 'relative',
        opacity: canAfford ? 1 : 0.5,
        cursor: canAfford && !redeeming ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: TOK.card2,
          border: `1px solid ${TOK.hairline}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {logo ? (
          <img src={logo} alt={reward.brand_name} style={{ width: 30, height: 30, objectFit: 'contain' }} />
        ) : (
          <BrandMark brand={reward.brand_name} size={26} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: TOK.muted }}>
          {reward.brand_name}
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 14, color: TOK.fg, fontWeight: 500, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {reward.product_name}
        </div>
        {reward.description && (
          <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: TOK.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {reward.description}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        {!confirming && (
          <>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: canAfford ? TOK.fg : TOK.muted }}>
              {reward.point_cost.toLocaleString()}
              <span style={{ fontSize: 9, color: TOK.muted, letterSpacing: '0.12em', marginLeft: 3 }}>C</span>
            </div>
            <button
              disabled={!canAfford || redeeming}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                background: redeeming ? TOK.card2 : canAfford ? accent : 'transparent',
                color: canAfford ? '#fff' : TOK.muted,
                border: canAfford ? 'none' : `1px solid ${TOK.hairline2}`,
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 600,
                cursor: canAfford && !redeeming ? 'pointer' : 'default',
              }}
            >
              {reward.coming_soon ? 'Soon' : redeeming ? '...' : canAfford ? 'Redeem' : 'Locked'}
            </button>
          </>
        )}
        {confirming && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={cancel}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                background: 'transparent',
                color: TOK.muted,
                border: `1px solid ${TOK.hairline2}`,
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirm}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                background: accent,
                color: '#fff',
                border: 'none',
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Confirm · {reward.point_cost}C
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Unlock Sheet (bottom sheet for tapped Featured items) =====
function UnlockSheet({
  reward,
  userCoins,
  redeeming,
  onClose,
  onConfirm,
}: {
  reward: Reward | null
  userCoins: number
  redeeming: boolean
  onClose: () => void
  onConfirm: (r: Reward) => void
}) {
  if (!reward) return null
  const accent = accentFor(reward.brand_name)
  const canUnlock = userCoins >= reward.point_cost && !reward.coming_soon
  const needed = Math.max(0, reward.point_cost - userCoins)
  const pct = Math.min(1, userCoins / Math.max(1, reward.point_cost))
  const logo = logoFor(reward.brand_name, reward.image_url)

  return (
    <div
      onClick={onClose}
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
          padding: '12px 20px 28px',
          animation: 'sheetUp 280ms cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(245,240,234,0.2)', margin: '0 auto 16px' }} />

        <div
          style={{
            height: 170,
            borderRadius: 18,
            overflow: 'hidden',
            position: 'relative',
            background: `linear-gradient(145deg, ${accent} 0%, ${accent}dd 40%, ${TOK.bg} 100%)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 10px)',
            }}
          />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {logo ? (
              <img src={logo} alt={reward.brand_name} style={{ width: 96, height: 96, objectFit: 'contain', filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.4))' }} />
            ) : (
              <BrandMark brand={reward.brand_name} size={68} />
            )}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: TOK.muted }}>
            {reward.brand_name}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.1, color: TOK.fg, marginTop: 4, letterSpacing: '-0.015em' }}>
            {reward.product_name}
          </div>
          {reward.description && (
            <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: TOK.muted, marginTop: 4 }}>{reward.description}</div>
          )}
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: TOK.muted }}>
              Your progress
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: canUnlock ? accent : TOK.fg }}>
              {userCoins.toLocaleString()} <span style={{ color: TOK.muted }}>/ {reward.point_cost.toLocaleString()}</span>
            </span>
          </div>
          <div style={{ marginTop: 8, height: 3, background: 'rgba(245,240,234,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct * 100}%`, background: canUnlock ? TOK.fg : accent, transition: 'width 700ms' }} />
          </div>
          {!canUnlock && !reward.coming_soon && (
            <div style={{ marginTop: 10, fontFamily: 'var(--sans)', fontSize: 12, color: TOK.muted, lineHeight: 1.5 }}>
              <span style={{ color: accent, fontFamily: 'var(--mono)', fontWeight: 600 }}>{needed.toLocaleString()} coins</span> to unlock. Roughly{' '}
              <span style={{ color: TOK.fg }}>{Math.ceil(needed / (60 * 1.2))} workouts</span> at your current pace.
            </div>
          )}
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
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
              cursor: 'pointer',
            }}
          >
            Close
          </button>
          {canUnlock ? (
            <button
              onClick={() => onConfirm(reward)}
              disabled={redeeming}
              style={{
                flex: 1,
                padding: '14px 18px',
                borderRadius: 14,
                background: accent,
                color: '#fff',
                border: 'none',
                fontFamily: 'var(--mono)',
                fontSize: 12,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 700,
                cursor: redeeming ? 'default' : 'pointer',
                opacity: redeeming ? 0.6 : 1,
              }}
            >
              {redeeming ? 'Redeeming…' : `Redeem · ${reward.point_cost.toLocaleString()} coins`}
            </button>
          ) : (
            <button
              disabled
              style={{
                flex: 1,
                padding: '14px 18px',
                borderRadius: 14,
                background: 'rgba(245,240,234,0.04)',
                color: TOK.fg,
                border: `1px solid ${TOK.hairline2}`,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {reward.coming_soon ? 'Coming soon' : 'Keep earning'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== Page =====
export default function RewardsPage() {
  const { user, refreshUser } = useAuth()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successReward, setSuccessReward] = useState<Reward | null>(null)
  const [fulfillmentData, setFulfillmentData] = useState<FulfillmentData | null>(null)
  const [copied, setCopied] = useState(false)
  const [weeklyWorkouts, setWeeklyWorkouts] = useState(0)
  const [sheetReward, setSheetReward] = useState<Reward | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .neq('category', 'gift_cards')
      .order('point_cost', { ascending: true })
      .then(({ data }) => {
        if (data) setRewards(data as Reward[])
      })
  }, [])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const since = new Date()
    since.setDate(since.getDate() - 7)
    supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('completed_at', since.toISOString())
      .then(({ count }) => setWeeklyWorkouts(count || 0))
  }, [user])

  async function handleRedeem(reward: Reward) {
    if (!user || (user.points_balance ?? 0) < reward.point_cost || redeeming) return
    setRedeeming(reward.id)
    setError(null)
    try {
      const resp = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reward_id: reward.id,
          user_id: user.id,
          points_spent: reward.point_cost,
          product_name: reward.product_name,
          brand_name: reward.brand_name,
          user_email: user.email,
          user_name: user.name,
          reward_type: reward.reward_type ?? 'gift_card',
          fulfillment_value: reward.fulfillment_value,
          affiliate_url: reward.affiliate_url,
        }),
      })
      if (resp.ok) {
        const data = await resp.json()
        await refreshUser()
        setSuccessReward(reward)
        setSheetReward(null)
        setFulfillmentData({
          reward_type: data.reward_type ?? reward.reward_type ?? 'gift_card',
          fulfillment_value: data.fulfillment_value,
          affiliate_url: data.affiliate_url,
        })
      } else {
        const body = await resp.json().catch(() => ({}))
        setError(body.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setRedeeming(null)
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const coins = user?.points_balance ?? 0
  const streakDays = (user as any)?.current_streak ?? 0
  const multiplierStr = getStreakMultiplierLabel(streakDays)
  const multiplier = parseFloat(String(multiplierStr).replace(/[^0-9.]/g, '')) || 1.0

  // Featured = is_featured OR cost above current balance (aspirational)
  const featured = rewards.filter((r) => r.is_featured)
  const all = rewards.filter((r) => !r.is_featured)
  const brandSet = Array.from(new Set(rewards.map((r) => r.brand_name)))

  return (
    <div
      style={{
        background: TOK.bg,
        minHeight: '100dvh',
        color: TOK.fg,
        fontFamily: 'var(--sans)',
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
        .scroll-x::-webkit-scrollbar {
          display: none;
        }
        .scroll-x {
          scrollbar-width: none;
        }
      `}</style>

      {/* Top brand bar */}
      <div
        style={{
          padding: '14px 20px 6px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderBottom: `1px solid ${TOK.hairline}`,
        }}
      >
        <CountLogo />
      </div>

      {/* Page header */}
      <div
        style={{
          padding: '14px 20px 4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: TOK.muted }}>
            Store
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 15, color: TOK.fg }}>Rewards</div>
        </div>
        <CoinPill coins={coins} />
      </div>

      {/* Hero */}
      <div style={{ padding: '4px 0 0' }}>
        <Hero coins={coins} multiplier={multiplier} workoutsDone={weeklyWorkouts} workoutsGoal={5} streakDays={streakDays} />
      </div>

      {error && (
        <div
          style={{
            margin: '0 20px 12px',
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(220,38,38,0.10)',
            border: '1px solid rgba(220,38,38,0.30)',
            color: '#fca5a5',
            fontFamily: 'var(--mono)',
            fontSize: 11,
          }}
        >
          {error}
        </div>
      )}

      {/* Saving toward · Featured */}
      {featured.length > 0 && (
        <>
          <div
            style={{
              padding: '18px 20px 8px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: TOK.muted }}>
                Saving toward
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: TOK.fg, letterSpacing: '-0.015em', marginTop: 3, lineHeight: 1.1 }}>
                Featured
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: '0.2em',
                color: TOK.muted,
                textTransform: 'uppercase',
                paddingBottom: 4,
              }}
            >
              {featured.length} items
            </div>
          </div>
          <div
            className="scroll-x"
            style={{
              display: 'flex',
              gap: 12,
              padding: '4px 20px 8px',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {featured.map((r) => (
              <FeaturedCard key={r.id} reward={r} userCoins={coins} onTap={setSheetReward} />
            ))}
            <div style={{ flex: '0 0 8px' }} />
          </div>
        </>
      )}

      {/* Browse by · Partner brands */}
      {brandSet.length > 0 && (
        <>
          <div style={{ padding: '18px 20px 8px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: TOK.muted }}>
              Browse by
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: TOK.fg, letterSpacing: '-0.015em', marginTop: 3, lineHeight: 1.1 }}>
              Partner brands
            </div>
          </div>
          <div
            className="scroll-x"
            style={{
              padding: '4px 20px 0',
              overflowX: 'auto',
              display: 'flex',
              gap: 10,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {brandSet.map((brand) => {
              const accent = accentFor(brand)
              const count = rewards.filter((r) => r.brand_name === brand).length
              const sample = rewards.find((r) => r.brand_name === brand)
              const logo = sample ? logoFor(brand, sample.image_url) : undefined
              return (
                <button
                  key={brand}
                  style={{
                    flex: '0 0 auto',
                    width: 150,
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      height: 90,
                      borderRadius: 14,
                      position: 'relative',
                      overflow: 'hidden',
                      background: `linear-gradient(135deg, ${accent} 0%, ${TOK.bg} 110%)`,
                      border: `1px solid ${TOK.hairline}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 10px)',
                      }}
                    />
                    <div style={{ position: 'relative' }}>
                      {logo ? (
                        <img src={logo} alt={brand} style={{ width: 50, height: 50, objectFit: 'contain' }} />
                      ) : (
                        <BrandMark brand={brand} size={40} />
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '8px 2px 0' }}>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, color: TOK.fg }}>{brand}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: TOK.muted, letterSpacing: '0.1em', marginTop: 2 }}>
                      {count} {count === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Redeem now · All rewards */}
      <div style={{ padding: '18px 20px 6px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: TOK.muted }}>
          Redeem now
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: TOK.fg, letterSpacing: '-0.015em', marginTop: 3, lineHeight: 1.1 }}>
          All rewards
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {all.map((r, i) => (
          <div key={r.id}>
            <RewardRow reward={r} userCoins={coins} redeeming={redeeming === r.id} onRedeem={handleRedeem} />
            {i < all.length - 1 && <div style={{ height: 1, background: TOK.hairline, margin: '0 20px' }} />}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '24px 20px 120px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: TOK.muted }}>
          count · earn more by training
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: TOK.muted, marginTop: 6, lineHeight: 1.5, maxWidth: 260, margin: '6px auto 0' }}>
          Each workout earns <span style={{ color: TOK.fg }}>50–80</span>, multiplied by your current streak.
        </div>
      </div>

      {/* Unlock sheet for tapped Featured cards */}
      <UnlockSheet
        reward={sheetReward}
        userCoins={coins}
        redeeming={!!redeeming}
        onClose={() => setSheetReward(null)}
        onConfirm={handleRedeem}
      />

      {/* Success modal — preserved discount_code + affiliate_link flow */}
      {successReward && fulfillmentData && (
        <div
          onClick={() => {
            setSuccessReward(null)
            setFulfillmentData(null)
            setCopied(false)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 420,
              width: '100%',
              background: TOK.card,
              borderRadius: 20,
              border: `1px solid ${TOK.hairline2}`,
              padding: 24,
              color: TOK.fg,
            }}
          >
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: TOK.copper, marginBottom: 6 }}>
              Redeemed
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.015em' }}>
              {successReward.product_name}
            </div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: TOK.muted, marginTop: 4 }}>{successReward.brand_name}</div>

            {fulfillmentData.reward_type === 'discount_code' && fulfillmentData.fulfillment_value && (
              <div
                style={{
                  marginTop: 20,
                  padding: 18,
                  borderRadius: 14,
                  background: 'rgba(22,163,74,0.10)',
                  border: '1.5px solid rgba(22,163,74,0.25)',
                }}
              >
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#86efac', marginBottom: 8 }}>
                  Promo Code
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, letterSpacing: '0.18em', color: TOK.fg, marginBottom: 12 }}>
                  {fulfillmentData.fulfillment_value}
                </div>
                <button
                  onClick={() => fulfillmentData.fulfillment_value && handleCopy(fulfillmentData.fulfillment_value)}
                  style={{
                    background: copied ? TOK.green : TOK.copper,
                    color: TOK.fg,
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {copied ? 'Copied' : 'Copy code'}
                </button>
                {successReward.affiliate_url && (
                  <a
                    href={successReward.affiliate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      marginTop: 12,
                      color: TOK.copper,
                      fontFamily: 'var(--mono)',
                      fontSize: 12,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Shop {successReward.brand_name} →
                  </a>
                )}
              </div>
            )}

            {fulfillmentData.reward_type === 'affiliate_link' && fulfillmentData.affiliate_url && (
              <div style={{ marginTop: 20 }}>
                <a
                  href={fulfillmentData.affiliate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    background: TOK.copper,
                    color: TOK.fg,
                    borderRadius: 12,
                    padding: '16px 24px',
                    textAlign: 'center',
                    fontFamily: 'var(--mono)',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                  }}
                >
                  Claim your {successReward.brand_name} reward →
                </a>
              </div>
            )}

            <button
              onClick={() => {
                setSuccessReward(null)
                setFulfillmentData(null)
                setCopied(false)
              }}
              style={{
                width: '100%',
                marginTop: 14,
                background: TOK.card2,
                color: TOK.fg,
                border: `1px solid ${TOK.hairline2}`,
                borderRadius: 12,
                padding: '12px 18px',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to Shop
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
