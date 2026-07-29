"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, UploadCloud, XCircle } from "lucide-react";
import type { ImportResult } from "@/app/api/admin/import/route";

export function BulkImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Large ZIPs (hundreds of MB, hundreds of pages) can legitimately take a
  // couple of minutes to upload + re-encode + push to storage. Without this,
  // the button just spins with no sense of whether it's stuck.
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [pending]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    setPending(true);
    setElapsed(0);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/import", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Import failed.");
        return;
      }
      setResult(body.result as ImportResult);
    } catch {
      setError("Could not reach the server. The ZIP may be too large or the connection dropped.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-5">
        <input
          type="file"
          accept=".zip"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-text-muted file:mr-3 file:h-9 file:rounded-lg file:border file:border-border file:bg-bg-soft file:px-3 file:text-sm file:font-medium file:text-foreground"
        />
        <button
          type="submit"
          disabled={!file || pending}
          className="btn-3d inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          {pending ? `Importing… ${elapsed}s` : "Import ZIP"}
        </button>
        {file ? <span className="text-xs text-text-muted">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span> : null}
        {pending ? <span className="text-xs text-text-muted">Large ZIPs can take a few minutes — this is re-encoding and uploading every page, don&apos;t close the tab.</span> : null}
      </form>

      {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}

      {result ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${result.ok ? "border-success/40 bg-success/10 text-success" : "border-danger/40 bg-danger/10 text-danger"}`}>
          {result.ok ? (
            <span className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>
                {result.mode === "created" ? (
                  <>
                    Created <Link href={`/manga/${result.slug}`} className="underline hover:text-highlight">{result.title}</Link> with chapter {result.chapter} ({result.pages} page{result.pages === 1 ? "" : "s"}).
                  </>
                ) : (
                  <>
                    Added chapter {result.chapter} ({result.pages} page{result.pages === 1 ? "" : "s"}) to the existing title <Link href={`/manga/${result.slug}`} className="underline hover:text-highlight">{result.title}</Link>.
                  </>
                )}
                {" "}Both the title and this chapter are unpublished by default — review in the{" "}
                <Link href={`/admin/manga/${result.id}/edit`} className="underline hover:text-highlight">manga editor</Link> before publishing.
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <XCircle className="size-4 shrink-0" /> {result.error}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
