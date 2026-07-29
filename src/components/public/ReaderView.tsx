"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Columns, Loader2, ScrollText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveProgress, recordChapterView, getChapterPages } from "@/actions/reader";

type Pg = { id: string; imageUrl: string; width: number; height: number };
type ChapterRef = { number: string; title: string | null };

export function ReaderView({
  mangaSlug,
  mangaTitle,
  mangaId,
  chapterId,
  chapterNumber,
  prevNumber,
  nextNumber,
  chapters,
}: {
  mangaSlug: string;
  mangaTitle: string;
  mangaId: string;
  chapterId: string;
  chapterNumber: string;
  prevNumber: string | null;
  nextNumber: string | null;
  chapters: ChapterRef[];
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScroll = useRef(0);
  const [mode, setMode] = useState<"vertical" | "paged">("vertical");
  const [pageIdx, setPageIdx] = useState(0);
  const [showControls, setShowControls] = useState(true);
  // Signed image URLs can't live in the page's own (cacheable) render — see
  // getChapterPages for why — so this component fetches them itself right
  // after mounting. Result is tagged with the chapterId it was fetched for,
  // so switching chapters (chapterId changes, same component instance)
  // derives back to "loading" for the new chapter without a synchronous
  // setState at the top of the effect.
  const [pageFetch, setPageFetch] = useState<{ chapterId: string; pages: Pg[] } | { chapterId: string; failed: true } | null>(null);
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";

  useEffect(() => {
    let cancelled = false;
    getChapterPages(chapterId).then((result) => {
      if (cancelled) return;
      setPageFetch(result.length === 0 ? { chapterId, failed: true } : { chapterId, pages: result });
    });
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  const pages = pageFetch && pageFetch.chapterId === chapterId && "pages" in pageFetch ? pageFetch.pages : null;
  const loadFailed = pageFetch !== null && pageFetch.chapterId === chapterId && "failed" in pageFetch;

  useEffect(() => {
    if (status === "loading") return; // wait for the real session before deciding how to persist progress
    void recordChapterView(chapterId);
    if (isLoggedIn) {
      void saveProgress(mangaId, chapterId);
    } else {
      try {
        localStorage.setItem(`amv_progress_${mangaSlug}`, chapterNumber);
        window.dispatchEvent(new Event("amv-progress"));
      } catch {
        /* ignore */
      }
    }
  }, [chapterId, isLoggedIn, status, mangaId, mangaSlug, chapterNumber]);

  const goPrevChapter = () => prevNumber && router.push(`/manga/${mangaSlug}/${prevNumber}`);
  const goNextChapter = () => nextNumber && router.push(`/manga/${mangaSlug}/${nextNumber}`);
  const nextPage = () => (pages && pageIdx < pages.length - 1 ? setPageIdx((p) => p + 1) : goNextChapter());
  const prevPage = () => (pageIdx > 0 ? setPageIdx((p) => p - 1) : goPrevChapter());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mode === "paged") {
        if (e.key === "ArrowRight") nextPage();
        if (e.key === "ArrowLeft") prevPage();
      } else {
        if (e.key === "ArrowRight") goNextChapter();
        if (e.key === "ArrowLeft") goPrevChapter();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pageIdx, pages?.length, prevNumber, nextNumber]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop;
      setShowControls(y < lastScroll.current || y < 120);
      lastScroll.current = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={scrollRef}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-50 select-none overflow-y-auto bg-reader"
    >
      {/* Top bar */}
      <div className={cn("fixed inset-x-0 top-0 z-[60] border-b border-white/10 bg-black/80 backdrop-blur-xl transition-transform", showControls ? "translate-y-0" : "-translate-y-full")}>
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4">
          <Link href={`/manga/${mangaSlug}`} className="flex min-w-0 items-center gap-2 text-sm text-white/80 hover:text-white">
            <X className="size-5 shrink-0" />
            <span className="truncate">{mangaTitle}</span>
          </Link>
          {chapters.length > 1 ? <span className="shrink-0 text-sm font-medium text-white">Ch. {chapterNumber}</span> : null}
        </div>
      </div>

      {/* Pages. `unoptimized` — imageUrl is a short-lived signed URL that
          changes every render; next/image's optimizer cache keys on the
          full URL, so it would never get a cache hit and would reprocess
          already-WebP-optimized art on every request for nothing. */}
      {loadFailed ? (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-white/80">This chapter isn&apos;t available right now — it may have been unpublished.</p>
          <Link href={`/manga/${mangaSlug}`} className="text-sm text-primary hover:underline">Back to series</Link>
        </div>
      ) : !pages ? (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin text-white/40" />
        </div>
      ) : mode === "vertical" ? (
        <div className="mx-auto max-w-3xl pb-28 pt-16">
          {pages.map((p, i) => (
            <Image key={p.id} src={p.imageUrl} alt={`${mangaTitle} chapter ${chapterNumber} page ${i + 1}`} width={p.width} height={p.height} sizes="(max-width: 768px) 100vw, 768px" className="pointer-events-none mx-auto h-auto w-full select-none" draggable={false} priority={i < 2} unoptimized />
          ))}
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-8">
            <button type="button" onClick={goPrevChapter} disabled={!prevNumber} className="inline-flex h-10 items-center gap-1 rounded-lg border border-white/15 px-4 text-sm text-white/80 hover:bg-white/10 disabled:opacity-30"><ChevronLeft className="size-4" /> Prev</button>
            <Link href={`/manga/${mangaSlug}`} className="text-sm text-white/60 hover:text-white">Back to series</Link>
            <button type="button" onClick={goNextChapter} disabled={!nextNumber} className="inline-flex h-10 items-center gap-1 rounded-lg border border-white/15 px-4 text-sm text-white/80 hover:bg-white/10 disabled:opacity-30">Next <ChevronRight className="size-4" /></button>
          </div>
        </div>
      ) : (
        <div className="relative flex min-h-screen items-center justify-center px-2 pb-24 pt-16">
          {pages[pageIdx] ? (
            <Image key={pages[pageIdx].id} src={pages[pageIdx].imageUrl} alt={`${mangaTitle} chapter ${chapterNumber} page ${pageIdx + 1}`} width={pages[pageIdx].width} height={pages[pageIdx].height} sizes="(max-width: 900px) 100vw, 800px" className="pointer-events-none max-h-[85vh] w-auto object-contain select-none" draggable={false} priority unoptimized />
          ) : null}
          <button type="button" onClick={prevPage} aria-label="Previous page" className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize" />
          <button type="button" onClick={nextPage} aria-label="Next page" className="absolute inset-y-0 right-0 w-1/3 cursor-e-resize" />
          <span className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white/90">{pageIdx + 1} / {pages.length}</span>
        </div>
      )}

      {/* Bottom controls */}
      <div className={cn("fixed inset-x-0 bottom-0 z-[60] border-t border-white/10 bg-black/80 backdrop-blur-xl transition-transform", showControls ? "translate-y-0" : "translate-y-full")}>
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-2 px-3">
          <button type="button" onClick={goPrevChapter} disabled={!prevNumber} className="grid size-10 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 disabled:opacity-30" aria-label="Previous chapter"><ChevronLeft className="size-5" /></button>
          {chapters.length > 1 ? (
            <select value={chapterNumber} onChange={(e) => router.push(`/manga/${mangaSlug}/${e.target.value}`)} className="h-10 max-w-[55%] flex-1 rounded-lg border border-white/15 bg-black/50 px-2 text-sm text-white outline-none">
              {chapters.map((c) => (
                <option key={c.number} value={c.number} className="bg-bg text-foreground">Chapter {c.number}{c.title ? ` — ${c.title}` : ""}</option>
              ))}
            </select>
          ) : (
            <span className="flex-1 truncate text-center text-sm text-white/60">{mangaTitle}</span>
          )}
          <button type="button" onClick={() => setMode((m) => (m === "vertical" ? "paged" : "vertical"))} className="grid size-10 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10" aria-label="Toggle reading mode" title={mode === "vertical" ? "Switch to paged" : "Switch to vertical"}>
            {mode === "vertical" ? <Columns className="size-5" /> : <ScrollText className="size-5" />}
          </button>
          <button type="button" onClick={goNextChapter} disabled={!nextNumber} className="grid size-10 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 disabled:opacity-30" aria-label="Next chapter"><ChevronRight className="size-5" /></button>
        </div>
      </div>
    </div>
  );
}
