"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { History } from "lucide-react";

/** Guest "continue reading" from localStorage progress (logged-in users get a server-rendered one). */
export function ContinueReadingButton({ slug }: { slug: string }) {
  const key = `amv_progress_${slug}`;
  const value = useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      window.addEventListener("amv-progress", cb);
      return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener("amv-progress", cb);
      };
    },
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );

  if (!value) return null;

  return (
    <Link
      href={`/manga/${slug}/${value}`}
      className="btn-3d-outline inline-flex h-11 items-center gap-2 rounded-lg border border-primary/40 px-5 font-ui text-sm font-semibold text-primary hover:bg-primary/10"
    >
      <History className="size-4" strokeWidth={2} /> Continue Ch. {value}
    </Link>
  );
}
