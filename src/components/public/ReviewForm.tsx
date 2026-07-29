"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitReview } from "@/actions/reviews";
import { getMyReview } from "@/actions/manga-user";

type Existing = { rating: number; body: string } | null;

/** The actual interactive form — only mounted once `existing` is known, so its
 * rating/body state seeds from the real value instead of a stale default. */
function ReviewFormFields({ mangaId, existing }: { mangaId: string; existing: Existing }) {
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (rating < 1) return setError("Pick a star rating.");
    startTransition(async () => {
      const res = await submitReview(mangaId, { rating, body: body.trim() || undefined });
      if (!res.ok) return setError(res.error);
      setDone(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{existing ? "Update your review" : "Your rating"}</span>
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" onClick={() => setRating(i)} onMouseEnter={() => setHover(i)} aria-label={`${i} star${i > 1 ? "s" : ""}`} className="p-0.5">
              <Star className={cn("size-6", i <= (hover || rating) ? "text-warning" : "text-border")} fill={i <= (hover || rating) ? "currentColor" : "none"} strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Share your thoughts (optional)…"
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {done ? <p className="text-sm text-success">Thanks — your review was saved.</p> : null}
      <button type="submit" disabled={pending} className="btn-3d inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:scale-[0.97] disabled:opacity-60">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {existing ? "Update review" : "Submit review"}
      </button>
    </form>
  );
}

/**
 * Fetches the current user's existing review client-side (instead of the
 * manga detail page fetching it server-side via auth()) so that page can be
 * cached — see getMyReview in actions/manga-user.ts.
 */
export function ReviewForm({ mangaId }: { mangaId: string }) {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  const [existing, setExisting] = useState<Existing>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    const task = isLoggedIn ? getMyReview(mangaId) : Promise.resolve(null);
    task.then((r) => {
      if (cancelled) return;
      setExisting(r);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mangaId, isLoggedIn, status]);

  if (status === "loading" || !loaded) {
    return <div className="h-[126px] animate-pulse rounded-xl border border-border bg-surface" />;
  }

  if (!isLoggedIn) {
    return (
      <p className="rounded-lg border border-border bg-bg-soft px-4 py-3 text-sm text-text-muted">
        <Link href="/login" className="font-medium text-highlight hover:underline">Sign in</Link> to rate and review this title.
      </p>
    );
  }

  return <ReviewFormFields mangaId={mangaId} existing={existing} />;
}
