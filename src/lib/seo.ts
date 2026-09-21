import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { getSettings } from "@/lib/settings";

function abs(pathOrUrl: string): string {
  try {
    return new URL(pathOrUrl, siteConfig.url).toString();
  } catch {
    return pathOrUrl;
  }
}

function applyTemplate(tpl: string, title: string): string {
  return tpl.includes("%s") ? tpl.replace("%s", title) : `${title} — ${tpl}`;
}

/**
 * Single source of truth for page metadata (Rules §5). Every public page's
 * generateMetadata routes through this. Produces canonical + OpenGraph + Twitter.
 */
export async function buildMetadata(opts: {
  title?: string; // page-specific; folded into the settings title template
  fullTitle?: string; // bypass the template
  description?: string;
  path?: string; // canonical path, e.g. "/manga/foo"
  canonicalUrl?: string | null;
  image?: string | null;
  noindex?: boolean;
  nofollow?: boolean;
  ogType?: "website" | "article" | "book";
}): Promise<Metadata> {
  const s = await getSettings();
  const fullTitle =
    opts.fullTitle ??
    (opts.title ? applyTemplate(s.titleTemplate || "%s", opts.title) : `${s.siteName || siteConfig.name} — ${siteConfig.tagline}`);
  const description = (opts.description || s.defaultDescription || siteConfig.description).slice(0, 300);
  const canonical = opts.canonicalUrl ? opts.canonicalUrl : abs(opts.path ?? "/");
  const img = opts.image || s.defaultOgImage;
  const images = img ? [abs(img)] : undefined;

  const verification: Record<string, string> = {};
  if (s.googleVerification) verification.google = s.googleVerification;
  if (s.bingVerification) verification.yandex = s.bingVerification; // or custom verification meta tags

  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical },
    robots: {
      index: !opts.noindex,
      follow: !opts.nofollow,
    },
    verification: Object.keys(verification).length > 0 ? verification : undefined,
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: s.siteName || siteConfig.name,
      type: opts.ogType === "book" ? "website" : opts.ogType ?? "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images,
      ...(s.twitterHandle ? { site: s.twitterHandle } : {}),
    },
  };
}

// ── JSON-LD builders ──────────────────────────────────────────────

type Json = Record<string, unknown>;

export function websiteJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

export function mangaJsonLd(m: {
  title: string;
  slug: string;
  description?: string | null;
  coverUrl?: string | null;
  author?: string | null;
  rating: number;
  ratingCount: number;
  genres: string[];
}): Json {
  const data: Json = {
    "@context": "https://schema.org",
    "@type": "ComicSeries",
    name: m.title,
    url: `${siteConfig.url}/manga/${m.slug}`,
    genre: m.genres,
  };
  if (m.coverUrl) data.image = abs(m.coverUrl);
  if (m.description) data.description = m.description.slice(0, 500);
  if (m.author) data.author = { "@type": "Person", name: m.author };
  if (m.ratingCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(m.rating.toFixed(1)),
      ratingCount: m.ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return data;
}

export function articleJsonLd(a: {
  title: string;
  slug: string;
  description?: string | null;
  coverImage?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}): Json {
  const data: Json = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    url: `${siteConfig.url}/blog/${a.slug}`,
    author: { "@type": "Person", name: a.author || siteConfig.name },
  };
  if (a.coverImage) data.image = abs(a.coverImage);
  if (a.description) data.description = a.description.slice(0, 500);
  if (a.publishedAt) data.datePublished = a.publishedAt;
  if (a.updatedAt) data.dateModified = a.updatedAt;
  return data;
}

export function chapterJsonLd(m: {
  mangaTitle: string;
  slug: string;
  chapterNumber: string;
  chapterTitle?: string | null;
  datePublished?: string | null;
}): Json {
  const data: Json = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${m.mangaTitle} — Chapter ${m.chapterNumber}${m.chapterTitle ? `: ${m.chapterTitle}` : ""}`,
    url: `${siteConfig.url}/manga/${m.slug}/${m.chapterNumber}`,
    isPartOf: { "@type": "ComicSeries", name: m.mangaTitle, url: `${siteConfig.url}/manga/${m.slug}` },
  };
  if (m.datePublished) data.datePublished = m.datePublished;
  return data;
}
