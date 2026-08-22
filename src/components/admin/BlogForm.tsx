"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload } from "lucide-react";
import { createBlog, updateBlog } from "@/actions/blogs";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { RankMathSeoWidget } from "@/components/admin/RankMathSeoWidget";
import { adminInput, adminLabel, adminTextarea, btnPrimary, btnSecondary } from "@/components/admin/styles";

export type BlogFormInitial = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentHtml: string;
  author: string | null;
  published: boolean;
  coverImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean;
  nofollow?: boolean;
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

export function BlogForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: BlogFormInitial;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initial?.contentHtml ?? "");
  const [coverPreview, setCoverPreview] = useState<string | null>(initial?.coverImage ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCoverPreview(URL.createObjectURL(file));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    fd.set("contentHtml", content);

    startTransition(async () => {
      const res = mode === "create" ? await createBlog(fd) : await updateBlog(initial!.id, fd);
      if (!res.ok) {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (mode === "create") {
        router.push("/admin/blogs");
        return;
      }
      setSaved(true);
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {saved ? <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">Saved.</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-5">
          <Field label="Title">
            <input name="title" defaultValue={initial?.title} required maxLength={160} className={adminInput} />
          </Field>

          <Field label="Slug" hint="Leave blank to auto-generate from the title.">
            <input name="slug" defaultValue={initial?.slug} className={adminInput} placeholder="auto-from-title" />
          </Field>

          <Field label="Excerpt" hint="Short teaser shown on the blog listing (falls back to the meta description if left blank).">
            <textarea name="excerpt" defaultValue={initial?.excerpt ?? ""} rows={2} maxLength={300} className={adminTextarea} />
          </Field>

          <div className="space-y-1.5">
            <label className={adminLabel}>Content</label>
            <RichTextEditor value={content} onChange={setContent} allowImages />
            <p className="text-xs text-text-muted">Paste or drop an image directly into the editor, or use the image button in the toolbar.</p>
          </div>

          <RankMathSeoWidget
            initialTitle={initial?.seoTitle ?? ""}
            initialDescription={initial?.seoDescription ?? ""}
            initialFocusKeyword={initial?.focusKeyword ?? ""}
            initialCanonicalUrl={initial?.canonicalUrl ?? ""}
            initialNoindex={initial?.noindex ?? false}
            initialNofollow={initial?.nofollow ?? false}
            fallbackTitle={initial?.title ?? ""}
            synopsisOrContent={content}
            slug={initial?.slug ?? ""}
            pathPrefix="/blog"
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Field label="Cover image" hint="Used on the blog listing and as the social-share (OG) image. JPG / PNG / WebP, ≤ 10MB.">
            <div className="space-y-3">
              <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-lg border border-border bg-bg-soft">
                {coverPreview ? (
                  <Image src={coverPreview} alt="Cover preview" fill sizes="320px" className="object-cover" unoptimized />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-text-muted">No cover</div>
                )}
              </div>
              <label className={`${btnSecondary} w-full cursor-pointer`}>
                <Upload className="size-4" />
                Choose image
                <input type="file" name="cover" accept="image/jpeg,image/png,image/webp" onChange={onCoverChange} className="hidden" />
              </label>
            </div>
          </Field>

          <Field label="Author">
            <input name="author" defaultValue={initial?.author ?? ""} maxLength={120} className={adminInput} placeholder="Optional byline" />
          </Field>

          <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
            <input type="checkbox" name="published" value="true" defaultChecked={initial?.published} className="size-4 accent-[var(--primary)]" />
            Published
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "create" ? "Create post" : "Save changes"}
        </button>
        <button type="button" onClick={() => router.push("/admin/blogs")} className={btnSecondary}>Cancel</button>
      </div>
    </form>
  );
}
