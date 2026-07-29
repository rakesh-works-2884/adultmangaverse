import { auth } from "@/auth";
import type { Session } from "next-auth";

/**
 * Server-side role gates for Server Actions / server components. Never trust
 * the client or the proxy alone (Rules.md §2) — re-check here.
 */
export async function requireAdmin(): Promise<Session | null> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function requireStaff(): Promise<Session | null> {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "ADMIN" && session.user.role !== "MOD") return null;
  return session;
}
