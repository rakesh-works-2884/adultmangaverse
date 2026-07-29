"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Pencil, Trash2 } from "lucide-react";
import { deleteBlog, toggleBlogPublished } from "@/actions/blogs";
import { btnGhost, btnDanger } from "@/components/admin/styles";

export function BlogRowActions({ id, title, published }: { id: string; title: string; published: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function togglePublish() {
    setError(null);
    startTransition(async () => {
      const res = await toggleBlogPublished(id, !published);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Delete “${title}”? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteBlog(id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {error ? <span className="mr-1 text-xs text-danger">{error}</span> : null}
      <button type="button" onClick={togglePublish} disabled={pending} className={btnGhost} title={published ? "Unpublish" : "Publish"}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      </button>
      <Link href={`/admin/blogs/${id}/edit`} className={btnGhost} title="Edit">
        <Pencil className="size-4" />
      </Link>
      <button type="button" onClick={remove} disabled={pending} className={btnDanger} title="Delete">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
