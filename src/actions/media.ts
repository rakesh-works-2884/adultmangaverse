"use server";

import { requireAdmin } from "@/lib/auth-guards";
import { storage } from "@/lib/storage";
import { processContentImage } from "@/lib/images";
import type { ActionResult } from "@/lib/actions";

/**
 * Uploads an image pasted/dropped/inserted into a RichTextEditor (blog posts,
 * and any future rich-text field) and returns its public URL. Not tied to any
 * one entity's slug — editing can start (and images get pasted in) before a
 * title/slug even exists yet, so these live under a flat `content/` prefix.
 */
export async function uploadContentImage(fd: FormData): Promise<ActionResult<{ url: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Not authorized." };

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "No image provided." };

  try {
    const processed = await processContentImage(file);
    const key = `content/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const url = await storage.save(key, processed.buffer, "public");
    return { ok: true, data: { url } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not upload image." };
  }
}
