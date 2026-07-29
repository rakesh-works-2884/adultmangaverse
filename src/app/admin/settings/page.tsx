import { getSettings } from "@/lib/settings";
import { SeoSettingsForm } from "@/components/admin/SeoSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">Site name, metadata defaults, and analytics.</p>
      </div>
      <SeoSettingsForm settings={settings} />
    </div>
  );
}
