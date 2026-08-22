"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Search, Share2, Settings, Sparkles } from "lucide-react";
import { analyzeSeo, SeoTestResult } from "@/lib/seo-analyzer";
import { siteConfig } from "@/lib/site";
import { adminInput, adminLabel, adminTextarea } from "@/components/admin/styles";
import { cn } from "@/lib/utils";

interface RankMathSeoWidgetProps {
  initialTitle: string;
  initialDescription: string;
  initialFocusKeyword?: string;
  initialCanonicalUrl?: string;
  initialNoindex?: boolean;
  initialNofollow?: boolean;
  fallbackTitle: string;
  synopsisOrContent?: string;
  slug: string;
  pathPrefix?: string;
}

export function RankMathSeoWidget({
  initialTitle,
  initialDescription,
  initialFocusKeyword = "",
  initialCanonicalUrl = "",
  initialNoindex = false,
  initialNofollow = false,
  fallbackTitle,
  synopsisOrContent = "",
  slug,
  pathPrefix = "/manga",
}: RankMathSeoWidgetProps) {
  const [seoTitle, setSeoTitle] = useState(initialTitle);
  const [seoDescription, setSeoDescription] = useState(initialDescription);
  const [focusKeyword, setFocusKeyword] = useState(initialFocusKeyword);
  const [canonicalUrl, setCanonicalUrl] = useState(initialCanonicalUrl);
  const [noindex, setNoindex] = useState(initialNoindex);
  const [nofollow, setNofollow] = useState(initialNofollow);

  const [activeTab, setActiveTab] = useState<"general" | "analysis" | "advanced">("general");

  // Perform real-time SEO analysis
  const report = useMemo(() => {
    try {
      return analyzeSeo({
        title: fallbackTitle || "",
        seoTitle: seoTitle || "",
        seoDescription: seoDescription || "",
        synopsisOrContent: synopsisOrContent || "",
        slug: slug || "",
        focusKeyword: focusKeyword || "",
      });
    } catch {
      return {
        score: 50,
        rating: "ok" as const,
        tests: [],
        stats: { wordCount: 0, keywordDensity: 0, titleLength: 0, descriptionLength: 0 },
      };
    }
  }, [fallbackTitle, seoTitle, seoDescription, synopsisOrContent, slug, focusKeyword]);

  const safeTests = report?.tests || [];
  const safeStats = report?.stats || { wordCount: 0, keywordDensity: 0, titleLength: 0, descriptionLength: 0 };
  const safeScore = report?.score ?? 50;

  const previewTitle = seoTitle || (fallbackTitle ? `Read ${fallbackTitle} Online` : "Meta title preview");
  const previewDesc = seoDescription || "Add a meta description to control how this page appears in search results.";
  const siteUrl = siteConfig?.url ? String(siteConfig.url) : "localhost:3000";
  const displayUrl = `${siteUrl.replace(/^https?:\/\//, "")}${pathPrefix || ""}/${slug || "slug"}`;

  // Score badge style helper
  const scoreColor =
    safeScore >= 80
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
      : safeScore >= 50
      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
      : "bg-rose-500/10 border-rose-500/30 text-rose-400";

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-5">
      {/* Persistent Hidden Inputs for Guaranteed Form Submission Across Tabs */}
      <input type="hidden" name="focusKeyword" value={focusKeyword} />
      <input type="hidden" name="seoTitle" value={seoTitle} />
      <input type="hidden" name="seoDescription" value={seoDescription} />
      <input type="hidden" name="canonicalUrl" value={canonicalUrl} />
      <input type="hidden" name="noindex" value={noindex ? "true" : "false"} />
      <input type="hidden" name="nofollow" value={nofollow ? "true" : "false"} />

      {/* Header with Rank Math Score Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h3 className="font-heading text-base font-semibold text-text">Rank Math SEO Optimization</h3>
            <p className="text-xs text-text-muted">Real-time content analysis & SERP preview engine</p>
          </div>
        </div>

        {/* Rank Math Score Badge */}
        <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-sm font-bold", scoreColor)}>
          <span>SEO Score:</span>
          <span className="text-base">{safeScore} / 100</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            activeTab === "general" ? "bg-accent/20 text-accent" : "text-text-muted hover:text-text"
          )}
        >
          <Search className="size-3.5" /> General & SERP Snippet
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("analysis")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            activeTab === "analysis" ? "bg-accent/20 text-accent" : "text-text-muted hover:text-text"
          )}
        >
          <CheckCircle2 className="size-3.5" /> SEO Checklist ({safeTests.filter((t) => t.passed).length}/{safeTests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("advanced")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            activeTab === "advanced" ? "bg-accent/20 text-accent" : "text-text-muted hover:text-text"
          )}
        >
          <Settings className="size-3.5" /> Advanced & Indexing
        </button>
      </div>

      {/* TAB 1: General & Snippet Preview */}
      {activeTab === "general" && (
        <div className="space-y-4">
          {/* Focus Keyword Input */}
          <div className="space-y-1.5">
            <label className={adminLabel}>Focus Keyword (Target Search Term)</label>
            <input
              value={focusKeyword}
              onChange={(e) => setFocusKeyword(e.target.value)}
              className={adminInput}
              placeholder="e.g. Solo Leveling Chapter 1"
            />
            <p className="text-xs text-text-muted">Enter the primary keyword you want this page to rank for.</p>
          </div>

          {/* Google SERP Snippet Preview */}
          <div className="rounded-xl border border-border bg-bg/80 p-4 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Google Search Result Preview</span>
            <div className="space-y-1">
              <p className="truncate text-xs font-medium text-emerald-500 font-mono">{displayUrl}</p>
              <p className="truncate text-base font-semibold text-sky-400 hover:underline cursor-pointer">{previewTitle}</p>
              <p className="line-clamp-2 text-xs text-text-muted leading-relaxed">{previewDesc}</p>
            </div>
          </div>

          {/* Meta Title Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className={adminLabel}>SEO Meta Title</label>
              <span className={cn("text-xs font-mono", safeStats.titleLength > 60 ? "text-amber-400" : "text-text-muted")}>
                {safeStats.titleLength}/60 chars
              </span>
            </div>
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              maxLength={70}
              className={adminInput}
              placeholder="Leave blank for automatic title template"
            />
          </div>

          {/* Meta Description Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className={adminLabel}>SEO Meta Description</label>
              <span className={cn("text-xs font-mono", safeStats.descriptionLength > 160 ? "text-amber-400" : "text-text-muted")}>
                {safeStats.descriptionLength}/160 chars
              </span>
            </div>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              rows={3}
              maxLength={200}
              className={adminTextarea}
              placeholder="Write a compelling summary including your focus keyword..."
            />
          </div>
        </div>
      )}

      {/* TAB 2: Rank Math Analysis & Checklist */}
      {activeTab === "analysis" && (
        <div className="space-y-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-lg border border-border bg-bg/50 p-2.5">
              <div className="text-xs text-text-muted">Word Count</div>
              <div className="text-base font-bold font-mono">{safeStats.wordCount}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg/50 p-2.5">
              <div className="text-xs text-text-muted">Keyword Density</div>
              <div className="text-base font-bold font-mono">{safeStats.keywordDensity}%</div>
            </div>
            <div className="rounded-lg border border-border bg-bg/50 p-2.5">
              <div className="text-xs text-text-muted">Title Length</div>
              <div className="text-base font-bold font-mono">{safeStats.titleLength}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg/50 p-2.5">
              <div className="text-xs text-text-muted">Meta Desc</div>
              <div className="text-base font-bold font-mono">{safeStats.descriptionLength}</div>
            </div>
          </div>

          {/* Detailed Tests List */}
          <div className="space-y-2">
            {safeTests.map((test) => (
              <div
                key={test.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-xs transition-colors",
                  test.passed
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                    : "border-amber-500/20 bg-amber-500/5 text-amber-300"
                )}
              >
                {test.passed ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-text">{test.label}</div>
                  <div className="text-text-muted mt-0.5">{test.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Advanced & Indexing */}
      {activeTab === "advanced" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className={adminLabel}>Canonical URL Override</label>
            <input
              value={canonicalUrl}
              onChange={(e) => setCanonicalUrl(e.target.value)}
              className={adminInput}
              placeholder="https://example.com/canonical-path (Optional)"
            />
            <p className="text-xs text-text-muted">Specify an alternative primary canonical URL if this content is syndicated.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <label className="flex items-center gap-3 rounded-lg border border-border bg-bg/40 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={noindex}
                onChange={(e) => setNoindex(e.target.checked)}
                className="size-4 rounded border-border accent-accent"
              />
              <div>
                <span className="text-xs font-semibold text-text block">Noindex Page</span>
                <span className="text-[11px] text-text-muted block">Prevent search engines from indexing this page in search results.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-border bg-bg/40 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={nofollow}
                onChange={(e) => setNofollow(e.target.checked)}
                className="size-4 rounded border-border accent-accent"
              />
              <div>
                <span className="text-xs font-semibold text-text block">Nofollow Links</span>
                <span className="text-[11px] text-text-muted block">Instruct crawlers not to follow links on this page.</span>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
