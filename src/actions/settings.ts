"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { SETTINGS_DEFAULTS, type SettingKey } from "@/lib/settings";
import type { ActionResult } from "@/lib/actions";

export async function saveSeoSettings(fd: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };

  const keys = Object.keys(SETTINGS_DEFAULTS) as SettingKey[];
  try {
    await Promise.all(
      keys.map((key) => {
        const value = String(fd.get(key) ?? "").trim();
        return prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
      }),
    );
    revalidatePath("/admin/seo");
    revalidateTag("settings", "max");
    return { ok: true };
  } catch (e) {
    console.error("[SETTINGS] save failed:", e);
    return { ok: false, error: "Could not save settings." };
  }
}
