"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, ExternalLink } from "lucide-react";
import { runSeoAudit, type SeoAuditReport } from "@/actions/seo-actions";
import { btnPrimary } from "@/components/admin/styles";
import { cn } from "@/lib/utils";

export function SeoAuditTab() {
  const [report, setReport] = useState<SeoAuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function triggerAudit() {
    setError(null);
    startTransition(async () => {
      const res = await runSeoAudit();
      if (!res.ok || !res.report) {
        setError(res.error || "Failed to complete SEO audit.");
        return;
      }
      setReport(res.report);
    });
  }

  return (
    <div className="space-y-6">
      {/* Banner & Trigger Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5">
        <div>
          <h2 className="font-heading text-lg font-semibold text-text">Site-Wide SEO Audit & Health Check</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Scan all Published Manga, Blog Posts, and Static Pages for missing metadata, thin content, and missing preview images.
          </p>
        </div>
        <button type="button" onClick={triggerAudit} disabled={pending} className={btnPrimary}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {report ? "Re-run SEO Audit" : "Run Site SEO Audit"}
        </button>
      </div>

      {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}

      {/* Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Health Score Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <div className="text-xs text-text-muted uppercase font-semibold">SEO Health Score</div>
              <div
                className={cn(
                  "text-3xl font-extrabold font-mono mt-1",
                  report.score >= 80 ? "text-emerald-400" : report.score >= 50 ? "text-amber-400" : "text-rose-400"
                )}
              >
                {report.score}%
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <div className="text-xs text-text-muted uppercase font-semibold">Total Analyzed</div>
              <div className="text-3xl font-extrabold font-mono text-text mt-1">{report.totalAnalyzed}</div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <div className="text-xs text-text-muted uppercase font-semibold">Critical Errors</div>
              <div className="text-3xl font-extrabold font-mono text-rose-400 mt-1">{report.totalErrors}</div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <div className="text-xs text-text-muted uppercase font-semibold">Warnings</div>
              <div className="text-3xl font-extrabold font-mono text-amber-400 mt-1">{report.totalWarnings}</div>
            </div>
          </div>

          {/* Issues Breakdown */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="border-b border-border bg-bg/50 px-5 py-3.5">
              <h3 className="font-heading text-sm font-semibold text-text">Audit Findings ({report.issues.length} issues)</h3>
            </div>

            {report.issues.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <ShieldCheck className="mx-auto size-10 text-emerald-400" />
                <p className="font-semibold text-text">Perfect SEO Health!</p>
                <p className="text-xs text-text-muted">No SEO errors or warnings were found across your content.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {report.issues.map((issue) => (
                  <div key={issue.id} className="flex flex-wrap items-center justify-between gap-4 p-4 text-xs hover:bg-bg/40 transition-colors">
                    <div className="flex items-start gap-3 min-w-[280px] max-w-xl">
                      {issue.severity === "error" ? (
                        <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
                      ) : (
                        <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text text-sm">{issue.title}</span>
                          <span className="rounded bg-bg-soft px-1.5 py-0.5 text-[10px] uppercase font-mono text-text-muted">{issue.type}</span>
                        </div>
                        <p className="text-text-muted mt-0.5">{issue.message}</p>
                      </div>
                    </div>

                    <Link
                      href={issue.editUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
                    >
                      Fix Issue <ExternalLink className="size-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
