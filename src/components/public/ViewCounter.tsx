"use client";

import { useEffect, useRef } from "react";
import { recordMangaView } from "@/actions/reader";

/** Increments the manga view count once per browser session. Renders nothing. */
export function ViewCounter({ mangaId }: { mangaId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const key = `amv_viewed_${mangaId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    void recordMangaView(mangaId);
  }, [mangaId]);

  return null;
}
