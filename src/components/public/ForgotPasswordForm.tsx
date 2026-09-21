"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { requestPasswordResetOtp } from "@/actions/otp";
import { authInputWithIconClass } from "@/components/public/auth-styles";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!email) {
      setError("Enter your email.");
      return;
    }

    startTransition(async () => {
      const res = await requestPasswordResetOtp(email);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" strokeWidth={1.75} />
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className={authInputWithIconClass} />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-3d inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:scale-[0.97] disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Sending…" : "Send reset code"}
      </button>

      <p className="text-center text-xs text-text-muted">If that email has an account, we&apos;ll send a 6-digit code to it.</p>
    </form>
  );
}
