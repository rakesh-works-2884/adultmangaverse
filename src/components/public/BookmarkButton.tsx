"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleBookmark } from "@/actions/bookmarks";

export function BookmarkButton({
  mangaId,
  initialBookmarked,
}: {
  mangaId: string;
  initialBookmarked: boolean;
}) {
  const { status } = useSession();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, startTransition] = useTransition();

  if (status !== "authenticated") {
    return (
      <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-5 font-ui text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover">
        <Bookmark className="size-4" /> Add to Library
      </Link>
    );
  }

  function toggle() {
    startTransition(async () => {
      const res = await toggleBookmark(mangaId);
      if (res.ok && res.data) setBookmarked(res.data.bookmarked);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-lg border px-5 font-ui text-sm font-semibold transition-colors disabled:opacity-60",
        bookmarked ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-surface text-foreground hover:bg-surface-hover",
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : bookmarked ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
      {bookmarked ? "In Library" : "Add to Library"}
    </button>
  );
}
