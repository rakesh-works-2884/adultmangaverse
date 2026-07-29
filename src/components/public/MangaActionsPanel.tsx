"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getMangaActionsState, type MangaActionsState } from "@/actions/manga-user";
import { BookmarkButton } from "@/components/public/BookmarkButton";
import { OfflineButton } from "@/components/public/OfflineButton";
import { ContinueReadingButton } from "@/components/public/ContinueReadingButton";

/**
 * Continue-reading link / bookmark / offline-save — all session-specific,
 * fetched client-side (see getMangaActionsState) instead of the manga detail
 * page fetching them server-side via auth(), so that page can be ISR-cached.
 */
export function MangaActionsPanel({ mangaId, mangaSlug }: { mangaId: string; mangaSlug: string }) {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  const [state, setState] = useState<MangaActionsState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    const task = isLoggedIn ? getMangaActionsState(mangaId) : Promise.resolve(null);
    task.then((s) => {
      if (cancelled) return;
      setState(s);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mangaId, isLoggedIn, status]);

  if (status === "loading" || !loaded) {
    return (
      <>
        <div className="h-11 w-36 animate-pulse rounded-lg bg-surface" />
        <div className="h-11 w-11 animate-pulse rounded-lg bg-surface" />
      </>
    );
  }

  return (
    <>
      {isLoggedIn && state?.continueChapter ? (
        <Link
          href={`/manga/${mangaSlug}/${state.continueChapter}`}
          className="btn-3d-outline inline-flex h-11 items-center gap-2 rounded-lg border border-primary/40 px-5 font-ui text-sm font-semibold text-primary hover:bg-primary/10"
        >
          Continue Ch. {state.continueChapter}
        </Link>
      ) : !isLoggedIn ? (
        <ContinueReadingButton slug={mangaSlug} />
      ) : null}
      <BookmarkButton mangaId={mangaId} initialBookmarked={state?.isBookmarked ?? false} />
      <OfflineButton
        mangaId={mangaId}
        tier={state?.offlineUsage?.tier ?? "FREE"}
        limit={state?.offlineUsage ? state.offlineUsage.limit : 0}
        used={state?.offlineUsage?.used ?? 0}
      />
    </>
  );
}
