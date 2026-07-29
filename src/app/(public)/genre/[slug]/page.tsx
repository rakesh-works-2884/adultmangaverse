import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { prisma } from "@/lib/db";
import { cardSelect } from "@/lib/catalog";
import { MangaCard } from "@/components/public/MangaCard";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { StructuredData } from "@/components/seo/StructuredData";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 24;

// Shared between generateMetadata and the page body.
const getGenreBySlug = cache((slug: string) => prisma.genre.findUnique({ where: { slug }, select: { name: true, slug: true } }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const genre = await getGenreBySlug(slug);
  if (!genre) return buildMetadata({ title: "Genre", path: `/genre/${slug}`, noindex: true });
  return buildMetadata({
    title: `${genre.name} Manga`,
    description: `Read ${genre.name} adult manga online. Browse the ${genre.name} collection on Adult Manga Verse.`,
    path: `/genre/${slug}`,
  });
}

export default async function GenrePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where = { published: true, genres: { some: { slug } } };
  const [genre, total, manga] = await Promise.all([
    getGenreBySlug(slug),
    prisma.manga.count({ where }),
    prisma.manga.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: cardSelect }),
  ]);
  if (!genre) notFound();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (p: number) => (p > 1 ? `/genre/${slug}?page=${p}` : `/genre/${slug}`);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <StructuredData data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Browse", path: "/browse" }, { name: genre.name, path: `/genre/${slug}` }])} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{genre.name}</h1>
          <p className="mt-1 text-sm text-text-muted">{total} title{total === 1 ? "" : "s"}</p>
        </div>
        <Link href={`/browse?genres=${slug}`} className="btn-3d-outline inline-flex h-9 items-center gap-2 rounded-lg border border-primary/40 px-4 font-ui text-sm font-medium text-primary hover:bg-primary/10">
          <SlidersHorizontal className="size-4" /> Filter in Browse
        </Link>
      </div>

      {manga.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-bg-soft px-5 py-16 text-center text-sm text-text-muted">
          No published titles in this genre yet.
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
  );
}
