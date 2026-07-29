"use client";

import { useEffect } from "react";
import { registerServiceWorker, warmOfflineShell } from "@/lib/sw-client";

const WARM_THROTTLE_MS = 10 * 60 * 1000;
const WARM_KEY = "amv_shell_warmed_at";

/** Registers the offline-reading service worker once per page load (site-wide, no visible UI). */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker();

    try {
      const last = Number(sessionStorage.getItem(WARM_KEY) ?? 0);
      if (Date.now() - last < WARM_THROTTLE_MS) return;
      sessionStorage.setItem(WARM_KEY, String(Date.now()));
    } catch {
      /* ignore — worst case we just warm the shell a bit more often */
    }
    void warmOfflineShell();
  }, []);
  return null;
}
