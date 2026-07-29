import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();

  const [manga, chapters, genres, staticPages, blogPosts] = await Promise.all([
    prisma.manga.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.chapter.findMany({
      where: { publishedAt: { not: null, lte: now }, manga: { published: true } },
      select: { number: true, publishedAt: true, manga: { select: { slug: true } } },
    }),
    prisma.genre.findMany({ select: { slug: true } }),
    prisma.staticPage.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.blog.findMany({ where: { published: true, publishedAt: { not: null, lte: now } }, select: { slug: true, updatedAt: true } }),
  ]);

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/browse`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/subscribe`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    ...manga.map((m) => ({ url: `${base}/manga/${m.slug}`, lastModified: m.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...chapters.map((c) => ({ url: `${base}/manga/${c.manga.slug}/${c.number.toString()}`, lastModified: c.publishedAt ?? now, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...genres.map((g) => ({ url: `${base}/genre/${g.slug}`, changeFrequency: "weekly" as const, priority: 0.4 })),
    ...staticPages.map((p) => ({ url: `${base}/p/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.3 })),
    ...blogPosts.map((b) => ({ url: `${base}/blog/${b.slug}`, lastModified: b.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
