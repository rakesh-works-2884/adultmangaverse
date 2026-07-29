import Link from "next/link";
import { prisma } from "@/lib/db";
import { cardSelect, buildMangaWhere, buildOrderBy } from "@/lib/catalog";
import { MangaCard } from "@/components/public/MangaCard";
import { BrowseFilters } from "@/components/public/BrowseFilters";
import { MANGA_STATUSES, MANGA_TYPES, CONTENT_INTENSITIES } from "@/lib/validators";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { StructuredData } from "@/components/seo/StructuredData";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildMetadata({ title: "Browse", description: "Browse and filter the full adult manga library by genre, type, status, and content intensity.", path: "/browse" });
}

const PAGE_SIZE = 24;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const q = one(raw.q).trim();
  const genres = one(raw.genres) ? one(raw.genres).split(",").filter(Boolean) : [];
  const intensity = (one(raw.intensity) ? one(raw.intensity).split(",") : []).filter((i) =>
    (CONTENT_INTENSITIES as readonly string[]).includes(i),
  );
  const status = (MANGA_STATUSES as readonly string[]).includes(one(raw.status)) ? one(raw.status) : "";
  const type = (MANGA_TYPES as readonly string[]).includes(one(raw.type)) ? one(raw.type) : "";
  const premium = one(raw.premium) === "1";
  const sort = one(raw.sort) || "latest";
  const year = /^\d{4}$/.test(one(raw.year)) ? one(raw.year) : "";
  const page = Math.max(1, Number(one(raw.page)) || 1);

  const filters = { q, genres, status, type, intensity, premium, year };

  const [total, manga, allGenres] = await Promise.all([
    prisma.manga.count({ where: buildMangaWhere(filters) }),
    prisma.manga.findMany({
      where: buildMangaWhere(filters),
      orderBy: buildOrderBy(sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: cardSelect,
    }),
    prisma.genre.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function hrefFor(p: number): string {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (genres.length) params.set("genres", genres.join(","));
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (intensity.length) params.set("intensity", intensity.join(","));
    if (premium) params.set("premium", "1");
    if (sort !== "latest") params.set("sort", sort);
    if (year) params.set("year", year);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/browse?${s}` : "/browse";
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <StructuredData data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Browse", path: "/browse" }])} />
      <h1 className="mb-6 font-heading text-2xl font-bold sm:text-3xl">Browse</h1>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside>
          <BrowseFilters current={{ ...filters, sort }} genres={allGenres} />
        </aside>

        <div>
          <p className="mb-4 text-sm text-text-muted">{total} title{total === 1 ? "" : "s"}</p>

          {manga.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg-soft px-5 py-16 text-center text-sm text-text-muted">
              No titles match these filters.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {manga.map((m) => <MangaCard key={m.slug} manga={m} />)}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-between text-sm">
              <span className="text-text-muted">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                {page > 1 ? <Link href={hrefFor(page - 1)} className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-4 font-ui font-medium hover:border-primary/50">Previous</Link> : null}
                {page < totalPages ? <Link href={hrefFor(page + 1)} className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-4 font-ui font-medium hover:border-primary/50">Next</Link> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
