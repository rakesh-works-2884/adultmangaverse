import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { cardSelect, buildMangaWhere } from "@/lib/catalog";
import { MangaCard, type MangaCardData } from "@/components/public/MangaCard";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildMetadata({ title: "Search", path: "/search", noindex: true });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let results: MangaCardData[] = [];
  if (query.length >= 2) {
    results = await prisma.manga.findMany({
      where: buildMangaWhere({ q: query, genres: [], status: "", type: "", intensity: [], premium: false, year: "" }),
      orderBy: { views: "desc" },
      take: 48,
      select: cardSelect,
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 flex items-center gap-2 font-heading text-2xl font-bold sm:text-3xl">
        <Search className="size-6 text-primary" strokeWidth={1.5} />
        {query ? <>Results for “{query}”</> : "Search"}
      </h1>

      {query.length < 2 ? (
        <p className="rounded-xl border border-dashed border-border bg-bg-soft px-5 py-16 text-center text-sm text-text-muted">
          Type at least 2 characters to search.
        </p>
      ) : results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-bg-soft px-5 py-16 text-center text-sm text-text-muted">
          No titles found for “{query}”.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-text-muted">{results.length} result{results.length === 1 ? "" : "s"}</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {results.map((m) => <MangaCard key={m.slug} manga={m} />)}
          </div>
        </>
      )}
    </div>
  );
}
