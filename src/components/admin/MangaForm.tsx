"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Plus, Upload } from "lucide-react";
import { createManga, updateManga } from "@/actions/manga";
import { createGenre } from "@/actions/genres";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { RankMathSeoWidget } from "@/components/admin/RankMathSeoWidget";
import { MANGA_STATUSES, MANGA_TYPES, CONTENT_INTENSITIES, INTENSITY_LABELS } from "@/lib/validators";
import {
  adminInput,
  adminLabel,
  adminTextarea,
  btnPrimary,
  btnSecondary,
} from "@/components/admin/styles";

export type MangaFormInitial = {
  id: string;
  title: string;
  slug: string;
  altTitles: string[];
  synopsis: string | null;
  author: string | null;
  authorLink: string | null;
  artist: string | null;
  status: string;
  type: string;
  intensity: string;
  isPremium: boolean;
  contentWarnings: string[];
  releaseYear: number | null;
  featured: boolean;
  published: boolean;
  genreIds: string[];
  coverUrl: string | null;
  heroImageDesktop: string | null;
  heroImageMobile: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean;
  nofollow?: boolean;
};

type Props = {
  mode: "create" | "edit";
  genres: { id: string; name: string }[];
  initial?: MangaFormInitial;
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className={adminLabel}>{label}</label>
      {children}
      {hint ? <p className="text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}

export function MangaForm({ mode, genres, initial }: Props) {
  const router = useRouter();
  const [synopsis, setSynopsis] = useState(initial?.synopsis ?? "");
  const [coverPreview, setCoverPreview] = useState<string | null>(initial?.coverUrl ?? null);
  const [heroDesktopPreview, setHeroDesktopPreview] = useState<string | null>(initial?.heroImageDesktop ?? null);
  const [heroMobilePreview, setHeroMobilePreview] = useState<string | null>(initial?.heroImageMobile ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  // Genres: controlled selection + inline "add new genre".
  const [genreList, setGenreList] = useState(genres);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set(initial?.genreIds ?? []));
  const [newGenre, setNewGenre] = useState("");
  const [genreError, setGenreError] = useState<string | null>(null);
  const [addingGenre, startAddGenre] = useTransition();

  function toggleGenre(id: string) {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addGenre() {
    const name = newGenre.trim();
    if (!name) return;
    setGenreError(null);
    startAddGenre(async () => {
      const res = await createGenre(name);
      if (!res.ok) return setGenreError(res.error);
      if (res.data) {
        const created = res.data;
        setGenreList((prev) => (prev.some((g) => g.id === created.id) ? prev : [...prev, { id: created.id, name: created.name }]));
        setSelectedGenres((prev) => new Set(prev).add(created.id));
      }
      setNewGenre("");
    });
  }

  function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCoverPreview(URL.createObjectURL(file));
  }

  function onHeroDesktopChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setHeroDesktopPreview(URL.createObjectURL(file));
  }

  function onHeroMobileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setHeroMobilePreview(URL.createObjectURL(file));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    fd.set("synopsis", synopsis);

    startTransition(async () => {
      const res =
        mode === "create"
          ? await createManga(fd)
          : await updateManga(initial!.id, fd);
      if (!res.ok) {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (mode === "create") {
        // Go straight to the editor so chapters/pages can be added in one place.
        const created = res.data as { id?: string } | undefined;
        router.push(created?.id ? `/admin/manga/${created.id}/edit` : "/admin/manga");
        return;
      }
      setSaved(true);
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          Saved.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-5">
          <Field label="Title">
            <input name="title" defaultValue={initial?.title} required className={adminInput} maxLength={200} />
          </Field>

          <Field label="Slug" hint="Leave blank to auto-generate from the title. Changing it sets up a 301 redirect.">
            <input name="slug" defaultValue={initial?.slug} className={adminInput} placeholder="auto-from-title" />
          </Field>

          <Field label="Alternative titles" hint="One per line.">
            <textarea
              name="altTitles"
              defaultValue={initial?.altTitles.join("\n")}
              rows={3}
              className={adminTextarea}
            />
          </Field>

          <Field label="Synopsis">
            <RichTextEditor value={synopsis} onChange={setSynopsis} />
          </Field>

          <Field label="Content warnings" hint="One per line — shown to readers on the detail page.">
            <textarea
              name="contentWarnings"
              defaultValue={initial?.contentWarnings.join("\n")}
              rows={3}
              className={adminTextarea}
              placeholder={"e.g. Graphic violence\nExplicit sexual content"}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Author">
              <input name="author" defaultValue={initial?.author ?? ""} className={adminInput} maxLength={120} />
            </Field>
            <Field label="Artist">
              <input name="artist" defaultValue={initial?.artist ?? ""} className={adminInput} maxLength={120} />
            </Field>
          </div>

          <Field label="Author / publisher link" hint="We don't own the content — add the creator's official page so readers can support them. Shown on the manga page.">
            <input name="authorLink" defaultValue={initial?.authorLink ?? ""} className={adminInput} maxLength={500} placeholder="https://…" />
          </Field>

          <RankMathSeoWidget
            initialTitle={initial?.seoTitle ?? ""}
            initialDescription={initial?.seoDescription ?? ""}
            initialFocusKeyword={initial?.focusKeyword ?? ""}
            initialCanonicalUrl={initial?.canonicalUrl ?? ""}
            initialNoindex={initial?.noindex ?? false}
            initialNofollow={initial?.nofollow ?? false}
            fallbackTitle={initial?.title ?? ""}
            synopsisOrContent={initial?.synopsis ?? ""}
            slug={initial?.slug ?? ""}
            pathPrefix="/manga"
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Field label="Cover">
            <div className="space-y-3">
              <div className="relative mx-auto aspect-[2/3] w-40 overflow-hidden rounded-lg border border-border bg-bg-soft">
                {coverPreview ? (
                  <Image src={coverPreview} alt="Cover preview" fill sizes="160px" className="object-cover" unoptimized />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-text-muted">No cover</div>
                )}
              </div>
              <label className={`${btnSecondary} w-full cursor-pointer`}>
                <Upload className="size-4" />
                Choose image
                <input type="file" name="cover" accept="image/jpeg,image/png,image/webp" onChange={onCoverChange} className="hidden" />
              </label>
              <p className="text-center text-xs text-text-muted">JPG / PNG / WebP, ≤ 10MB. Converted to WebP.</p>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select name="type" defaultValue={initial?.type ?? "MANGA"} className={adminInput}>
                {MANGA_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select name="status" defaultValue={initial?.status ?? "ONGOING"} className={adminInput}>
                {MANGA_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Release year">
              <input
                name="releaseYear"
                type="number"
                defaultValue={initial?.releaseYear ?? ""}
                min={1900}
                max={2100}
                className={adminInput}
                placeholder="2023"
              />
            </Field>
            <Field label="Intensity">
              <select name="intensity" defaultValue={initial?.intensity ?? "MODERATE"} className={adminInput}>
                {CONTENT_INTENSITIES.map((i) => (
                  <option key={i} value={i}>{INTENSITY_LABELS[i]}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Genres">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {genreList.map((g) => (
                  <label key={g.id} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name="genreIds"
                      value={g.id}
                      checked={selectedGenres.has(g.id)}
                      onChange={() => toggleGenre(g.id)}
                      className="peer sr-only"
                    />
                    <span className="inline-block rounded-full border border-border bg-bg px-3 py-1 text-xs text-text-muted transition-colors peer-checked:border-primary peer-checked:bg-primary/15 peer-checked:text-highlight">
                      {g.name}
                    </span>
                  </label>
                ))}
                {genreList.length === 0 ? (
                  <span className="text-xs text-text-muted">No genres yet — add one below.</span>
                ) : null}
              </div>
              <div className="flex gap-2">
                <input
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGenre(); } }}
                  placeholder="Add a new genre"
                  maxLength={40}
                  className="h-9 w-full rounded-lg border border-border bg-bg px-3 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={addGenre}
                  disabled={addingGenre || !newGenre.trim()}
                  className="btn-3d-outline inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-primary/40 px-3 font-ui text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  {addingGenre ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Add
                </button>
              </div>
              {genreError ? <p className="text-xs text-danger">{genreError}</p> : null}
            </div>
          </Field>

          <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
            <label className="flex items-center justify-between text-sm font-medium">
              Published
              <input type="checkbox" name="published" value="true" defaultChecked={initial?.published} className="size-4 accent-[var(--primary)]" />
            </label>
            <label className="flex items-center justify-between text-sm font-medium">
              Featured
              <input type="checkbox" name="featured" value="true" defaultChecked={initial?.featured} className="size-4 accent-[var(--primary)]" />
            </label>
            <p className="text-xs text-text-muted">Shown in the homepage carousel. Only 3 titles can be featured at once — featuring a 4th automatically un-features the longest-standing one.</p>
          </div>

          <Field label="Hero poster — desktop" hint="Optional. Shown in the homepage carousel on larger screens for a featured title. Falls back to the cover if not set.">
            <div className="space-y-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-bg-soft">
                {heroDesktopPreview ? (
                  <Image src={heroDesktopPreview} alt="Desktop hero preview" fill sizes="320px" className="object-cover" unoptimized />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-text-muted">No image</div>
                )}
              </div>
              <label className={`${btnSecondary} w-full cursor-pointer`}>
                <Upload className="size-4" />
                Choose image
                <input type="file" name="heroImageDesktop" accept="image/jpeg,image/png,image/webp" onChange={onHeroDesktopChange} className="hidden" />
              </label>
            </div>
          </Field>

          <Field label="Hero poster — mobile" hint="Optional. Portrait image shown in the carousel on phones. Falls back to the cover if not set.">
            <div className="space-y-3">
              <div className="relative aspect-[9/16] w-32 overflow-hidden rounded-lg border border-border bg-bg-soft">
                {heroMobilePreview ? (
                  <Image src={heroMobilePreview} alt="Mobile hero preview" fill sizes="128px" className="object-cover" unoptimized />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-text-muted">No image</div>
                )}
              </div>
              <label className={`${btnSecondary} w-full cursor-pointer`}>
                <Upload className="size-4" />
                Choose image
                <input type="file" name="heroImageMobile" accept="image/jpeg,image/png,image/webp" onChange={onHeroMobileChange} className="hidden" />
              </label>
            </div>
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <button type="submit" className={btnPrimary} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "create" ? "Create manga" : "Save changes"}
        </button>
        <button type="button" onClick={() => router.push("/admin/manga")} className={btnSecondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
