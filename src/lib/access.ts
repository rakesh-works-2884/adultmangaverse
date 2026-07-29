/** Whether a subscription tier can read premium content. */
export function hasPremiumAccess(tier?: string | null): boolean {
  return tier === "PREMIUM" || tier === "VIP";
}
