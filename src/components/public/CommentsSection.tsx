"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatDistanceToNowStrict } from "date-fns";
import { Loader2, MessageCircle } from "lucide-react";
import { postComment } from "@/actions/comments";

export type PublicComment = {
  id: string;
  body: string;
  createdAt: string;
  userName: string | null;
};

export function CommentsSection({
  mangaId,
  comments,
}: {
  mangaId: string;
  comments: PublicComment[];
}) {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPosted(false);
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await postComment({ mangaId, body });
      if (!res.ok) return setError(res.error);
      setBody("");
      setPosted(true);
    });
  }

  return (
    <section className="mt-10">
      <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold">
        <MessageCircle className="size-5 text-primary" /> Comments
      </h2>

      {isLoggedIn ? (
        <form onSubmit={submit} className="mb-5 space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Add a comment…"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {posted ? <p className="text-sm text-success">Thanks — your comment is awaiting moderation.</p> : null}
          <button type="submit" disabled={pending} className="btn-3d inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:scale-[0.97] disabled:opacity-60">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null} Post comment
          </button>
        </form>
      ) : (
        <p className="mb-5 rounded-lg border border-border bg-bg-soft px-4 py-3 text-sm text-text-muted">
          <Link href="/login" className="font-medium text-highlight hover:underline">Sign in</Link> to join the conversation.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-text-muted">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium">{c.userName || "Reader"}</span>
                <span className="text-xs text-text-muted">{formatDistanceToNowStrict(new Date(c.createdAt), { addSuffix: true })}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-text-muted">{c.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
