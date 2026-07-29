"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, WifiOff } from "lucide-react";
import { getOfflineManga, deleteOfflineManga } from "@/lib/offline-store";
import { evictOfflineUrls } from "@/lib/sw-client";

// Static, self-contained, zero-network reader for titles saved via the
// OfflineButton. All chapter switching happens through local React state
// (never the router) so nothing here ever needs to reach the server once
// the page's own JS bundle is cached — see public/sw.js.

function OfflineReaderInner() {
  const params = useSearchParams();
  const initialMangaId = params.get("manga");
  const [mangaId] = useState(initialMangaId);
  const [chapterIdx, setChapterIdx] = useState(0);

  const manga = useMemo(() => (mangaId ? getOfflineManga(mangaId) : null), [mangaId]);

  if (!mangaId || !manga) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center text-foreground">
        <WifiOff className="size-10 text-text-muted" />
        <p className="text-sm text-text-muted">This title isn&apos;t saved offline on this device.</p>
        <Link href="/offline" className="inline-flex h-10 items-center rounded-lg bg-primary px-5 font-ui text-sm font-semibold text-primary-foreground">
          Go to Offline Library
        </Link>
      </div>
    );
  }

  const chapter = manga.chapters[chapterIdx];

  function remove() {
    if (!manga) return;
    const urls = [...(manga.coverUrl ? [manga.coverUrl] : []), ...manga.chapters.flatMap((c) => c.pages.map((p) => p.imageUrl))];
    void evictOfflineUrls(urls);
    deleteOfflineManga(manga.id);
    window.location.href = "/offline";
  }

  return (
    <div onContextMenu={(e) => e.preventDefault()} className="min-h-screen select-none bg-reader text-foreground">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/offline" className="flex min-w-0 items-center gap-2 text-sm text-white/80 hover:text-white">
            <ArrowLeft className="size-5 shrink-0" />
            <span className="truncate">{manga.title}</span>
          </Link>
          <button type="button" onClick={remove} className="shrink-0 text-xs text-white/50 hover:text-danger">
            Remove
          </button>
        </div>
      </div>

      {chapter ? (
        <div className="mx-auto max-w-3xl pb-10 pt-4">
          {chapter.pages.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- offline pages must bypass the image optimizer.
            <img
              key={p.id}
              src={p.imageUrl}
              alt={`${manga.title} chapter ${chapter.number} page ${i + 1}`}
              width={p.width}
              height={p.height}
              className="pointer-events-none mx-auto h-auto w-full select-none"
              draggable={false}
            />
          ))}

          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-8">
            <button
              type="button"
              onClick={() => setChapterIdx((i) => Math.max(0, i - 1))}
              disabled={chapterIdx === 0}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-white/15 px-4 text-sm text-white/80 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" /> Prev
            </button>
            <select
              value={chapterIdx}
              onChange={(e) => setChapterIdx(Number(e.target.value))}
              className="h-10 max-w-[50%] flex-1 rounded-lg border border-white/15 bg-black/50 px-2 text-sm text-white outline-none"
            >
              {manga.chapters.map((c, i) => (
                <option key={c.id} value={i} className="bg-bg text-foreground">
                  Chapter {c.number}
                  {c.title ? ` — ${c.title}` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setChapterIdx((i) => Math.min(manga.chapters.length - 1, i + 1))}
              disabled={chapterIdx === manga.chapters.length - 1}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-white/15 px-4 text-sm text-white/80 hover:bg-white/10 disabled:opacity-30"
            >
              Next <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <p className="px-4 py-16 text-center text-sm text-text-muted">No chapters were saved for this title.</p>
      )}
    </div>
  );
}

export default function OfflineReaderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <OfflineReaderInner />
    </Suspense>
  );
}
