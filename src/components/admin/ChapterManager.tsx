"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown, Eye, EyeOff, Images, Loader2, Pencil, Plus, Trash2,
} from "lucide-react";
import { createChapter, updateChapter, deleteChapter, type ChapterFormData } from "@/actions/chapters";
import { ChapterPagesInline } from "@/components/admin/ChapterPagesInline";
import { cn } from "@/lib/utils";
import { adminInput, adminLabel, btnPrimary, btnGhost, btnDanger } from "@/components/admin/styles";

export type ChapterRow = {
  id: string;
  number: string;
  title: string | null;
  isPremium: boolean;
  publishedAt: string | null; // ISO
  pagesCount: number;
};

type Visibility = "draft" | "now" | "schedule";

function statusOf(publishedAt: string | null): { label: string; cls: string } {
  if (!publishedAt) return { label: "Draft", cls: "bg-surface text-text-muted" };
  return new Date(publishedAt) > new Date()
    ? { label: "Scheduled", cls: "bg-warning/15 text-warning" }
    : { label: "Published", cls: "bg-success/15 text-success" };
}

const emptyForm = { number: "", title: "", isPremium: false, visibility: "now" as Visibility, scheduleAt: "" };

export function ChapterManager({ mangaId, mangaTitle, chapters }: { mangaId: string; mangaTitle: string; chapters: ChapterRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
  }

  function startEdit(c: ChapterRow) {
    const visibility: Visibility = !c.publishedAt ? "draft" : new Date(c.publishedAt) > new Date() ? "schedule" : "now";
    setEditingId(c.id);
    setError(null);
    setForm({
      number: c.number,
      title: c.title ?? "",
      isPremium: c.isPremium,
      visibility,
      scheduleAt: c.publishedAt && visibility === "schedule" ? c.publishedAt.slice(0, 16) : "",
    });
  }

  function buildPayload(): ChapterFormData | { error: string } {
    const num = Number(form.number);
    if (form.number.trim() === "" || Number.isNaN(num)) return { error: "Enter a valid chapter number." };
    let publishedAt: string | null = null;
    if (form.visibility === "now") publishedAt = new Date().toISOString();
    else if (form.visibility === "schedule") {
      if (!form.scheduleAt) return { error: "Pick a schedule date/time." };
      publishedAt = new Date(form.scheduleAt).toISOString();
    }
    return { number: num, title: form.title.trim() || undefined, isPremium: false, publishedAt };
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = buildPayload();
    if ("error" in payload) return setError(payload.error);
    startTransition(async () => {
      const res = editingId ? await updateChapter(editingId, payload) : await createChapter(mangaId, payload);
      if (!res.ok) return setError(res.error);
      resetForm();
      router.refresh();
    });
  }

  function quickPublishToggle(c: ChapterRow) {
    const published = c.publishedAt && new Date(c.publishedAt) <= new Date();
    startTransition(async () => {
      const res = await updateChapter(c.id, {
        number: Number(c.number),
        title: c.title ?? undefined,
        isPremium: false,
        publishedAt: published ? null : new Date().toISOString(),
      });
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  function remove(c: ChapterRow) {
    if (!confirm(`Delete chapter ${c.number}${c.title ? ` — ${c.title}` : ""} and its ${c.pagesCount} page(s)?`)) return;
    startTransition(async () => {
      const res = await deleteChapter(c.id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Add / edit form */}
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="font-heading text-sm font-semibold">{editingId ? "Edit chapter" : "Add chapter"}</h2>
        {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
          <div className="space-y-1.5">
            <label className={adminLabel}>Number</label>
            <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="1 or 10.5" inputMode="decimal" className={adminInput} />
          </div>
          <div className="space-y-1.5">
            <label className={adminLabel}>Title <span className="text-text-muted">(optional)</span></label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={adminInput} maxLength={200} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <label className={adminLabel}>Visibility</label>
            <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as Visibility })} className={adminInput}>
              <option value="draft">Draft</option>
              <option value="now">Publish now</option>
              <option value="schedule">Schedule…</option>
            </select>
          </div>
          {form.visibility === "schedule" ? (
            <div className="space-y-1.5">
              <label className={adminLabel}>Publish at</label>
              <input type="datetime-local" value={form.scheduleAt} onChange={(e) => setForm({ ...form, scheduleAt: e.target.value })} className={adminInput} />
            </div>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {editingId ? "Save" : "Add"}
            </button>
            {editingId ? <button type="button" onClick={resetForm} className={btnGhost}>Cancel</button> : null}
          </div>
        </div>
      </form>

      {/* List */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-bg-soft text-left text-text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">#</th>
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">Pages</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {chapters.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-text-muted">No chapters yet. Add the first above.</td></tr>
            ) : (
              chapters.map((c) => {
                const st = statusOf(c.publishedAt);
                const published = c.publishedAt && new Date(c.publishedAt) <= new Date();
                const expanded = expandedId === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr className="border-t border-border odd:bg-surface/40">
                      <td className="px-4 py-2.5 font-semibold text-primary">
                        {c.number}
                      </td>
                      <td className="px-4 py-2.5">{c.title || <span className="text-text-muted">—</span>}</td>
                      <td className="px-4 py-2.5 text-text-muted">{c.pagesCount}</td>
                      <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => setExpandedId(expanded ? null : c.id)} className={cn(btnGhost, expanded && "bg-surface text-foreground")} title="Manage pages">
                            <Images className="size-4" /> Pages
                            <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
                          </button>
                          <button type="button" onClick={() => quickPublishToggle(c)} disabled={pending} className={btnGhost} title={published ? "Unpublish" : "Publish now"}>
                            {published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                          </button>
                          <button type="button" onClick={() => startEdit(c)} className={btnGhost} title="Edit"><Pencil className="size-4" /></button>
                          <button type="button" onClick={() => remove(c)} disabled={pending} className={btnDanger} title="Delete"><Trash2 className="size-4" /></button>
                        </div>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-t border-border bg-bg-soft/60">
                        <td colSpan={5} className="px-4 py-4">
                          <ChapterPagesInline chapterId={c.id} mangaTitle={mangaTitle} chapterNumber={c.number} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
