'use client'

import {
  Dumbbell, Target, ShieldCheck, Flame, Coins, CalendarDays,
  Zap, Trophy, Crown, Rocket, Camera, Footprints, Bike, Activity,
  Pencil, Heart, Medal, MapPin, Link2, Gift, PartyPopper,
  Users, Bell, BarChart3, Snowflake, Lock, HandMetal, Share2,
  Tag, ExternalLink, ChevronUp, Apple, Timer, Package,
  Sparkles, Star, Crosshair, TrendingUp, Award, Mail,
  SmilePlus, Grip, CircleDot
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { forwardRef } from 'react'

// Map Lucide icon name strings → components (used by missions)
const NAME_MAP: Record<string, React.FC<LucideProps>> = {
  Dumbbell, Target, ShieldCheck, Flame, Coins, CalendarDays,
  Zap, Trophy, Crown, Rocket, Camera, Footprints, Bike, Activity,
  Pencil, Heart, Medal, MapPin, Link2, Gift, PartyPopper,
  Users, Bell, BarChart3, Snowflake, Lock, HandMetal, Share2,
  Tag, ExternalLink, Apple, Timer, Package,
  Sparkles, Star, Crosshair, TrendingUp, Award, Mail,
  SmilePlus, Grip, CircleDot,
}

// Map emoji strings → Lucide icon components
const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  // Workout types
  '💪': Dumbbell,
  '🤜': HandMetal,
  '🦵': Footprints,
  '🏋️': Dumbbell,
  '🚴': Bike,
  '⚡': Zap,
  '🏃': Activity,
  '🔥': Flame,
  '✏️': Pencil,

  // Missions & milestones
  '🎯': Target,
  '✅': ShieldCheck,
  '💰': Coins,
  '📅': CalendarDays,
  '🏆': Trophy,
  '👑': Crown,
  '🚀': Rocket,
  '🌱': TrendingUp,
  '🏅': Medal,

  // UI elements
  '📸': Camera,
  '📷': Camera,
  '📍': MapPin,
  '🔗': Link2,
  '🎁': Gift,
  '🎉': PartyPopper,
  '👥': Users,
  '🔔': Bell,
  '📊': BarChart3,
  '🧊': Snowflake,
  '🔒': Lock,
  '🤝': Share2,
  '🏷️': Tag,
  '🥇': Award,
  '📬': Mail,
  '🪙': CircleDot,

  // Leaderboard
  '🥈': Medal,
  '🥉': Medal,

  // Devices / integrations
  '🍎': Apple,
  '💚': Heart,
  '🏊': Activity,
  '📱': Grip,

  // Misc
  '✨': Sparkles,
  '⭐': Star,
  '👋': SmilePlus,
  '🔐': Lock,
}

interface IconProps extends Omit<LucideProps, 'ref'> {
  emoji: string
  size?: number
}

/**
 * Drop-in replacement for emoji strings.
 * Usage: <Icon emoji="💪" size={20} /> instead of <span>💪</span>
 */
const Icon = forwardRef<SVGSVGElement, IconProps>(({ emoji, size = 20, ...props }, ref) => {
  // Try emoji map first, then icon name map
  const Component = ICON_MAP[emoji] || NAME_MAP[emoji]
  if (!Component) {
    // Fallback: render the string as text
    return <span style={{ fontSize: size, lineHeight: 1 }}>{emoji}</span>
  }
  return <Component ref={ref} size={size} strokeWidth={2} {...props} />
})

Icon.displayName = 'Icon'

export { Icon, ICON_MAP }
export default Icon
