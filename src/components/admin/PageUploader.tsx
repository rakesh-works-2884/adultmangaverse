"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  ArrowDown, ArrowUp, FileText, GripVertical, Loader2, Trash2, Upload, X,
} from "lucide-react";
import { uploadChapterPage, uploadChapterPdf, reorderPages, deletePage, type UploadedPage } from "@/actions/pages";
import { btnPrimary, btnGhost } from "@/components/admin/styles";

type Pending = { file: File; url: string; isPdf: boolean };

export function PageUploader({
  chapterId,
  initialPages,
  mangaTitle,
  chapterNumber,
}: {
  chapterId: string;
  initialPages: UploadedPage[];
  mangaTitle: string;
  chapterNumber: string;
}) {
  const [pages, setPages] = useState<UploadedPage[]>(initialPages);
  const [pending, setPending] = useState<Pending[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const dragIndex = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const accepted = Array.from(list)
      .filter((f) => f.type.startsWith("image/") || f.type === "application/pdf")
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    setPending((prev) => [
      ...prev,
      ...accepted.map((file) => {
        const isPdf = file.type === "application/pdf";
        return { file, isPdf, url: isPdf ? "" : URL.createObjectURL(file) };
      }),
    ]);
    setError(null);
  }

  function removePending(i: number) {
    setPending((prev) => {
      if (prev[i]?.url) URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  async function uploadAll() {
    if (pending.length === 0) return;
    setError(null);
    const queue = [...pending];
    setProgress({ done: 0, total: queue.length });
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      const fd = new FormData();
      fd.set("file", item.file);
      if (item.isPdf) {
        const res = await uploadChapterPdf(chapterId, fd);
        if (!res.ok) {
          setError(`PDF failed “${item.file.name}”: ${res.error}`);
          setProgress(null);
          return;
        }
        if (res.data) setPages((prev) => [...prev, ...res.data!]);
      } else {
        const res = await uploadChapterPage(chapterId, fd);
        if (!res.ok) {
          setError(`Upload failed on “${item.file.name}”: ${res.error}`);
          setProgress(null);
          return;
        }
        if (res.data) setPages((prev) => [...prev, res.data!]);
        if (item.url) URL.revokeObjectURL(item.url);
      }
      setProgress({ done: i + 1, total: queue.length });
    }
    setPending([]);
    setProgress(null);
  }

  function persistOrder(next: UploadedPage[]) {
    setPages(next);
    startTransition(async () => {
      const res = await reorderPages(chapterId, next.map((p) => p.id));
      if (!res.ok) setError(res.error);
    });
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= pages.length) return;
    const next = [...pages];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    persistOrder(next);
  }

  function onDrop(to: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === to) return;
    move(from, to);
  }

  function onDelete(id: string) {
    if (!confirm("Delete this page?")) return;
    startTransition(async () => {
      const res = await deletePage(id);
      if (!res.ok) return setError(res.error);
      setPages((prev) => prev.filter((p) => p.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        onClick={() => fileInput.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-bg-soft px-6 py-10 text-center transition-colors hover:border-primary/60"
      >
        <Upload className="size-7 text-primary" strokeWidth={1.5} />
        <p className="text-sm font-medium">Drag &amp; drop images or a PDF here, or click to choose</p>
        <p className="text-xs text-text-muted">Images (JPG / PNG / WebP) ordered by filename, or a PDF that&apos;s split into pages · all converted to WebP</p>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      </div>

      {/* Pending queue */}
      {pending.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">{pending.length} file{pending.length === 1 ? "" : "s"} ready to upload</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPending([])} className={btnGhost} disabled={!!progress}>Clear</button>
              <button type="button" onClick={uploadAll} className={btnPrimary} disabled={!!progress}>
                {progress ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {progress ? `Uploading ${progress.done}/${progress.total}…` : `Upload ${pending.length}`}
              </button>
            </div>
          </div>
          {progress ? (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
              <div className="h-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
            {pending.map((p, i) => (
              <div key={i} className="group relative aspect-[2/3] overflow-hidden rounded border border-border bg-bg">
                {p.isPdf ? (
                  <div className="flex size-full flex-col items-center justify-center gap-1 p-1 text-center">
                    <FileText className="size-6 text-primary" strokeWidth={1.5} />
                    <span className="line-clamp-2 text-[10px] text-text-muted">{p.file.name}</span>
                    <span className="rounded bg-primary/15 px-1 text-[9px] font-bold text-primary">PDF</span>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element -- transient blob preview */
                  <img src={p.url} alt={p.file.name} className="size-full object-cover" />
                )}
                <button type="button" onClick={() => removePending(i)} className="absolute right-1 top-1 grid size-6 place-items-center rounded bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100" aria-label="Remove">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Existing pages */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Pages ({pages.length})</h2>
          {busy ? <span className="flex items-center gap-1 text-xs text-text-muted"><Loader2 className="size-3.5 animate-spin" /> saving order…</span> : null}
        </div>
        {pages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-bg-soft px-4 py-10 text-center text-sm text-text-muted">
            No pages yet. Upload images above — for {mangaTitle} chapter {chapterNumber}.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {pages.map((p, i) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => { dragIndex.current = i; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(i)}
                className="group relative overflow-hidden rounded-lg border border-border bg-bg"
              >
                <div className="relative aspect-[2/3]">
                  <Image src={p.imageUrl} alt={`${mangaTitle} chapter ${chapterNumber} page ${i + 1}`} fill sizes="160px" className="object-cover" unoptimized />
                </div>
                <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-1.5">
                  <span className="flex items-center gap-1 text-xs font-medium text-white">
                    <GripVertical className="size-3.5 cursor-grab" /> {i + 1}
                  </span>
                  <button type="button" onClick={() => onDelete(p.id)} className="grid size-6 place-items-center rounded bg-black/50 text-white opacity-0 transition-opacity hover:bg-danger group-hover:opacity-100" aria-label="Delete page">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="grid size-6 place-items-center rounded bg-black/50 text-white disabled:opacity-30" aria-label="Move up"><ArrowUp className="size-3.5" /></button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === pages.length - 1} className="grid size-6 place-items-center rounded bg-black/50 text-white disabled:opacity-30" aria-label="Move down"><ArrowDown className="size-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
