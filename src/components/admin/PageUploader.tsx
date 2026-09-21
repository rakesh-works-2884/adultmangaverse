"use client";

import { useRef, useState } from "react";
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
  const [operation, setOperation] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const locked = useRef(false);
  const busy = !!operation;

  function begin(label: string) {
    if (locked.current) return false;
    locked.current = true; setOperation(label); setNotice(""); setError(null); return true;
  }
  function finish() { locked.current = false; setOperation(""); }
  const dragIndex = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list || locked.current) return;
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
    if (!pending.length || !begin("Preparing upload…")) return;
    const queue = [...pending];
    setProgress({ done: 0, total: queue.length });
    try {
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        setOperation(`${item.isPdf ? "Processing PDF" : "Uploading image"} ${i + 1} of ${queue.length}: ${item.file.name}`);
        const fd = new FormData(); fd.set("file", item.file);
        const result = item.isPdf ? await uploadChapterPdf(chapterId, fd) : await uploadChapterPage(chapterId, fd);
        if (!result.ok) { setError(`${item.file.name}: ${result.error}`); return; }
        if (result.data) {
          const added = Array.isArray(result.data) ? result.data : [result.data];
          setPages(prev => [...prev, ...added]);
        }
        setPending(prev => prev.filter(entry => entry !== item));
        if (item.url) URL.revokeObjectURL(item.url);
        setProgress({ done: i + 1, total: queue.length });
      }
      setNotice("Upload complete. Pages are saved.");
      if (fileInput.current) fileInput.current.value = "";
    } catch { setError("The upload was interrupted. Completed files are saved; retry the remaining files."); }
    finally { setProgress(null); finish(); }
  }

  async function persistOrder(next: UploadedPage[]) {
    if (!begin("Saving page order…")) return;
    const previous = pages;
    setPages(next);
    try {
      const res = await reorderPages(chapterId, next.map(p => p.id));
      if (!res.ok) { setPages(previous); setError(res.error); }
      else setNotice("Page order saved.");
    } catch { setPages(previous); setError("Could not save page order. Please retry."); }
    finally { finish(); }
  }

  function move(from: number, to: number) {
    if (locked.current || to < 0 || to >= pages.length) return;
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

  async function onDelete(id: string) {
    if (locked.current || !confirm("Delete this page?")) return;
    if (!begin("Deleting page…")) return;
    setDeletingId(id);
    try {
      const res = await deletePage(id);
      if (!res.ok) { setError(res.error); return; }
      setPages(prev => prev.filter(p => p.id !== id));
      setNotice("Page deleted.");
    } catch { setError("Could not delete the page. Please retry."); }
    finally { setDeletingId(null); finish(); }
  }

  return (
    <div className="space-y-6" aria-busy={busy}>
      <div role="status" aria-live="polite" aria-atomic="true">
        {busy || notice ? <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
          {busy ? <Loader2 className="size-5 shrink-0 animate-spin text-primary" /> : <span className="text-success">✓</span>}
          <span className="break-all">{operation || notice}</span>
        </div> : null}
        {progress ? <progress aria-label="Files uploaded" value={progress.done} max={progress.total} className="mt-2 h-2 w-full accent-primary" /> : null}
      </div>
      {error ? <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        onClick={() => { if (!busy) fileInput.current?.click(); }}
        role="button" tabIndex={busy ? -1 : 0} aria-disabled={busy}
        onKeyDown={(e) => { if (!busy && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); fileInput.current?.click(); } }}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-bg-soft px-6 py-10 text-center transition-colors hover:border-primary/60"
      >
        <Upload className="size-7 text-primary" strokeWidth={1.5} />
        <p className="text-sm font-medium">Drag &amp; drop images or a PDF here, or click to choose</p>
        <p className="text-xs text-text-muted">Images (JPG / PNG / WebP) ordered by filename, or a PDF that&apos;s split into pages · all converted to WebP</p>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple disabled={busy} hidden onChange={(e) => addFiles(e.target.files)} />
      </div>

      {/* Pending queue */}
      {pending.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">{pending.length} file{pending.length === 1 ? "" : "s"} ready to upload</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { pending.forEach(p => { if(p.url) URL.revokeObjectURL(p.url); }); setPending([]); if(fileInput.current) fileInput.current.value = ""; }} className={btnGhost} disabled={busy}>Clear</button>
              <button type="button" onClick={uploadAll} className={btnPrimary} disabled={busy}>
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
                <button type="button" disabled={busy} onClick={() => removePending(i)} className="absolute right-1 top-1 grid size-6 place-items-center rounded bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100" aria-label="Remove">
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
                draggable={!busy}
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
                  <button type="button" disabled={busy} onClick={() => onDelete(p.id)} className="grid size-6 place-items-center rounded bg-black/50 text-white opacity-0 transition-opacity hover:bg-danger group-hover:opacity-100" aria-label="Delete page">
                    {deletingId === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={busy || i === 0} className="grid size-6 place-items-center rounded bg-black/50 text-white disabled:opacity-30" aria-label="Move up"><ArrowUp className="size-3.5" /></button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={busy || i === pages.length - 1} className="grid size-6 place-items-center rounded bg-black/50 text-white disabled:opacity-30" aria-label="Move down"><ArrowDown className="size-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
