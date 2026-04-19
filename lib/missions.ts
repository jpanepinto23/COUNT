import type { WorkoutType } from './types'

// ── Mission definitions ──

export type MissionDifficulty = 'easy' | 'medium' | 'hard'
export type MissionStatus = 'locked' | 'active' | 'completed' | 'claimed'

export interface Mission {
  key: string           // unique per day, e.g. "2026-04-14_log_workout"
  title: string
  description: string
  icon: string
  difficulty: MissionDifficulty
  reward: number        // bonus coins
  completed: boolean
  claimed: boolean
}

interface MissionTemplate {
  id: string
  title: string
  description: string
  icon: string
  difficulty: MissionDifficulty
  reward: number
  check: (ctx: MissionContext) => boolean
}

export interface MissionContext {
  hasLoggedToday: boolean
  todayWorkoutType: WorkoutType | null
  todayVerified: boolean
  todayPoints: number
  todayEffort: number
  currentStreak: number
  weekSessionCount: number
  lifetimeSessions: number
}

// Deterministic seeded random from date string
function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

const WORKOUT_LABELS: Record<string, string> = {
  push: 'Push', pull: 'Pull', legs: 'Legs', upper: 'Upper', lower: 'Lower',
  full_body: 'Full Body', cardio: 'Cardio', hiit: 'HIIT',
}
const WORKOUT_KEYS = Object.keys(WORKOUT_LABELS) as WorkoutType[]

// All possible mission templates
function getMissionTemplates(targetType: WorkoutType): MissionTemplate[] {
  return [
    // Easy missions (reward: 15-25 coins)
    {
      id: 'log_workout',
      title: 'Show Up',
      description: 'Log any workout today',
      icon: 'Dumbbell',
      difficulty: 'easy',
      reward: 20,
      check: (ctx) => ctx.hasLoggedToday,
    },
    {
      id: `log_${targetType}`,
      title: `${WORKOUT_LABELS[targetType]} Day`,
      description: `Log a ${WORKOUT_LABELS[targetType]} workout`,
      icon: 'Target',
      difficulty: 'easy',
      reward: 25,
      check: (ctx) => ctx.todayWorkoutType === targetType,
    },
    // Medium missions (reward: 40-60 coins)
    {
      id: 'verified_session',
      title: 'Prove It',
      description: 'Log a verified workout',
      icon: 'ShieldCheck',
      difficulty: 'medium',
      reward: 50,
      check: (ctx) => ctx.todayVerified,
    },
    {
      id: 'high_effort',
      title: 'Go Hard',
      description: 'Rate your effort 4+ out of 5',
      icon: 'Flame',
      difficulty: 'medium',
      reward: 40,
      check: (ctx) => ctx.todayEffort >= 4,
    },
    {
      id: 'earn_300',
      title: 'Big Earner',
      description: 'Earn 300+ points in one session',
      icon: 'Coins',
      difficulty: 'medium',
      reward: 50,
      check: (ctx) => ctx.todayPoints >= 300,
    },
    {
      id: 'week_3',
      title: 'Midweek Push',
      description: 'Hit 3 workouts this week',
      icon: 'CalendarDays',
      difficulty: 'medium',
      reward: 45,
      check: (ctx) => ctx.weekSessionCount >= 3,
    },
    // Hard missions (reward: 75-120 coins)
    {
      id: 'streak_7',
      title: 'Week Warrior',
      description: 'Reach a 7-day streak',
      icon: 'Zap',
      difficulty: 'hard',
      reward: 100,
      check: (ctx) => ctx.currentStreak >= 7,
    },
    {
      id: 'streak_14',
      title: 'Unstoppable',
      description: 'Reach a 14-day streak',
      icon: 'Trophy',
      difficulty: 'hard',
      reward: 120,
      check: (ctx) => ctx.currentStreak >= 14,
    },
    {
      id: 'week_5',
      title: 'Five-a-Week',
      description: 'Log 5 workouts this week',
      icon: 'Crown',
      difficulty: 'hard',
      reward: 80,
      check: (ctx) => ctx.weekSessionCount >= 5,
    },
    {
      id: 'earn_500',
      title: 'Point Machine',
      description: 'Earn 500+ points in one session',
      icon: 'Rocket',
      difficulty: 'hard',
      reward: 100,
      check: (ctx) => ctx.todayPoints >= 500,
    },
  ]
}

/**
 * Generate today's 3 daily missions (deterministic per date)
 * Returns 1 easy, 1 medium, 1 hard mission
 */
export function generateDailyMissions(
  dateStr: string, // YYYY-MM-DD
  context: MissionContext,
  claimedKeys: Set<string>
): Mission[] {
  const rand = seededRandom(dateStr)

  // Pick a random workout type for the day
  const typeIndex = Math.floor(rand() * WORKOUT_KEYS.length)
  const targetType = WORKOUT_KEYS[typeIndex]

  const templates = getMissionTemplates(targetType)

  const easy = templates.filter(t => t.difficulty === 'easy')
  const medium = templates.filter(t => t.difficulty === 'medium')
  const hard = templates.filter(t => t.difficulty === 'hard')

  // Pick 1 from each pool
  const picks = [
    easy[Math.floor(rand() * easy.length)],
    medium[Math.floor(rand() * medium.length)],
    hard[Math.floor(rand() * hard.length)],
  ]

  return picks.map(template => {
    const key = `${dateStr}_${template.id}`
    return {
      key,
      title: template.title,
      description: template.description,
      icon: template.icon,
      difficulty: template.difficulty,
      reward: template.reward,
      completed: template.check(context),
      claimed: claimedKeys.has(key),
    }
  })
}

/** Get today's date in YYYY-MM-DD format (local timezone) */
export function todayDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Difficulty badge colors */
export const DIFFICULTY_COLORS: Record<MissionDifficulty, { bg: string; border: string; text: string }> = {
  easy:   { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)',  text: '#22c55e' },
  medium: { bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.3)',  text: '#EAB308' },
  hard:   { bg: 'rgba(168,85,247,0.1)',  border: 'rgba(168,85,247,0.3)', text: '#A855F7' },
}
