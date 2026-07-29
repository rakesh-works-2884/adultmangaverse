"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { saveSeoSettings } from "@/actions/settings";
import { adminInput, adminLabel, adminTextarea, btnPrimary } from "@/components/admin/styles";

export function SeoSettingsForm({ settings }: { settings: Record<string, string> }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveSeoSettings(fd);
      if (!res.ok) return setError(res.error);
      setSaved(true);
    });
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {saved ? <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">Settings saved.</p> : null}

      <div className="space-y-1.5">
        <label className={adminLabel}>Site name</label>
        <input name="siteName" defaultValue={settings.siteName} className={adminInput} />
      </div>

      <div className="space-y-1.5">
        <label className={adminLabel}>Title template</label>
        <input name="titleTemplate" defaultValue={settings.titleTemplate} className={adminInput} />
        <p className="text-xs text-text-muted">Use <code className="rounded bg-bg-soft px-1">%s</code> for the page title, e.g. <code className="rounded bg-bg-soft px-1">%s — Adult Manga Verse</code>.</p>
      </div>

      <div className="space-y-1.5">
        <label className={adminLabel}>Default meta description</label>
        <textarea name="defaultDescription" defaultValue={settings.defaultDescription} rows={3} maxLength={300} className={adminTextarea} />
      </div>

      <div className="space-y-1.5">
        <label className={adminLabel}>Default OpenGraph image URL</label>
        <input name="defaultOgImage" defaultValue={settings.defaultOgImage} placeholder="/og-default.png or https://…" className={adminInput} />
      </div>

      <div className="space-y-1.5">
        <label className={adminLabel}>Twitter handle</label>
        <input name="twitterHandle" defaultValue={settings.twitterHandle} placeholder="@yoursite" className={adminInput} />
      </div>

      <div className="space-y-1.5">
        <label className={adminLabel}>Analytics snippet</label>
        <textarea name="analyticsSnippet" defaultValue={settings.analyticsSnippet} rows={4} className={`${adminTextarea} font-mono text-xs`} placeholder="Paste your analytics <script> tag(s) — injected site-wide." />
        <p className="text-xs text-text-muted">Raw HTML/JS is injected on every page. Only paste code you trust.</p>
      </div>

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save settings
      </button>
    </form>
  );
}
