"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      <LogOut className="size-4" strokeWidth={1.5} />
      Sign out
    </button>
  );
}
