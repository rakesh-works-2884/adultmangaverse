import { cache } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { BookOpen, ExternalLink, Eye, Layers, MessageSquare, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { cardSelect } from "@/lib/catalog";
import { IntensityBadge } from "@/components/public/IntensityBadge";
import { MangaCard } from "@/components/public/MangaCard";
import { Stars } from "@/components/public/Stars";
import { ViewCounter } from "@/components/public/ViewCounter";
import { ReviewForm } from "@/components/public/ReviewForm";
import { MangaActionsPanel } from "@/components/public/MangaActionsPanel";
import { CommentsSection } from "@/components/public/CommentsSection";
import { buildMetadata, mangaJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { StructuredData } from "@/components/seo/StructuredData";
import { stripHtml } from "@/lib/utils";

// No auth() here anymore — continue-reading/bookmark/offline-save state is
// fetched client-side (see MangaActionsPanel), so this page has no
// session/dynamic-API dependency and can be cached instead of fully
// re-rendering on every request.
export const revalidate = 60;
export async function generateStaticParams() {
  return [];
}

// generateMetadata and the page body both need this manga — React's cache()
// dedupes identical calls within one request, so this only hits the DB once
// instead of twice per page view.
const getMangaDetail = cache((slug: string) =>
  prisma.manga.findFirst({
    where: { slug, published: true },
    include: {
      genres: { orderBy: { name: "asc" }, select: { name: true, slug: true } },
      chapters: {
        where: { publishedAt: { not: null, lte: new Date() } },
        orderBy: { number: "desc" },
        select: { id: true, number: true, title: true, publishedAt: true },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, rating: true, body: true, createdAt: true, user: { select: { name: true } } },
      },
      _count: { select: { reviews: true } },
    },
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const manga = await getMangaDetail(slug);
  if (!manga) return buildMetadata({ title: "Not found", path: `/manga/${slug}`, noindex: true });
  return buildMetadata({
    fullTitle: manga.seoTitle || undefined,
    title: manga.seoTitle ? undefined : `Read ${manga.title} Online — All Chapters`,
    description: manga.seoDescription || (manga.synopsis ? stripHtml(manga.synopsis).slice(0, 160) : undefined),
    path: `/manga/${slug}`,
    image: manga.coverUrl,
    ogType: "book",
  });
}

export default async function MangaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const now = new Date();

  const manga = await getMangaDetail(slug);

  if (!manga) {
    // Honor a renamed slug with a permanent (308) redirect (Rules §5).
    const moved = await prisma.slugRedirect.findUnique({
      where: { entity_oldSlug: { entity: "manga", oldSlug: slug } },
      select: { newSlug: true },
    });
    if (moved) permanentRedirect(`/manga/${moved.newSlug}`);
    notFound();
  }

  const chapters = manga.chapters;
  const firstChapter = chapters.length ? chapters[chapters.length - 1] : null;

  // Comments and related titles are both independent of each other and of
  // any session — run them in parallel.
  const genreSlugs = manga.genres.map((g) => g.slug);

  const [comments, related] = await Promise.all([
    prisma.comment.findMany({
      where: { mangaId: manga.id, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, body: true, createdAt: true, user: { select: { name: true } } },
    }),
    genreSlugs.length
      ? prisma.manga.findMany({
          where: { published: true, slug: { not: manga.slug }, genres: { some: { slug: { in: genreSlugs } } } },
          orderBy: { views: "desc" },
          take: 6,
          select: cardSelect,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <StructuredData
        data={[
          mangaJsonLd({
            title: manga.title,
            slug: manga.slug,
            description: manga.synopsis ? stripHtml(manga.synopsis) : null,
            coverUrl: manga.coverUrl,
            author: manga.author,
            rating: manga.rating,
            ratingCount: manga.ratingCount,
            genres: manga.genres.map((g) => g.name),
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Browse", path: "/browse" },
            { name: manga.title, path: `/manga/${manga.slug}` },
          ]),
        ]}
      />
      <ViewCounter mangaId={manga.id} />

      {/* Header */}
      <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
        <div className="relative mx-auto aspect-[2/3] w-40 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_8px_32px_rgb(0_0_0/0.5)] sm:mx-0 sm:w-full">
          {manga.coverUrl ? <Image src={manga.coverUrl} alt={`${manga.title} cover`} fill sizes="220px" className="object-cover" priority /> : null}
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <IntensityBadge intensity={manga.intensity} />
            <span className="rounded bg-surface px-2 py-0.5 text-xs font-medium text-text-muted">{manga.status}</span>
          </div>
          <h1 className="font-heading text-3xl font-bold leading-tight sm:text-4xl">{manga.title}</h1>
          {manga.altTitles.length ? <p className="mt-1 text-sm text-text-muted">{manga.altTitles.join(" · ")}</p> : null}

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-muted">
            {manga.author ? <span>Author: <span className="text-foreground">{manga.author}</span></span> : null}
            {manga.artist && manga.artist !== manga.author ? <span>Artist: <span className="text-foreground">{manga.artist}</span></span> : null}
            {manga.releaseYear ? <span>Year: <span className="text-foreground">{manga.releaseYear}</span></span> : null}
          </div>

          {/* Stats */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5"><Stars value={manga.rating} /><span className="text-text-muted">{manga.rating.toFixed(1)} ({manga.ratingCount})</span></span>
            <span className="flex items-center gap-1.5 text-text-muted"><Eye className="size-4" /> {manga.views.toLocaleString()}</span>
            <span className="flex items-center gap-1.5 text-text-muted"><Layers className="size-4" /> {chapters.length} chapters</span>
          </div>

          {/* Genres */}
          <div className="mt-4 flex flex-wrap gap-2">
            {manga.genres.map((g) => (
              <Link key={g.slug} href={`/genre/${g.slug}`} className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted transition-colors hover:border-primary/50 hover:text-highlight">{g.name}</Link>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap gap-3">
            {firstChapter ? (
              <Link href={`/manga/${manga.slug}/${firstChapter.number}`} className="btn-3d inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:scale-[0.97]">
                <BookOpen className="size-4" strokeWidth={2} /> Start Reading
              </Link>
            ) : <span className="text-sm text-text-muted">No chapters published yet.</span>}
            <MangaActionsPanel mangaId={manga.id} mangaSlug={manga.slug} />
          </div>
        </div>
      </div>

      {/* Ownership / support the creator */}
      {manga.authorLink ? (
        <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-bg-soft px-4 py-3 text-sm">
          <span className="text-text-muted">This content isn&apos;t owned by us — please support the original creator:</span>
          <a
            href={manga.authorLink}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-highlight hover:underline"
          >
            {manga.author ? `Support ${manga.author}` : "Visit the creator's page"}
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      ) : null}

      {/* Content warnings */}
      {manga.contentWarnings.length ? (
        <div className="mt-8 rounded-xl border border-danger/30 bg-danger/10 p-4">
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-danger"><TriangleAlert className="size-4" /> Content warnings</p>
          <p className="text-sm text-text">{manga.contentWarnings.join(" · ")}</p>
        </div>
      ) : null}

      {/* Synopsis */}
      {manga.synopsis ? (
        <section className="mt-8">
          <h2 className="mb-2 font-heading text-lg font-semibold">Synopsis</h2>
          <div className="richtext text-sm text-text" dangerouslySetInnerHTML={{ __html: manga.synopsis }} />
        </section>
      ) : null}

      {/* Chapters — only worth showing as a list once there's something to
          pick between; a single-chapter oneshot already has "Start Reading"
          above, so a list with one "Chapter 1" row would be redundant. */}
      {chapters.length > 1 ? (
        <section className="mt-8">
          <h2 className="mb-3 font-heading text-lg font-semibold">Chapters</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            {chapters.map((c, i) => {
              const isNew = c.publishedAt && now.getTime() - new Date(c.publishedAt).getTime() < 48 * 3600 * 1000;
              return (
                <Link key={c.id} href={`/manga/${manga.slug}/${c.number}`} className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-hover ${i % 2 ? "bg-surface/40" : ""}`}>
                  <span className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-primary">Chapter {c.number.toString()}</span>
                    {c.title ? <span className="text-text-muted">· {c.title}</span> : null}
                    {isNew ? <span className="rounded-full bg-success/20 px-1.5 py-0.5 text-[10px] font-bold text-success">NEW</span> : null}
                  </span>
                  {c.publishedAt ? <span className="shrink-0 text-xs text-text-muted">{formatDistanceToNowStrict(new Date(c.publishedAt), { addSuffix: true })}</span> : null}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Reviews */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold"><MessageSquare className="size-5 text-primary" /> Reviews ({manga._count.reviews})</h2>
        <div className="mb-4"><ReviewForm mangaId={manga.id} /></div>
        {manga.reviews.length === 0 ? (
          <p className="text-sm text-text-muted">No reviews yet. Be the first.</p>
        ) : (
          <div className="space-y-3">
            {manga.reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium">{r.user.name || "Reader"} <Stars value={r.rating} /></span>
                  <span className="text-xs text-text-muted">{formatDistanceToNowStrict(new Date(r.createdAt), { addSuffix: true })}</span>
                </div>
                {r.body ? <p className="text-sm text-text-muted">{r.body}</p> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Comments */}
      <CommentsSection
        mangaId={manga.id}
        comments={comments.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt.toISOString(), userName: c.user.name }))}
      />

      {/* Related */}
      {related.length ? (
        <section className="mt-10">
          <h2 className="mb-3 font-heading text-lg font-semibold">Similar Titles</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {related.map((m) => <MangaCard key={m.slug} manga={m} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
