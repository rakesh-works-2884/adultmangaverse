import { getSettings } from "@/lib/settings";
import { getSeoRedirects, get404Logs } from "@/actions/seo-actions";
import { RankMathAdminHub } from "@/components/admin/RankMathAdminHub";

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const [settings, redirects, logs] = await Promise.all([
    getSettings(),
    getSeoRedirects(),
    get404Logs(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Rank Math SEO Suite</h1>
        <p className="mt-1 text-sm text-text-muted">
          Complete search engine optimization center, SERP settings, 301 redirections, 404 monitor, and site-wide audit.
        </p>
      </div>

      <RankMathAdminHub settings={settings} redirects={redirects} logs={logs} />
    </div>
  );
}
