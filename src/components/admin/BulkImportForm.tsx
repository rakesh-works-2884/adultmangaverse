"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, UploadCloud, XCircle } from "lucide-react";
import type { ImportResult } from "@/app/api/admin/import/route";

export function BulkImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState("");

  async function responseBody(res: Response) {
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const fallback = res.status === 413 ? "The server rejected the upload size. Please retry with the latest version of this page."
        : res.status === 504 ? "Import processing timed out. Check the admin manga list before retrying, or split the ZIP into smaller chapters."
        : `Upload failed (HTTP ${res.status}). Please retry.`;
      throw new Error(body?.error || fallback);
    }
    if (!body) throw new Error("The server returned an unexpected response. Please retry.");
    return body;
  }

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
    if (file.size > 200 * 1024 * 1024) { setError("Select a ZIP file up to 200 MB."); return; }
    setPending(true);
    setElapsed(0);
    setError(null);
    setResult(null);

    let token: string | undefined;
    try {
      let res: Response;
      if (file.size > 3 * 1024 * 1024) {
        setProgress("Preparing upload…");
        const upload = await responseBody(await fetch("/api/admin/import/upload", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, size: file.size }),
        }));
        token = upload.token;
        const chunkBytes = upload.chunkBytes as number;
        for (let offset = 0, part = 0; offset < file.size; offset += chunkBytes, part++) {
          setProgress(`Uploading ${Math.round(offset / file.size * 100)}%`);
          await responseBody(await fetch("/api/admin/import/upload", {
            method: "PUT",
            headers: { "x-upload-token": token!, "x-upload-part": String(part), "Content-Type": "application/octet-stream" },
            body: file.slice(offset, offset + chunkBytes),
          }));
        }
        setProgress("Upload complete. Processing pages…");
        res = await fetch("/api/admin/import", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, title: title.trim() }),
        });
      } else {
      setProgress("Uploading and processing pages…");
      const fd = new FormData();
      fd.set("file", file);
      if (title.trim()) fd.set("title", title.trim());
      res = await fetch("/api/admin/import", { method: "POST", body: fd });
      }
      const body = await responseBody(res);
      setResult(body.result as ImportResult);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload interrupted. Check your connection and retry.");
    } finally {
      if (token) await fetch("/api/admin/import/upload", { method: "DELETE", headers: { "x-upload-token": token } }).catch(() => {});
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-5">
        <input
          type="file"
          accept=".zip"
          aria-label="Chapter ZIP file"
          disabled={pending}
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setTitle(""); setError(null); setResult(null); }}
          className="text-sm text-text-muted file:mr-3 file:h-9 file:rounded-lg file:border file:border-border file:bg-bg-soft file:px-3 file:text-sm file:font-medium file:text-foreground"
        />
        <div className="w-full space-y-2">
          <label htmlFor="import-title" className="text-sm font-medium">Title override (optional)</label>
          <input id="import-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={pending} maxLength={300} placeholder={file?.name.replace(/\.zip$/i, "") || "Enter a title"} className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm" aria-describedby="import-title-help" />
          <p id="import-title-help" className="text-xs text-text-muted">XML is optional. Leave this blank to use the XML title, or the ZIP filename when there is no XML. A matching title adds the next chapter.</p>
        </div>
        <button
          type="submit"
          disabled={!file || pending}
          className="btn-3d inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          {pending ? `Importing… ${elapsed}s` : "Import ZIP"}
        </button>
        {file ? <span className="text-xs text-text-muted">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span> : null}
        {pending ? <span role="status" className="text-xs text-text-muted">{progress} Keep this tab open.</span> : null}
      </form>

      {error ? <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}

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
