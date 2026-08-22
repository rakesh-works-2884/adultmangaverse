"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import { saveSeoRedirect, deleteSeoRedirect, clear404Logs, convert404ToRedirect } from "@/actions/seo-actions";
import { adminInput, adminLabel, btnPrimary, btnDanger } from "@/components/admin/styles";

interface SeoRedirectRule {
  id: string;
  sourceUrl: string;
  destinationUrl: string;
  statusCode: number;
  hits: number;
}

interface Seo404Entry {
  id: string;
  url: string;
  hits: number;
  updatedAt: Date;
}

export function SeoRedirectsTab({
  redirects,
  logs,
}: {
  redirects: SeoRedirectRule[];
  logs: Seo404Entry[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const [convertTargetId, setConvertTargetId] = useState<string | null>(null);
  const [destInput, setDestInput] = useState("");

  function onAddRedirect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveSeoRedirect(fd);
      if (!res.ok) return setError(res.error || "Failed to add redirect rule.");
      setSaved(true);
      (e.target as HTMLFormElement).reset();
    });
  }

  function onDeleteRedirect(id: string) {
    if (!confirm("Are you sure you want to delete this redirect rule?")) return;
    startTransition(async () => {
      await deleteSeoRedirect(id);
    });
  }

  function onClear404s() {
    if (!confirm("Clear all recorded 404 error logs?")) return;
    startTransition(async () => {
      await clear404Logs();
    });
  }

  function handleConvert404(id: string) {
    if (!destInput.trim()) return alert("Please enter a destination URL.");
    startTransition(async () => {
      const res = await convert404ToRedirect(id, destInput.trim());
      if (!res.ok) alert(res.error || "Failed to convert 404.");
      setConvertTargetId(null);
      setDestInput("");
    });
  }

  return (
    <div className="space-y-8">
      {/* SECTION 1: Add New 301/302 Redirect Rule */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <h3 className="font-heading text-base font-semibold text-text">Add New URL Redirection</h3>

        {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p> : null}
        {saved ? <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">Redirect rule saved.</p> : null}

        <form onSubmit={onAddRedirect} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4 space-y-1">
            <label className={adminLabel}>Source Path / URL</label>
            <input name="sourceUrl" placeholder="/old-manga-url" required className={adminInput} />
          </div>

          <div className="sm:col-span-4 space-y-1">
            <label className={adminLabel}>Destination Path / URL</label>
            <input name="destinationUrl" placeholder="/manga/new-manga-url" required className={adminInput} />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className={adminLabel}>Status Code</label>
            <select name="statusCode" defaultValue="301" className={adminInput}>
              <option value="301">301 Permanent</option>
              <option value="302">302 Temporary</option>
              <option value="307">307 Temporary</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <button type="submit" disabled={pending} className={`${btnPrimary} w-full justify-center`}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Active Redirect Rules List */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border bg-bg/50 px-5 py-3.5 flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-text">Active Redirection Rules ({redirects.length})</h3>
        </div>

        {redirects.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-muted">No custom redirect rules configured yet.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {redirects.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 p-4 text-xs">
                <div className="flex items-center gap-3 font-mono">
                  <span className="rounded bg-accent/10 text-accent px-2 py-0.5 font-bold">{r.statusCode}</span>
                  <span className="text-text font-medium">{r.sourceUrl}</span>
                  <ArrowRight className="size-3.5 text-text-muted" />
                  <span className="text-emerald-400 font-medium">{r.destinationUrl}</span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-text-muted text-[11px] font-mono">{r.hits} hits</span>
                  <button type="button" onClick={() => onDeleteRedirect(r.id)} className="text-rose-400 hover:text-rose-300 p-1">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Real-Time 404 Error Monitor */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border bg-bg/50 px-5 py-3.5 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-sm font-semibold text-text flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-400" /> Rank Math 404 Error Monitor ({logs.length})
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">Captures broken links visited by users/crawlers. Fix them with 1-click 301 redirects.</p>
          </div>
          {logs.length > 0 && (
            <button type="button" onClick={onClear404s} className="text-xs text-text-muted hover:text-rose-400 underline">
              Clear 404 Logs
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-muted">No 404 errors recorded recently.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {logs.map((log) => (
              <div key={log.id} className="p-4 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="font-mono text-text font-medium">{log.url}</div>
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-rose-500/10 text-rose-400 font-mono px-2 py-0.5 font-bold">{log.hits} hits</span>
                    <button
                      type="button"
                      onClick={() => setConvertTargetId(convertTargetId === log.id ? null : log.id)}
                      className="rounded bg-accent/20 text-accent px-2.5 py-1 text-xs font-semibold hover:bg-accent/30"
                    >
                      + 301 Redirect
                    </button>
                  </div>
                </div>

                {convertTargetId === log.id && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Destination URL (e.g. /manga/solo-leveling)"
                      value={destInput}
                      onChange={(e) => setDestInput(e.target.value)}
                      className={`${adminInput} text-xs py-1.5`}
                    />
                    <button type="button" onClick={() => handleConvert404(log.id)} className={`${btnPrimary} py-1.5 text-xs`}>
                      Save 301
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
