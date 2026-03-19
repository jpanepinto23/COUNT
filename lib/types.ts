export type WorkoutType =
  | 'push' | 'pull' | 'legs' | 'upper' | 'lower'
  | 'full_body' | 'cardio' | 'hiit' | 'custom'

export type VerificationMethod =
  | 'apple_health' | 'google_fit' | 'gps' | 'photo' | 'unverified'

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
  base_points: number
  multiplier_applied: number
  total_points_earned: number
  logged_at: string
}

export interface Reward {
  id: string
  brand_name: string
  product_name: string
  description: string
  image_url: string
  point_cost: number
  retail_value: number
  category: 'supplements' | 'gear' | 'gift_cards' | 'lifestyle'
  affiliate_url: string
  is_active: boolean
  is_featured: boolean
  is_hot?: boolean
  is_new?: boolean
}

export interface Redemption {
  id: string
  user_id: string
  reward_id: string
  points_spent: number
  affiliate_link_generated: string
  redeemed_at: string
  reward?: Reward
}

export interface LeaderboardEntry {
  user_id: string
  month: string
  points_earned_this_month: number
  rank: number
  name: string
  current_streak: number
  tier: Tier
}
