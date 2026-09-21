import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma, MangaStatus, MangaType, ContentIntensity } from "@/generated/prisma/client";

/**
 * Fields needed to render a MangaCard. Selecting exactly these keeps public
 * queries lean and the rows are structurally a `MangaCardData`.
 */
export const cardSelect = {
  slug: true,
  title: true,
  coverUrl: true,
  type: true,
  intensity: true,
  isPremium: true,
  rating: true,
} satisfies Prisma.MangaSelect;

/** Only published manga are visible on the public site. */
export const publishedWhere = { published: true } satisfies Prisma.MangaWhereInput;

export type CatalogFilters = {
  q?: string;
  genres: string[];
  status: string; // "" or a valid MangaStatus
  type: string; // "" or a valid MangaType
  intensity: string[]; // valid ContentIntensity values
  premium: boolean;
  year: string; // "" or numeric string
};

/** Build a published-only Prisma where clause from validated filters. */
export function buildMangaWhere(f: CatalogFilters): Prisma.MangaWhereInput {
  const where: Prisma.MangaWhereInput = { published: true };
  if (f.genres.length) where.genres = { some: { slug: { in: f.genres } } };
  if (f.status) where.status = f.status as MangaStatus;
  if (f.type) where.type = f.type as MangaType;
  if (f.intensity.length) where.intensity = { in: f.intensity as ContentIntensity[] };
  if (f.premium) where.isPremium = true;
  const year = Number(f.year);
  if (f.year && !Number.isNaN(year)) where.releaseYear = year;
  if (f.q) {
    where.OR = [
      { title: { contains: f.q, mode: "insensitive" } },
      { altTitles: { has: f.q } },
      { author: { contains: f.q, mode: "insensitive" } },
    ];
  }
  return where;
}

export function buildOrderBy(sort: string): Prisma.MangaOrderByWithRelationInput {
  switch (sort) {
    case "popular": return { views: "desc" };
    case "rating": return { rating: "desc" };
    case "new": return { createdAt: "desc" };
    case "az": return { title: "asc" };
    default: return { updatedAt: "desc" };
  }
}

/**
 * The genre list is fetched on every single public page (site header nav)
 * but only ever changes via admin CRUD — cache it instead of hitting the DB
 * on every request. Revalidated on a 5-minute timer and on-demand via the
 * "genres" tag whenever an admin creates/renames/deletes one.
 */
export const getGenresList = unstable_cache(
  async () => prisma.genre.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
  ["genres-list"],
  { revalidate: 300, tags: ["genres"] },
);
