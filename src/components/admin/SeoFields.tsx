"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";
import { adminInput, adminLabel, adminTextarea } from "@/components/admin/styles";

function Counter({ value, ideal }: { value: number; ideal: number }) {
  return (
    <span className={cn("text-xs", value > ideal ? "text-warning" : "text-text-muted")}>
      {value}/{ideal}
    </span>
  );
}

export function SeoFields({
  initialTitle,
  initialDescription,
  fallbackTitle,
  slug,
  pathPrefix = "/manga",
  titleTemplate = (t: string) => `Read ${t} Online — All Chapters`,
}: {
  initialTitle: string;
  initialDescription: string;
  fallbackTitle: string;
  slug: string;
  /** URL path segment shown in the preview, e.g. "/blog" — defaults to "/manga". */
  pathPrefix?: string;
  /** How to turn `fallbackTitle` into the preview's fallback title — defaults to the manga phrasing. */
  titleTemplate?: (title: string) => string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  const previewTitle = title || (fallbackTitle ? titleTemplate(fallbackTitle) : "Meta title preview");
  const previewDesc = description || "Add a meta description to control how this page appears in search results.";
  const previewUrl = `${siteConfig.url.replace(/^https?:\/\//, "")}${pathPrefix}/${slug || "your-slug"}`;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 font-heading text-sm font-semibold">SEO override (optional)</h3>

      {/* Google-style preview */}
      <div className="mb-4 rounded-lg border border-border bg-bg p-3">
        <p className="truncate text-xs text-success">{previewUrl}</p>
        <p className="truncate text-base font-medium text-highlight">{previewTitle}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">{previewDesc}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className={adminLabel}>Meta title</label>
            <Counter value={title.length} ideal={60} />
          </div>
          <input name="seoTitle" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={70} className={adminInput} placeholder="Leave blank for the auto template" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className={adminLabel}>Meta description</label>
            <Counter value={description.length} ideal={160} />
          </div>
          <textarea name="seoDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={200} className={adminTextarea} placeholder="Leave blank to auto-generate from the synopsis" />
        </div>
      </div>
    </div>
  );
}
