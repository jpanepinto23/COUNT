// Points calculation logic per COUNT MVP spec

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

export function getTierLabel(tier: Tier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1)
}

export function getNextTierSessions(lifetimeSessions: number): { next: Tier | null; sessionsNeeded: number; threshold: number } {
  if (lifetimeSessions < 30) return { next: 'silver', sessionsNeeded: 30 - lifetimeSessions, threshold: 30 }
  if (lifetimeSessions < 60) return { next: 'gold', sessionsNeeded: 60 - lifetimeSessions, threshold: 60 }
  if (lifetimeSessions < 120) return { next: 'platinum', sessionsNeeded: 120 - lifetimeSessions, threshold: 120 }
  return { next: null, sessionsNeeded: 0, threshold: 120 }
}

export function calculateBasePoints(durationMinutes: number): number {
  let base = 100
  if (durationMinutes >= 60) base += 50
  else if (durationMinutes >= 45) base += 25
  return base // max 150
}

export function calculatePoints({
  durationMinutes,
  verified,
  freeUnverifiedRemaining,
  lifetimeSessions,
}: {
  durationMinutes: number
  verified: boolean
  freeUnverifiedRemaining: number
  lifetimeSessions: number
}): { base: number; multiplier: number; total: number; verificationMultiplier: number } {
  const tier = getTier(lifetimeSessions)
  const tierMultiplier = getTierMultiplier(tier)
  const base = calculateBasePoints(durationMinutes)

  let verificationMultiplier = 1.0
  if (!verified) {
    if (freeUnverifiedRemaining > 0) {
      verificationMultiplier = 0.25
    } else {
      verificationMultiplier = 0
    }
  }

  const total = Math.round(base * verificationMultiplier * tierMultiplier)
  return { base, multiplier: tierMultiplier, total, verificationMultiplier }
}
