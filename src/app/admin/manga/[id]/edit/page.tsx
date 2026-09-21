import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { MangaForm, type MangaFormInitial } from "@/components/admin/MangaForm";
import { ChapterManager, type ChapterRow } from "@/components/admin/ChapterManager";

export const dynamic = "force-dynamic";

export default async function EditMangaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await requireAdmin())) redirect("/");
  const { id } = await params;
  const [manga, genres] = await Promise.all([
    prisma.manga.findUnique({
      where: { id },
      include: {
        genres: { select: { id: true } },
        chapters: { orderBy: { number: "desc" }, include: { _count: { select: { pages: true } } } },
      },
    }),
    prisma.genre.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!manga) notFound();

  const initial: MangaFormInitial = {
    id: manga.id,
    title: manga.title,
    slug: manga.slug,
    altTitles: manga.altTitles,
    synopsis: manga.synopsis,
    author: manga.author,
    authorLink: manga.authorLink,
    artist: manga.artist,
    status: manga.status,
    type: manga.type,
    intensity: manga.intensity,
    isPremium: manga.isPremium,
    contentWarnings: manga.contentWarnings,
    releaseYear: manga.releaseYear,
    featured: manga.featured,
    published: manga.published,
    genreIds: manga.genres.map((g) => g.id),
    coverUrl: manga.coverUrl,
    heroImageDesktop: manga.heroImageDesktop,
    heroImageMobile: manga.heroImageMobile,
    seoTitle: manga.seoTitle,
    seoDescription: manga.seoDescription,
  };

  const chapterRows: ChapterRow[] = manga.chapters.map((c) => ({
    id: c.id,
    number: c.number.toString(),
    title: c.title,
    isPremium: c.isPremium,
    publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
    pagesCount: c._count.pages,
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/manga" className="mb-2 inline-flex items-center gap-1 text-sm text-text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to list
        </Link>
        <h1 className="font-heading text-2xl font-semibold">Edit: {manga.title}</h1>
      </div>

      <MangaForm mode="edit" genres={genres} initial={initial} />

      <section className="border-t border-border pt-6">
        <div className="mb-3">
          <h2 className="font-heading text-xl font-semibold">Chapters &amp; pages</h2>
          <p className="mt-1 text-sm text-text-muted">
            Add chapters below, then expand <strong>Pages</strong> on any chapter to upload images or a PDF — all here.
          </p>
        </div>
        <ChapterManager mangaId={manga.id} mangaTitle={manga.title} chapters={chapterRows} />
      </section>
    </div>
  );
}
