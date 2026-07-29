"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Check, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { moderateComment, deleteComment } from "@/actions/comments";
import { btnGhost, btnDanger } from "@/components/admin/styles";

export type AdminComment = {
  id: string;
  body: string;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "SPAM";
  userName: string | null;
  userEmail: string;
  mangaTitle: string | null;
  mangaSlug: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning",
  APPROVED: "bg-success/15 text-success",
  SPAM: "bg-danger/15 text-danger",
};

export function CommentModeration({ comments }: { comments: AdminComment[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error ?? "Action failed.");
      router.refresh();
    });
  }

  if (comments.length === 0) {
    return <p className="rounded-xl border border-dashed border-border bg-bg-soft px-5 py-12 text-center text-sm text-text-muted">No comments here.</p>;
  }

  return (
    <div className="space-y-3">
      {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {comments.map((c) => (
        <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{c.userName || "Reader"}</span>
            <span className="text-xs text-text-muted">{c.userEmail}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}>{c.status}</span>
            {c.mangaSlug ? <Link href={`/manga/${c.mangaSlug}`} className="text-xs text-highlight hover:underline">on {c.mangaTitle}</Link> : null}
            <span className="ml-auto text-xs text-text-muted">{formatDistanceToNowStrict(new Date(c.createdAt), { addSuffix: true })}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-text">{c.body}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {c.status !== "APPROVED" ? <button onClick={() => act(() => moderateComment(c.id, "APPROVED"))} disabled={pending} className={btnGhost}><Check className="size-4" /> Approve</button> : null}
            {c.status !== "SPAM" ? <button onClick={() => act(() => moderateComment(c.id, "SPAM"))} disabled={pending} className={btnGhost}><ShieldAlert className="size-4" /> Spam</button> : null}
            <button onClick={() => { if (confirm("Delete this comment permanently?")) act(() => deleteComment(c.id)); }} disabled={pending} className={btnDanger}><Trash2 className="size-4" /> Delete</button>
            {pending ? <Loader2 className="size-4 animate-spin self-center text-text-muted" /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
