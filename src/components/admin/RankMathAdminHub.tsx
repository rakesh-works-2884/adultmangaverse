"use client";

import { useState } from "react";
import { Settings, ShieldAlert, Activity, FileText, ExternalLink } from "lucide-react";
import { SeoSettingsForm } from "@/components/admin/SeoSettingsForm";
import { SeoRedirectsTab } from "@/components/admin/SeoRedirectsTab";
import { SeoAuditTab } from "@/components/admin/SeoAuditTab";
import { cn } from "@/lib/utils";

interface RankMathAdminHubProps {
  settings: Record<string, string>;
  redirects: any[];
  logs: any[];
}

export function RankMathAdminHub({ settings = {}, redirects = [], logs = [] }: RankMathAdminHubProps) {
  const [tab, setTab] = useState<"general" | "sitemap" | "redirects" | "audit">("general");
  const safeLogs = logs || [];
  const safeRedirects = redirects || [];

  return (
    <div className="space-y-6">
      {/* Top Header Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setTab("general")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
            tab === "general" ? "bg-accent text-white" : "bg-surface border border-border text-text-muted hover:text-text"
          )}
        >
          <Settings className="size-4" /> General & Webmaster
        </button>

        <button
          type="button"
          onClick={() => setTab("audit")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
            tab === "audit" ? "bg-accent text-white" : "bg-surface border border-border text-text-muted hover:text-text"
          )}
        >
          <Activity className="size-4" /> Site SEO Audit
        </button>

        <button
          type="button"
          onClick={() => setTab("redirects")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
            tab === "redirects" ? "bg-accent text-white" : "bg-surface border border-border text-text-muted hover:text-text"
          )}
        >
          <ShieldAlert className="size-4" /> Redirections & 404 Monitor ({safeLogs.length})
        </button>

        <button
          type="button"
          onClick={() => setTab("sitemap")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
            tab === "sitemap" ? "bg-accent text-white" : "bg-surface border border-border text-text-muted hover:text-text"
          )}
        >
          <FileText className="size-4" /> Sitemap & Robots
        </button>
      </div>

      {/* Tab Contents */}
      {tab === "general" && <SeoSettingsForm settings={settings} />}

      {tab === "audit" && <SeoAuditTab />}

      {tab === "redirects" && <SeoRedirectsTab redirects={safeRedirects} logs={safeLogs} />}

      {tab === "sitemap" && (
        <div className="max-w-2xl space-y-5 rounded-xl border border-border bg-surface p-5">
          <h3 className="font-heading text-base font-semibold text-text">XML Sitemap & Robots Engine</h3>
          <p className="text-xs text-text-muted">
            Your XML sitemap and robots.txt rules are automatically generated dynamically based on your published Manga, Chapters, Blog Posts, and Static Pages.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between rounded-lg border border-border bg-bg/50 p-3 text-xs font-mono">
              <span className="text-text font-medium">XML Sitemap URL</span>
              <a href="/sitemap.xml" target="_blank" className="inline-flex items-center gap-1 text-accent hover:underline">
                /sitemap.xml <ExternalLink className="size-3" />
              </a>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-bg/50 p-3 text-xs font-mono">
              <span className="text-text font-medium">Robots.txt URL</span>
              <a href="/robots.txt" target="_blank" className="inline-flex items-center gap-1 text-accent hover:underline">
                /robots.txt <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
