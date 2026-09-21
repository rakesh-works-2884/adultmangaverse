"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getChapterPages, type UploadedPage } from "@/actions/pages";
import { PageUploader } from "@/components/admin/PageUploader";

export function ChapterPagesInline({
  chapterId,
  mangaTitle,
  chapterNumber,
}: {
  chapterId: string;
  mangaTitle: string;
  chapterNumber: string;
}) {
  const [pages, setPages] = useState<UploadedPage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getChapterPages(chapterId).then((res) => {
      if (!active) return;
      if (res.ok && res.data) setPages(res.data);
      else if (!res.ok) setError(res.error);
    }).catch(() => { if (active) setError("Could not load pages. Please reopen this chapter to retry."); });
    return () => {
      active = false;
    };
  }, [chapterId]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (pages === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" /> Loading pages…
      </p>
    );
  }

  return <PageUploader chapterId={chapterId} initialPages={pages} mangaTitle={mangaTitle} chapterNumber={chapterNumber} />;
}
