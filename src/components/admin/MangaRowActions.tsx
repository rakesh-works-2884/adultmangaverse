"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Layers, Loader2, Pencil, Trash2 } from "lucide-react";
import { deleteManga, toggleMangaPublished } from "@/actions/manga";
import { btnGhost, btnDanger } from "@/components/admin/styles";

export function MangaRowActions({
  id,
  title,
  published,
}: {
  id: string;
  title: string;
  published: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function togglePublish() {
    setError(null);
    startTransition(async () => {
      const res = await toggleMangaPublished(id, !published);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Delete “${title}” and all its chapters/pages? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteManga(id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {error ? <span className="mr-1 text-xs text-danger">{error}</span> : null}
      <button
        type="button"
        onClick={togglePublish}
        disabled={pending}
        className={btnGhost}
        title={published ? "Unpublish" : "Publish"}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : published ? (
          <Eye className="size-4" />
        ) : (
          <EyeOff className="size-4" />
        )}
      </button>
      <Link href={`/admin/manga/${id}/chapters`} className={btnGhost} title="Chapters">
        <Layers className="size-4" />
      </Link>
      <Link href={`/admin/manga/${id}/edit`} className={btnGhost} title="Edit">
        <Pencil className="size-4" />
      </Link>
      <button type="button" onClick={remove} disabled={pending} className={btnDanger} title="Delete">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
