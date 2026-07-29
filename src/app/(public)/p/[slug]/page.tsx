import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { stripHtml } from "@/lib/utils";

// No session dependency — cache and revalidate instead of full-dynamic.
// Admin edits to a static page are infrequent, a few minutes' staleness is fine.
export const revalidate = 300;
// Required for `revalidate` to actually apply to a dynamic segment at
// runtime (this Next version otherwise silently ignores it) — an empty
// array means "don't prerender any at build time," each slug still renders
// (and then caches) on its first real request.
export async function generateStaticParams() {
  return [];
}

const getStaticPage = cache((slug: string) => prisma.staticPage.findUnique({ where: { slug } }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getStaticPage(slug);
  if (!page) return buildMetadata({ title: "Not found", path: `/p/${slug}`, noindex: true });
  return buildMetadata({
    fullTitle: page.seoTitle || undefined,
    title: page.seoTitle ? undefined : page.title,
    description: page.seoDescription || (page.contentHtml ? stripHtml(page.contentHtml).slice(0, 160) : undefined),
    path: `/p/${slug}`,
  });
}

export default async function StaticPageView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getStaticPage(slug);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-3xl font-bold">{page.title}</h1>
      {page.contentHtml ? (
        <div className="richtext mt-6 text-text" dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
      ) : (
        <p className="mt-6 text-sm text-text-muted">This page has no content yet.</p>
      )}
    </div>
  );
}
