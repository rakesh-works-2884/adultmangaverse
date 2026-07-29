import { getSettings } from "@/lib/settings";
import { SeoSettingsForm } from "@/components/admin/SeoSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">SEO &amp; Metadata</h1>
        <p className="mt-1 text-sm text-text-muted">
          Global defaults used across the site. Per-manga overrides are set on each manga&apos;s edit form.
        </p>
      </div>
      <SeoSettingsForm settings={settings} />
    </div>
  );
}
