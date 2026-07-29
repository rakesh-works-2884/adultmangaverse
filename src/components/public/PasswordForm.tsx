"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { authInputClass } from "@/components/public/AuthCard";
import { changePassword } from "@/actions/account";

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [show, setShow] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const currentPassword = String(fd.get("currentPassword") ?? "");
    const newPassword = String(fd.get("newPassword") ?? "");

    startTransition(async () => {
      const res = await changePassword({ currentPassword, newPassword });
      if (res.ok) {
        setMessage({ type: "ok", text: "Password updated." });
        form.reset();
      } else {
        setMessage({ type: "error", text: res.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="currentPassword" className="text-sm font-medium">
          Current password
        </label>
        <input id="currentPassword" name="currentPassword" type={show ? "text" : "password"} autoComplete="current-password" required className={authInputClass} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium">
          New password
        </label>
        <div className="relative">
          <input
            id="newPassword"
            name="newPassword"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="At least 8 characters"
            className={`${authInputClass} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide passwords" : "Show passwords"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" strokeWidth={1.75} /> : <Eye className="size-4" strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {message ? (
        <p className={`text-sm ${message.type === "ok" ? "text-success" : "text-danger"}`}>{message.text}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-3d-outline inline-flex h-10 items-center gap-2 rounded-lg border border-primary/40 px-5 font-ui text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
