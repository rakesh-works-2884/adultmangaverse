"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, ShieldCheck, Trash2, Save, Check } from "lucide-react";
import { setUserRole, setUserTier, setUserBanned, deleteUser } from "@/actions/users";

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

function UserRow({
  user: u,
  self,
  pending,
  onAct,
}: {
  user: AdminUser;
  self: boolean;
  pending: boolean;
  onAct: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [role, setRole] = useState(u.role);
  const [tier, setTier] = useState(u.tier);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const hasChanges = role !== u.role || tier !== u.tier;

  function handleSave() {
    onAct(async () => {
      if (role !== u.role) {
        const res = await setUserRole(u.id, role);
        if (!res.ok) return res;
      }
      if (tier !== u.tier) {
        const res = await setUserTier(u.id, tier);
        if (!res.ok) return res;
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      return { ok: true };
    });
  }

  function handleDelete() {
    if (confirm(`Are you sure you want to permanently delete user "${u.email}"? This action cannot be undone.`)) {
      onAct(() => deleteUser(u.id));
    }
  }

  return (
    <tr className="border-t border-border odd:bg-surface/40">
      <td className="px-4 py-2.5">
        <div className="font-medium">
          {u.name || "—"} {self ? <span className="text-xs text-text-muted">(you)</span> : null}
        </div>
        <div className="text-xs text-text-muted">{u.email}</div>
      </td>
      <td className="px-4 py-2.5">
        <select value={role} disabled={pending || self} onChange={(e) => setRole(e.target.value)} className={selectCls}>
          <option value="USER">USER</option>
          <option value="MOD">MOD</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </td>
      <td className="px-4 py-2.5">
        <select value={tier} disabled={pending} onChange={(e) => setTier(e.target.value)} className={selectCls}>
          <option value="FREE">FREE</option>
          <option value="PREMIUM">PREMIUM</option>
          <option value="VIP">VIP</option>
        </select>
      </td>
      <td className="px-4 py-2.5">
        {u.banned ? (
          <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">Banned</span>
        ) : (
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Active</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex items-center justify-end gap-2">
          {hasChanges ? (
            <button
              onClick={handleSave}
              disabled={pending}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              <Save className="size-3.5" /> Save
            </button>
          ) : savedSuccess ? (
            <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-success/15 px-2.5 text-xs font-medium text-success">
              <Check className="size-3.5" /> Saved
            </span>
          ) : null}

          {!self ? (
            <>
              <button
                onClick={() => onAct(() => setUserBanned(u.id, !u.banned))}
                disabled={pending}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium transition-colors hover:bg-surface-hover"
                title={u.banned ? "Unban user" : "Ban user"}
              >
                {u.banned ? <ShieldCheck className="size-3.5 text-success" /> : <Ban className="size-3.5 text-warning" />}
                {u.banned ? "Unban" : "Ban"}
              </button>

              <button
                onClick={handleDelete}
                disabled={pending}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-2.5 text-xs font-medium text-danger transition-colors hover:bg-danger/20"
                title="Delete user"
              >
                <Trash2 className="size-3.5" /> Delete
              </button>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

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
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={u.id} user={u} self={u.id === currentUserId} pending={pending} onAct={act} />
            ))}
          </tbody>
        </table>
      </div>
      {pending ? (
        <p className="flex items-center gap-1 text-xs text-text-muted">
          <Loader2 className="size-3.5 animate-spin" /> Saving changes…
        </p>
      ) : null}
    </div>
  );
}
