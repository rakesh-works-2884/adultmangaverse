"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, ShieldCheck } from "lucide-react";
import { setUserRole, setUserTier, setUserBanned } from "@/actions/users";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tier: string;
  banned: boolean;
  createdAt: string;
};

const selectCls = "h-8 rounded-lg border border-border bg-bg px-2 text-xs outline-none focus:border-primary";

export function UserManager({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
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

  return (
    <div className="space-y-3">
      {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-bg-soft text-left text-text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Tier</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const self = u.id === currentUserId;
              return (
                <tr key={u.id} className="border-t border-border odd:bg-surface/40">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{u.name || "—"} {self ? <span className="text-xs text-text-muted">(you)</span> : null}</div>
                    <div className="text-xs text-text-muted">{u.email}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <select value={u.role} disabled={pending || self} onChange={(e) => act(() => setUserRole(u.id, e.target.value))} className={selectCls}>
                      <option value="USER">USER</option>
                      <option value="MOD">MOD</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <select value={u.tier} disabled={pending} onChange={(e) => act(() => setUserTier(u.id, e.target.value))} className={selectCls}>
                      <option value="FREE">FREE</option>
                      <option value="PREMIUM">PREMIUM</option>
                      <option value="VIP">VIP</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    {u.banned ? <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">Banned</span> : <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Active</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!self ? (
                      <button onClick={() => act(() => setUserBanned(u.id, !u.banned))} disabled={pending} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium transition-colors hover:bg-surface-hover">
                        {u.banned ? <ShieldCheck className="size-3.5" /> : <Ban className="size-3.5" />}
                        {u.banned ? "Unban" : "Ban"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pending ? <p className="flex items-center gap-1 text-xs text-text-muted"><Loader2 className="size-3.5 animate-spin" /> saving…</p> : null}
    </div>
  );
}
