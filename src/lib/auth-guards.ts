import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { Session } from "next-auth";

/**
 * Server-side role gates for Server Actions / server components. Never trust
 * the client or the proxy alone (Rules.md §2) — re-check here.
 */
export const requireUser = cache(async (): Promise<Session | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, banned: true },
  });
  if (!user || user.banned) return null;
  return { ...session, user: { ...session.user, role: user.role } };
});

export async function requireAdmin(): Promise<Session | null> {
  const session = await requireUser();
  return session?.user.role === "ADMIN" ? session : null;
}

export async function requireStaff(): Promise<Session | null> {
  const session = await requireUser();
  return session && (session.user.role === "ADMIN" || session.user.role === "MOD") ? session : null;
}
