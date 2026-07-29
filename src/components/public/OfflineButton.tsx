"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CloudCheck, Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveOffline, removeOffline } from "@/actions/offline";
import { getOfflineManga, isSavedOffline, putOfflineManga, deleteOfflineManga, OFFLINE_CHANGE_EVENT } from "@/lib/offline-store";
import { cacheOfflineUrls, evictOfflineUrls } from "@/lib/sw-client";

function subscribe(cb: () => void) {
  window.addEventListener(OFFLINE_CHANGE_EVENT, cb);
  return () => window.removeEventListener(OFFLINE_CHANGE_EVENT, cb);
}

export function OfflineButton({
  mangaId,
  tier,
  limit,
  used,
}: {
  mangaId: string;
  tier: string;
  limit: number | null;
  used: number;
}) {
  const { status } = useSession();
  const saved = useSyncExternalStore(subscribe, () => isSavedOffline(mangaId), () => false);
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "authenticated") {
    return (
      <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-5 font-ui text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover">
        <WifiOff className="size-4" /> Save Offline
      </Link>
    );
  }

  if (tier === "FREE") {
    return (
      <Link href="/subscribe" className="inline-flex h-11 items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-5 font-ui text-sm font-semibold text-text-muted transition-colors hover:border-primary/50 hover:text-foreground">
        <WifiOff className="size-4" /> Save Offline — Premium/VIP
      </Link>
    );
  }

  function toggle() {
    setError(null);
    if (saved) {
      startTransition(async () => {
        const local = getOfflineManga(mangaId);
        const res = await removeOffline(mangaId);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        if (local) {
          const urls = [...(local.coverUrl ? [local.coverUrl] : []), ...local.chapters.flatMap((c) => c.pages.map((p) => p.imageUrl))];
          await evictOfflineUrls(urls);
        }
        deleteOfflineManga(mangaId);
      });
      return;
    }

    startTransition(async () => {
      const res = await saveOffline(mangaId);
      if (!res.ok || !res.data) {
        setError(res.ok ? "Could not save this title." : res.error);
        return;
      }
      putOfflineManga(res.data.manga);
      setProgress(0);
      await cacheOfflineUrls(res.data.imageUrls, (done, total) => setProgress(Math.round((done / Math.max(total, 1)) * 100)));
      setProgress(null);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-lg border px-5 font-ui text-sm font-semibold transition-colors disabled:opacity-70",
          saved ? "border-success/50 bg-success/10 text-success" : "border-border bg-surface text-foreground hover:bg-surface-hover",
        )}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : saved ? <CloudCheck className="size-4" /> : <WifiOff className="size-4" />}
        {pending && progress !== null ? `Saving… ${progress}%` : saved ? "Saved Offline" : "Save Offline"}
      </button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {!saved && !error && limit !== null ? (
        <p className="text-xs text-text-muted">{used}/{limit} titles saved offline</p>
      ) : null}
    </div>
  );
}
