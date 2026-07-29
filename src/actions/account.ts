"use server";

import { revalidatePath } from "next/cache";
import { hash, verify } from "@node-rs/argon2";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { profileUpdateSchema, passwordChangeSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/actions";

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Please sign in." };

  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name && parsed.data.name.length > 0 ? parsed.data.name : null },
    });
    revalidatePath("/account");
    return { ok: true };
  } catch (e) {
    console.error("[ACCOUNT] update profile failed:", e);
    return { ok: false, error: "Could not update your profile." };
  }
}

export async function changePassword(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Please sign in." };

  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
    if (!user) return { ok: false, error: "Account not found." };

    const valid = await verify(user.passwordHash, parsed.data.currentPassword);
    if (!valid) return { ok: false, error: "Current password is incorrect." };

    const passwordHash = await hash(parsed.data.newPassword);
    await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash } });
    return { ok: true };
  } catch (e) {
    console.error("[ACCOUNT] change password failed:", e);
    return { ok: false, error: "Could not update your password." };
  }
}
