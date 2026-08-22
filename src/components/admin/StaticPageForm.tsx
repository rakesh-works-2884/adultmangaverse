"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createStaticPage, updateStaticPage } from "@/actions/staticpages";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { RankMathSeoWidget } from "@/components/admin/RankMathSeoWidget";
import { adminInput, adminLabel, adminTextarea, btnPrimary, btnSecondary } from "@/components/admin/styles";

export type StaticPageInitial = {
  id: string;
  title: string;
  slug: string;
  contentHtml: string;
  seoTitle: string | null;
  seoDescription: string | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean;
  nofollow?: boolean;
};

export function StaticPageForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: StaticPageInitial;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initial?.contentHtml ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("contentHtml", content);
    startTransition(async () => {
      const res = mode === "create" ? await createStaticPage(fd) : await updateStaticPage(initial!.id, fd);
      if (!res.ok) {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push("/admin/pages");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
      {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={adminLabel}>Title</label>
          <input name="title" defaultValue={initial?.title} required maxLength={120} className={adminInput} />
        </div>
        <div className="space-y-1.5">
          <label className={adminLabel}>Slug</label>
          <input name="slug" defaultValue={initial?.slug} placeholder="auto-from-title" className={adminInput} />
          <p className="text-xs text-text-muted">Public URL: /p/{initial?.slug || "your-slug"}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={adminLabel}>Content</label>
        <RichTextEditor value={content} onChange={setContent} />
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
        pathPrefix="/p"
      />

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "create" ? "Create page" : "Save changes"}
        </button>
        <button type="button" onClick={() => router.push("/admin/pages")} className={btnSecondary}>Cancel</button>
      </div>
    </form>
  );
}
