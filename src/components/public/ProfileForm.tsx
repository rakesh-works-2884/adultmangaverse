"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { authInputClass } from "@/components/public/auth-styles";
import { updateProfile } from "@/actions/account";

export function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await updateProfile({ name });
      setMessage(res.ok ? { type: "ok", text: "Saved." } : { type: "error", text: res.error });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="profile-email" className="text-sm font-medium">
          Email
        </label>
        <input id="profile-email" value={email} disabled readOnly className={`${authInputClass} cursor-not-allowed opacity-60`} />
        <p className="text-xs text-text-muted">Contact support to change the email on your account.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="profile-name" className="text-sm font-medium">
          Display name
        </label>
        <input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="Your name"
          className={authInputClass}
        />
      </div>

      {message ? (
        <p className={`text-sm ${message.type === "ok" ? "text-success" : "text-danger"}`}>{message.text}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-3d inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:scale-[0.97] disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
