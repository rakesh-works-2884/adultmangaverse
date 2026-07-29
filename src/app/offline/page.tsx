"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, WifiOff } from "lucide-react";
import { getOfflineIndex, deleteOfflineManga, getOfflineManga, OFFLINE_CHANGE_EVENT } from "@/lib/offline-store";
import { evictOfflineUrls } from "@/lib/sw-client";

// Deliberately outside the (public) route group: that layout calls auth()
// (reads cookies), which forces every page under it to render dynamically.
// This page has to keep working with zero network, so it — and its sibling
// /offline-reader — are static, self-contained, and read only localStorage.

const EMPTY: ReturnType<typeof getOfflineIndex> = [];

function subscribe(cb: () => void) {
  window.addEventListener(OFFLINE_CHANGE_EVENT, cb);
  return () => window.removeEventListener(OFFLINE_CHANGE_EVENT, cb);
}

export default function OfflinePage() {
  const titles = useSyncExternalStore(subscribe, getOfflineIndex, () => EMPTY);

  async function remove(id: string) {
    const local = getOfflineManga(id);
    if (local) {
      const urls = [...(local.coverUrl ? [local.coverUrl] : []), ...local.chapters.flatMap((c) => c.pages.map((p) => p.imageUrl))];
      await evictOfflineUrls(urls);
    }
    deleteOfflineManga(id);
  }

  return (
    <div className="min-h-screen bg-bg text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/library" className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to site
        </Link>
        <h1 className="mb-1 flex items-center gap-2 font-heading text-2xl font-bold">
          <WifiOff className="size-6 text-primary" /> Offline Library
        </h1>
        <p className="mb-6 text-sm text-text-muted">Titles saved here open without an internet connection — nothing is a downloadable file, pages just come from this device&apos;s cache.</p>

        {titles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-bg-soft px-5 py-16 text-center text-sm text-text-muted">
            Nothing saved yet. Open a title while online and tap <strong className="text-foreground">Save Offline</strong> (Premium/VIP).
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {titles.map((t) => (
              <div key={t.id} className="group">
                <Link href={`/offline-reader?manga=${t.id}`} className="block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element -- offline pages must bypass the image optimizer. */}
                    {t.coverUrl ? <img src={t.coverUrl} alt={`${t.title} cover`} className="size-full object-cover" draggable={false} /> : null}
                  </div>
                  <h3 className="mt-1.5 line-clamp-2 font-heading text-sm font-semibold group-hover:text-highlight">{t.title}</h3>
                </Link>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="mt-1 text-xs text-text-muted hover:text-danger"
                >
                  Remove from offline
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
