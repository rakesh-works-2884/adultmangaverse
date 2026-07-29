/**
 * Central site configuration. Values here are the code-level defaults for
 * now; from Phase 8 the admin Settings panel will override the SEO/site-name
 * pieces at runtime via the Setting model.
 *
 * Adult Manga Verse is an 18+ platform — see the age gate + legal pages.
 */
export const siteConfig = {
  name: "Adult Manga Verse",
  shortName: "AMV",
  tagline: "18+ adult manga — read free, online",
  description:
    "Adult Manga Verse is an 18+ adult manga platform. Verify your age, then browse and read adult manga, manhwa, and manhua with content-intensity ratings — every title is free for everyone.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ageGateKey: "amv_age_verified",
} as const;

export const mainNav = [
  { label: "Home", href: "/" },
  { label: "Browse", href: "/browse" },
  { label: "Blog", href: "/blog" },
  { label: "Subscribe", href: "/subscribe" },
] as const;
