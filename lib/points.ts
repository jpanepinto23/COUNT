// Points calculation logic — COUNT
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'

export function getTier(lifetimeSessions: number): Tier {
  if (lifetimeSessions >= 120) return 'platinum'
  if (lifetimeSessions >= 60) return 'gold'
  if (lifetimeSessions >= 30) return 'silver'
  return 'bronze'
}

export function getTierMultiplier(tier: Tier): number {
  const multipliers: Record<Tier, number> = {
    bronze: 1.0,
    silver: 1.5,
    gold: 2.0,
    platinum: 3.0,
  }
  return multipliers[tier]
}

// Returns numeric streak multiplier — used in actual point calculation
export function getStreakMultiplier(streak: number): number {
  if (streak >= 14) return 2.0
  if (streak >= 7) return 1.5
  if (streak >= 3) return 1.2
  return 1.0
}

// Returns display label for streak multiplier
export function getStreakMultiplierLabel(streak: number): string {
  return getStreakMultiplier(streak) + 'x'
}

export function getReferralPoints(tier: Tier): number {
  const points: Record<Tier, number> = {
    bronze: 300,
    silver: 500,
    gold: 750,
    platinum: 1000,
  }
  return points[tier]
}

export function getTierLabel(tier: Tier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1)
}

export function getNextTierSessions(lifetimeSessions: number): {
  next: Tier | null
  sessionsNeeded: number
  threshold: number
} {
  if (lifetimeSessions < 30) return { next: 'silver', sessionsNeeded: 30 - lifetimeSessions, threshold: 30 }
  if (lifetimeSessions < 60) return { next: 'gold', sessionsNeeded: 60 - lifetimeSessions, threshold: 60 }
  if (lifetimeSessions < 120) return { next: 'platinum', sessionsNeeded: 120 - lifetimeSessions, threshold: 120 }
  return { next: null, sessionsNeeded: 0, threshold: 120 }
}

// Base points per session — flat 200, duration does not affect earnings
export const BASE_POINTS = 200

// Unverified sessions earn 10% of full points — always, no free session mechanics
export const UNVERIFIED_MULTIPLIER = 0.10

export function calculatePoints({
  verified,
  lifetimeSessions,
  currentStreak = 0,
}: {
  verified: boolean
  lifetimeSessions: number
  currentStreak?: number
}): {
  base: number
  multiplier: number
  streakMultiplier: number
  total: number
  verificationMultiplier: number
} {
  const tier = getTier(lifetimeSessions)
  const tierMultiplier = getTierMultiplier(tier)
  const streakMult = getStreakMultiplier(currentStreak)
  const verificationMultiplier = verified ? 1.0 : UNVERIFIED_MULTIPLIER

  const total = Math.round(BASE_POINTS * verificationMultiplier * streakMult * tierMultiplier)

  return {
    base: BASE_POINTS,
    multiplier: tierMultiplier,
    streakMultiplier: streakMult,
    total,
    verificationMultiplier,
  }
}
