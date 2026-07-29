"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import type { ActionResult } from "@/lib/actions";
import type { Role, SubscriptionTier } from "@/generated/prisma/client";

const ROLES = ["USER", "MOD", "ADMIN"];
const TIERS = ["FREE", "PREMIUM", "VIP"];

export async function setUserRole(userId: string, role: string): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!ROLES.includes(role)) return { ok: false, error: "Invalid role." };
  if (session.user.id === userId && role !== "ADMIN") {
    return { ok: false, error: "You can't remove your own admin role." };
  }
  try {
    await prisma.user.update({ where: { id: userId }, data: { role: role as Role } });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    console.error("[USER] set role failed:", e);
    return { ok: false, error: "Could not update role." };
  }
}

export async function setUserBanned(userId: string, banned: boolean): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not authorized." };
  if (session.user.id === userId && banned) {
    return { ok: false, error: "You can't ban yourself." };
  }
  try {
    await prisma.user.update({ where: { id: userId }, data: { banned } });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    console.error("[USER] set banned failed:", e);
    return { ok: false, error: "Could not update user." };
  }
}

export async function setUserTier(userId: string, tier: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };
  if (!TIERS.includes(tier)) return { ok: false, error: "Invalid tier." };
  try {
    await prisma.user.update({ where: { id: userId }, data: { tier: tier as SubscriptionTier } });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    console.error("[USER] set tier failed:", e);
    return { ok: false, error: "Could not update tier." };
  }
}
