import "server-only";
import { headers } from "next/headers";

/**
 * In-memory sliding-window rate limiter. Deliberately simple — no external
 * store — which means it only limits abuse per server process. Fine for a
 * single-instance deployment; if this ever runs on multiple instances behind
 * a load balancer, swap this for a shared store (Upstash Redis is the usual
 * pick) or the limits become per-instance instead of global.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// Prevent unbounded growth from one-off keys (e.g. random emails an attacker
// cycles through) — periodically drop expired entries.
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, entry] of buckets) {
    if (entry.resetAt < now) buckets.delete(key);
  }
}

/** Returns true if the action is allowed, false if the caller is over the limit. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  sweep();
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Best-effort client IP from proxy headers — only as good as what's in front of the app. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
