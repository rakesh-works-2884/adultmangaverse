"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[APP ERROR]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <p className="font-heading text-6xl font-bold text-danger">!</p>
      <h1 className="font-heading text-2xl font-bold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-text-muted">An unexpected error occurred. Please try again.</p>
      <button
        type="button"
        onClick={reset}
        className="btn-3d mt-2 inline-flex h-11 items-center rounded-lg bg-primary px-5 font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:scale-[0.97]"
      >
        Try again
      </button>
    </div>
  );
}
