import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReaderView } from "@/components/public/ReaderView";
import { buildMetadata, chapterJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { StructuredData } from "@/components/seo/StructuredData";

// No auth() and no signed URLs here anymore (see getChapterPages in
// actions/reader.ts) — this page is now just chapter metadata (number,
// title, prev/next, chapter list), none of it session- or time-sensitive,
// so it's safe to cache instead of fully re-rendering on every single hit —
// this is the highest-traffic route in the app, so that matters most here.
// Unpublishing a chapter can take up to this long to stop showing its shell,
// but getChapterPages re-checks publish state on every call regardless, so
// the actual page images stop being servable immediately either way.
export const revalidate = 60;
// Required for `revalidate` to actually apply to a dynamic segment at
// runtime (this Next version otherwise silently ignores it) — an empty
// array means "don't prerender any at build time," each slug/chapter still
// renders (and then caches) on its first real request.
export async function generateStaticParams() {
  return [];
}

const NUM_RE = /^\d+(\.\d+)?$/;

// Shared between generateMetadata and the page body (React cache() dedupes
// within one request) — this is the highest-traffic route in the app, so a
// saved round trip here matters more than anywhere else.
const getMangaBySlug = cache((slug: string) =>
  prisma.manga.findFirst({ where: { slug, published: true }, select: { id: true, slug: true, title: true } }),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string; chapter: string }> }) {
  const { slug, chapter } = await params;
  const manga = await getMangaBySlug(slug);
  return buildMetadata({
    title: manga ? `${manga.title} — Chapter ${chapter}` : "Chapter",
    description: manga ? `Read ${manga.title} chapter ${chapter} online in high quality.` : undefined,
    path: `/manga/${slug}/${chapter}`,
    noindex: !manga,
  });
}

export default async function ReaderPage({ params }: { params: Promise<{ slug: string; chapter: string }> }) {
  const { slug, chapter } = await params;
  if (!NUM_RE.test(chapter)) notFound();

  const now = new Date();

  const manga = await getMangaBySlug(slug);
  if (!manga) notFound();

  // Both depend only on manga.id, not on each other.
  const [chap, all] = await Promise.all([
    prisma.chapter.findFirst({
      where: { mangaId: manga.id, number: chapter, publishedAt: { not: null, lte: now } },
      select: { id: true, number: true, title: true },
    }),
    prisma.chapter.findMany({
      where: { mangaId: manga.id, publishedAt: { not: null, lte: now } },
      orderBy: { number: "asc" },
      select: { number: true, title: true },
    }),
  ]);
  if (!chap) notFound();

  const nums = all.map((c) => c.number.toString());
  const idx = nums.indexOf(chap.number.toString());
  const prevNumber = idx > 0 ? nums[idx - 1] : null;
  const nextNumber = idx >= 0 && idx < nums.length - 1 ? nums[idx + 1] : null;

  return (
    <>
      <StructuredData
        data={[
          chapterJsonLd({
            mangaTitle: manga.title,
            slug: manga.slug,
            chapterNumber: chap.number.toString(),
            chapterTitle: chap.title,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: manga.title, path: `/manga/${manga.slug}` },
            { name: `Chapter ${chap.number.toString()}`, path: `/manga/${manga.slug}/${chap.number.toString()}` },
          ]),
        ]}
      />
      <ReaderView
        mangaSlug={manga.slug}
        mangaTitle={manga.title}
        mangaId={manga.id}
        chapterId={chap.id}
        chapterNumber={chap.number.toString()}
        prevNumber={prevNumber}
        nextNumber={nextNumber}
        chapters={all.map((c) => ({ number: c.number.toString(), title: c.title }))}
      />
    </>
  );
}
