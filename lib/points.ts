// Points calculation logic — COUNT
//
// The whole earning rule in one sentence:
//   Verified workout = 500 coins. Unverified = 200. 7-day streak = +50%.
//
// Tiers are status (badges, referral payout), not a payout multiplier.
// There is no random/mystery bonus. A user should be able to do the math in their head.

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'

// Flat payouts
export const VERIFIED_POINTS = 500
export const UNVERIFIED_POINTS = 200
// Kept for callers that still read it; equals the unverified payout.
export const BASE_POINTS = UNVERIFIED_POINTS

// Single bonus: 7+ day streak
export const STREAK_BONUS_DAYS = 7
export const STREAK_BONUS_MULTIPLIER = 1.5

export function getTier(lifetimeSessions: number): Tier {
  if (lifetimeSessions >= 120) return 'platinum'
  if (lifetimeSessions >= 60) return 'gold'
  if (lifetimeSessions >= 30) return 'silver'
  return 'bronze'
}

// Tier no longer affects payout. Always 1 — kept so existing display code compiles.
export function getTierMultiplier(_tier: Tier): number {
  return 1
}

// Streak multiplier — the only bonus in the system.
export function getStreakMultiplier(streak: number): number {
  return streak >= STREAK_BONUS_DAYS ? STREAK_BONUS_MULTIPLIER : 1
}

export function getStreakMultiplierLabel(streak: number): string {
  return getStreakMultiplier(streak) + 'x'
}

// Referral payout to the referrer — this is the tier perk.
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

export function calculatePoints({
  verified,
  currentStreak = 0,
}: {
  verified: boolean
  lifetimeSessions?: number // ignored; accepted so existing call sites don't change
  currentStreak?: number
}): {
  base: number
  multiplier: number
  streakMultiplier: number
  total: number
  verifiedBonus: number
} {
  const base = verified ? VERIFIED_POINTS : UNVERIFIED_POINTS
  const streakMult = getStreakMultiplier(currentStreak)
  const total = Math.round(base * streakMult)

  return {
    base,
    // The multiplier recorded on the workout row is now just the streak multiplier.
    multiplier: streakMult,
    streakMultiplier: streakMult,
    total,
    verifiedBonus: verified ? VERIFIED_POINTS - UNVERIFIED_POINTS : 0,
  }
}
