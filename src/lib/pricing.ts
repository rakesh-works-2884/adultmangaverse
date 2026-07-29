/**
 * Single source of truth for tier prices — the server must compute the
 * charge itself from here, never trust a price the client sends, or a
 * tampered request could buy VIP for a penny.
 */
export const TIER_MONTHLY_USD: Record<"PREMIUM" | "VIP", number> = {
  PREMIUM: 9.99,
  VIP: 19.99,
};

export const PAYMENT_DURATIONS = [1, 3, 12] as const;
export type PaymentDuration = (typeof PAYMENT_DURATIONS)[number];

export function priceFor(tier: "PREMIUM" | "VIP", months: number): number {
  return Math.round(TIER_MONTHLY_USD[tier] * months * 100) / 100;
}
