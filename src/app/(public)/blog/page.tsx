import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { StructuredData } from "@/components/seo/StructuredData";
import { RevealOnScroll } from "@/components/public/RevealOnScroll";
import { stripHtml } from "@/lib/utils";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 12;

export async function generateMetadata() {
  return buildMetadata({ title: "Blog", path: "/blog" });
}

export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where = { published: true, publishedAt: { not: null, lte: new Date() } };
  const [total, posts] = await Promise.all([
    prisma.blog.count({ where }),
    prisma.blog.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { slug: true, title: true, excerpt: true, coverImage: true, author: true, publishedAt: true, contentHtml: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (p: number) => (p > 1 ? `/blog?page=${p}` : "/blog");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <StructuredData data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }])} />
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">Blog</h1>
        <p className="mt-1 text-sm text-text-muted">News, updates, and notes from Adult Manga Verse.</p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-bg-soft px-5 py-16 text-center text-sm text-text-muted">
          No posts yet — check back soon.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {posts.map((p, i) => {
            const excerpt = p.excerpt || stripHtml(p.contentHtml).slice(0, 160);
            return (
              <RevealOnScroll key={p.slug} delayMs={(i % 4) * 60}>
                <Link href={`/blog/${p.slug}`} className="tilt-card group block overflow-hidden rounded-xl border border-border bg-surface">
                  <div className="relative aspect-[1200/630] w-full overflow-hidden bg-bg-soft">
                    {p.coverImage ? (
                      <Image src={p.coverImage} alt={p.title} fill sizes="(max-width: 640px) 100vw, 480px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h2 className="font-heading text-lg font-semibold leading-snug group-hover:text-highlight">{p.title}</h2>
                    {excerpt ? <p className="mt-1.5 line-clamp-2 text-sm text-text-muted">{excerpt}</p> : null}
                    <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                      {p.author ? <span>{p.author}</span> : null}
                      {p.author && p.publishedAt ? <span>·</span> : null}
                      {p.publishedAt ? <span>{format(p.publishedAt, "MMM d, yyyy")}</span> : null}
                    </div>
                  </div>
                </Link>
              </RevealOnScroll>
            );
          })}
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
