"use client";

import { useEffect } from "react";

/**
 * Injects an admin-provided analytics snippet (e.g. GA/Plausible <script> tags)
 * into the document head so the scripts actually execute. Setting is admin-only.
 */
export function AnalyticsInjector({ snippet }: { snippet: string }) {
  useEffect(() => {
    if (!snippet.trim()) return;
    const container = document.createElement("div");
    container.innerHTML = snippet;
    const injected: HTMLScriptElement[] = [];
    container.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      for (const attr of Array.from(old.attributes)) s.setAttribute(attr.name, attr.value);
      s.text = old.textContent ?? "";
      document.head.appendChild(s);
      injected.push(s);
    });
    return () => {
      injected.forEach((s) => s.parentNode?.removeChild(s));
    };
  }, [snippet]);

  return null;
}
