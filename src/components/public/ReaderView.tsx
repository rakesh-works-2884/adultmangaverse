"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Columns, Loader2, ScrollText, X, ZoomIn, ZoomOut, Maximize, Minimize, Settings2 } from "lucide-react";
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
  const [showControls, setShowControls] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [displayMessage, setDisplayMessage] = useState("");
  function changeZoom(delta: number) {
    setZoom(value => Math.max(0.5, Math.min(3, Math.round((value + delta) * 100) / 100)));
    setShowControls(true);
  }
  async function toggleFullscreen() {
    setDisplayMessage("");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (scrollRef.current?.requestFullscreen) await scrollRef.current.requestFullscreen();
      else setDisplayMessage("Fullscreen is not supported by this browser. The reader already fills the page.");
    } catch { setDisplayMessage("Fullscreen is unavailable in this browser or embedded view. Try opening the reader in a browser tab."); }
  }
  useEffect(() => {
    const onFullscreen = () => { setFullscreen(document.fullscreenElement === scrollRef.current); setShowControls(true); };
    document.addEventListener("fullscreenchange", onFullscreen);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("fullscreenchange", onFullscreen); document.body.style.overflow = previousOverflow; };
  }, []);
  const [mode, setMode] = useState<"vertical" | "paged">("vertical");
  const [pageIdx, setPageIdx] = useState(0);
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
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName))) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") { e.preventDefault(); changeZoom(0.25); return; }
      if (e.key === "-") { e.preventDefault(); changeZoom(-0.25); return; }
      if (e.key === "0") { setZoom(1); setShowControls(true); return; }
      if (e.key.toLowerCase() === "f") { e.preventDefault(); void toggleFullscreen(); return; }
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
      if (y === lastScroll.current) return;
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
      className="fixed inset-0 z-50 select-none overflow-auto bg-reader"
    >
      {!showControls ? <button type="button" onClick={() => setShowControls(true)} aria-label="Show reader controls" className="fixed right-3 top-3 z-[70] grid size-11 place-items-center rounded-xl border border-white/20 bg-black text-white"><Settings2 className="size-5" /></button> : null}
      {/* Top bar */}
      <div className={cn("fixed inset-x-0 top-0 z-[60] border-b border-white/10 bg-black/80 backdrop-blur-xl transition-transform", showControls ? "translate-y-0" : "-translate-y-full")}>
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4">
          <Link href={`/manga/${mangaSlug}`} className="flex min-w-0 items-center gap-2 text-sm text-white/80 hover:text-white">
            <X className="size-5 shrink-0" />
            <span className="truncate">{mangaTitle}</span>
          </Link>
          {chapters.length > 1 ? <span className="shrink-0 text-sm font-medium text-white">Ch. {chapterNumber}</span> : null}
        </div>
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 px-3 pb-2" role="group" aria-label="Reader display controls">
          <button type="button" onClick={() => changeZoom(-0.25)} disabled={zoom <= 0.5} aria-label="Zoom out" className="grid size-10 place-items-center rounded-lg bg-white/10 text-white disabled:opacity-30"><ZoomOut className="size-5" /></button>
          <button type="button" onClick={() => setZoom(1)} aria-label="Reset zoom" title="Reset zoom (0)" className="h-10 min-w-16 rounded-lg bg-white/10 px-3 text-sm tabular-nums text-white">{Math.round(zoom * 100)}%</button>
          <button type="button" onClick={() => changeZoom(0.25)} disabled={zoom >= 3} aria-label="Zoom in" className="grid size-10 place-items-center rounded-lg bg-white/10 text-white disabled:opacity-30"><ZoomIn className="size-5" /></button>
          <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} aria-pressed={fullscreen} title="Fullscreen (F)" className="ml-2 flex h-10 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm text-white">{fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}<span className="hidden sm:inline">{fullscreen ? "Exit fullscreen" : "Fullscreen"}</span></button>
        </div>
        {displayMessage ? <p role="status" className="px-4 pb-2 text-center text-xs text-white">{displayMessage}</p> : null}
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
        <div className="mx-auto pb-28 pt-28" style={{ width: `calc(min(100vw, 768px) * ${zoom})` }}>
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
        <div className="relative mx-auto flex min-h-screen w-max min-w-full items-center justify-center px-2 pb-24 pt-28">
          {pages[pageIdx] ? (
            <Image key={pages[pageIdx].id} src={pages[pageIdx].imageUrl} alt={`${mangaTitle} chapter ${chapterNumber} page ${pageIdx + 1}`} width={pages[pageIdx].width} height={pages[pageIdx].height} sizes="(max-width: 900px) 100vw, 800px" style={{ width: `calc(min(calc(100vw - 16px), calc((100dvh - 224px) * ${pages[pageIdx].width / pages[pageIdx].height})) * ${zoom})` }} className="pointer-events-none h-auto max-w-none object-contain select-none" draggable={false} priority unoptimized />
          ) : null}
          <button type="button" onClick={prevPage} aria-label="Previous page" className="fixed bottom-20 left-2 z-10 grid size-11 place-items-center rounded-lg bg-black/80 text-white" > <ChevronLeft className="size-6" /></button>
          <button type="button" onClick={nextPage} aria-label="Next page" className="fixed bottom-20 right-2 z-10 grid size-11 place-items-center rounded-lg bg-black/80 text-white" > <ChevronRight className="size-6" /></button>
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
