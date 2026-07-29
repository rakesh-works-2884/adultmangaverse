import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/lib/site";

/**
 * Site settings (Setting model, key/value). Code defaults below; admin
 * overrides are stored in the DB and overlaid.
 *
 * `getSettings` is read by the root layout, so it runs on every request to
 * every page (public + admin) — cache it across requests instead of hitting
 * the DB every time. Revalidated on a 5-minute timer and on-demand via the
 * "settings" tag whenever an admin saves changes.
 */
export const SETTINGS_DEFAULTS = {
  siteName: siteConfig.name,
  titleTemplate: `%s — ${siteConfig.name}`, // %s = page title
  defaultDescription: siteConfig.description,
  defaultOgImage: "", // path or URL; empty → none
  twitterHandle: "", // e.g. @handle
  analyticsSnippet: "", // raw <script> analytics tag(s), injected site-wide
} as const;

export type SettingKey = keyof typeof SETTINGS_DEFAULTS;
export type Settings = Record<SettingKey, string>;

export const getSettings = unstable_cache(
  async (): Promise<Settings> => {
    const rows = await prisma.setting.findMany();
    const map: Settings = { ...SETTINGS_DEFAULTS };
    for (const r of rows) {
      if (r.key in SETTINGS_DEFAULTS) map[r.key as SettingKey] = r.value;
    }
    return map;
  },
  ["site-settings"],
  { revalidate: 300, tags: ["settings"] },
);
