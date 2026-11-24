/*
 * Time-boxed brand promos. Each promo has ONE end constant; every surface that
 * shows the promo reads from here, so they all revert together.
 *
 * Momentous Black Friday / Cyber Monday 2026 (Nov 25 – Dec 1).
 * Boosted rates on the JosephPanepinto ambassador code: 40% off first
 * subscriptions, 20% off one-time. Discount code reward only, no free product.
 * Ends Dec 1 2026, end of day ET (EST = UTC-5) → 2026-12-02T05:00:00Z.
 */
export const MOMENTOUS_BFCM_END = Date.parse('2026-12-02T05:00:00Z')

export const MOMENTOUS_STANDING_OFFER = 'Up to 35% off your first subscription, 14% off one-time'
export const MOMENTOUS_BFCM_OFFER = '40% off first subscriptions · 20% off one-time — Black Friday through Dec 1'
export const MOMENTOUS_BFCM_BANNER_TAG = 'BLACK FRIDAY'
export const MOMENTOUS_BFCM_BANNER = 'Momentous: 40% off first subscriptions, 20% off one-time. Earn the code with 2 verified workouts. Ends Dec 1.'

export function isMomentousBfcm(now: number = Date.now()): boolean {
  return now < MOMENTOUS_BFCM_END
}

/** Landing-page store copy for Momentous. */
export function momentousOffer(now: number = Date.now()): string {
  return isMomentousBfcm(now) ? MOMENTOUS_BFCM_OFFER : MOMENTOUS_STANDING_OFFER
}

/**
 * In-app store: the rewards table holds the standing copy. During the sale,
 * swap the Momentous discount-code card's title + description in the client.
 * Cost (point_cost) is untouched. After the end date this is a no-op.
 */
export function applyPromoCopy<T extends { brand_name: string; reward_type?: string | null; product_name: string; description?: string | null }>(
  reward: T,
  now: number = Date.now(),
): T {
  if (!isMomentousBfcm(now)) return reward
  if (reward.brand_name !== 'Momentous' || reward.reward_type !== 'discount_code') return reward
  return {
    ...reward,
    product_name: 'Momentous: 40% off',
    description: `${MOMENTOUS_BFCM_OFFER}. Use code JosephPanepinto at checkout.`,
  }
}
