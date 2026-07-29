"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MANGA_STATUSES, MANGA_TYPES, CONTENT_INTENSITIES, INTENSITY_LABELS } from "@/lib/validators";

export type BrowseFiltersState = {
  q: string;
  genres: string[];
  status: string;
  type: string;
  intensity: string[];
  premium: boolean;
  sort: string;
  year: string;
};

const SORTS = [
  { value: "latest", label: "Latest update" },
  { value: "popular", label: "Popularity" },
  { value: "rating", label: "Rating" },
  { value: "new", label: "Newest" },
  { value: "az", label: "A–Z" },
];

function buildQs(f: BrowseFiltersState): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.genres.length) p.set("genres", f.genres.join(","));
  if (f.status) p.set("status", f.status);
  if (f.type) p.set("type", f.type);
  if (f.intensity.length) p.set("intensity", f.intensity.join(","));
  if (f.premium) p.set("premium", "1");
  if (f.sort && f.sort !== "latest") p.set("sort", f.sort);
  if (f.year) p.set("year", f.year);
  return p.toString();
}

export function BrowseFilters({
  current,
  genres,
}: {
  current: BrowseFiltersState;
  genres: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function navigate(patch: Partial<BrowseFiltersState>) {
    const next = { ...current, ...patch };
    const qs = buildQs(next);
    router.replace(qs ? `/browse?${qs}` : "/browse", { scroll: false });
  }

  function toggleIn(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  const hasFilters = current.genres.length || current.status || current.type || current.intensity.length || current.premium || current.year;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-3 inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 font-ui text-sm font-medium lg:hidden"
      >
        <SlidersHorizontal className="size-4" /> Filters
      </button>

      <div className={cn("space-y-6 rounded-xl border border-border bg-surface p-4", open ? "block" : "hidden", "lg:block")}>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold">Filters</h2>
          {hasFilters ? (
            <button type="button" onClick={() => navigate({ genres: [], status: "", type: "", intensity: [], premium: false, year: "" })} className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-danger">
              <X className="size-3" /> Clear
            </button>
          ) : null}
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Sort by</p>
          <select value={current.sort} onChange={(e) => navigate({ sort: e.target.value })} className="h-9 w-full rounded-lg border border-border bg-bg px-2 text-sm outline-none focus:border-primary">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Intensity */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Intensity</p>
          <div className="space-y-1">
            {CONTENT_INTENSITIES.map((i) => (
              <label key={i} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={current.intensity.includes(i)} onChange={() => navigate({ intensity: toggleIn(current.intensity, i) })} className="size-4 accent-[var(--primary)]" />
                {INTENSITY_LABELS[i]}
              </label>
            ))}
          </div>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Type</p>
          <select value={current.type} onChange={(e) => navigate({ type: e.target.value })} className="h-9 w-full rounded-lg border border-border bg-bg px-2 text-sm outline-none focus:border-primary">
            <option value="">All types</option>
            {MANGA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Status</p>
          <select value={current.status} onChange={(e) => navigate({ status: e.target.value })} className="h-9 w-full rounded-lg border border-border bg-bg px-2 text-sm outline-none focus:border-primary">
            <option value="">Any status</option>
            {MANGA_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Genres */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Genres</p>
          <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
            {genres.map((g) => (
              <label key={g.slug} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={current.genres.includes(g.slug)} onChange={() => navigate({ genres: toggleIn(current.genres, g.slug) })} className="size-4 accent-[var(--primary)]" />
                {g.name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
