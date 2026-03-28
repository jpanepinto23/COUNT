export type WorkoutType =
  | 'push'
  | 'pull'
  | 'legs'
  | 'upper'
  | 'lower'
  | 'full_body'
  | 'cardio'
  | 'hiit'
  | 'custom'

export type VerificationMethod =
  | 'apple_health'
  | 'google_fit'
  | 'gps'
  | 'photo'
  | 'unverified'
  | 'strava'

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface User {
  id: string
  email: string
  name: string
  age?: number
  height?: number
  weight?: number
  created_at: string
  current_streak: number
  longest_streak: number
  lifetime_sessions: number
  tier: Tier
  multiplier: number
  points_balance: number
  points_lifetime_earned: number
  free_unverified_remaining: number
  referral_code?: string
  referred_by?: string | null
  referral_bonus_claimed?: boolean
  referral_count?: number
  avatar_url?: string
}

export interface Workout {
  id: string
  user_id: string
  type: WorkoutType
  custom_name?: string
  duration_minutes: number
  verification_method: VerificationMethod
  verified: boolean
  heart_rate_avg?: number
  calories?: number
  notes?: string
  photo_url?: string
  created_at: string
  points_earned?: number
  strava_activity_id?: string
}

export interface Reward {
  id: string
  product_name: string
  brand_name: string
  point_cost: number
  description?: string
  image_url?: string
  is_active: boolean
  is_featured?: boolean
}

export interface Redemption {
  id: string
  user_id: string
  reward_id: string
  points_spent: number
  status: 'pending' | 'fulfilled' | 'cancelled'
  created_at: string
  reward?: Reward
}
