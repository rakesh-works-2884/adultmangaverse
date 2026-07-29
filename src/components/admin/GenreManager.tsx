"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { createGenre, renameGenre, deleteGenre } from "@/actions/genres";
import { adminInput, btnPrimary, btnGhost, btnDanger } from "@/components/admin/styles";

export type GenreRow = { id: string; name: string; slug: string; count: number };

export function GenreManager({ genres }: { genres: GenreRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pending, startTransition] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = name.trim();
    if (!value) return;
    startTransition(async () => {
      const res = await createGenre(value);
      if (!res.ok) return setError(res.error);
      setName("");
      router.refresh();
    });
  }

  function saveEdit(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await renameGenre(id, editingName.trim());
      if (!res.ok) return setError(res.error);
      setEditingId(null);
      router.refresh();
    });
  }

  function remove(id: string, label: string) {
    if (!confirm(`Delete genre “${label}”? Manga keep their other genres.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteGenre(id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New genre name"
          className={adminInput}
          maxLength={40}
        />
        <button type="submit" className={btnPrimary} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add
        </button>
      </form>

      {error ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-soft text-left text-text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Slug</th>
              <th className="px-4 py-2.5 font-medium">Manga</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {genres.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                  No genres yet. Add your first above.
                </td>
              </tr>
            ) : (
              genres.map((g) => (
                <tr key={g.id} className="border-t border-border odd:bg-surface/40">
                  <td className="px-4 py-2.5">
                    {editingId === g.id ? (
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className={adminInput}
                        autoFocus
                        maxLength={40}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(g.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className="font-medium">{g.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted">{g.slug}</td>
                  <td className="px-4 py-2.5 text-text-muted">{g.count}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      {editingId === g.id ? (
                        <>
                          <button className={btnGhost} onClick={() => saveEdit(g.id)} disabled={pending}>
                            <Check className="size-4" /> Save
                          </button>
                          <button className={btnGhost} onClick={() => setEditingId(null)}>
                            <X className="size-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className={btnGhost}
                            onClick={() => {
                              setEditingId(g.id);
                              setEditingName(g.name);
                            }}
                          >
                            <Pencil className="size-4" /> Edit
                          </button>
                          <button className={btnDanger} onClick={() => remove(g.id, g.name)} disabled={pending}>
                            <Trash2 className="size-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
