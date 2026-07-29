import { cache } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { buildMetadata, articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { StructuredData } from "@/components/seo/StructuredData";
import { stripHtml } from "@/lib/utils";

// No session dependency — cache and revalidate instead of full-dynamic.
export const revalidate = 120;
export async function generateStaticParams() {
  return [];
}

const getBlogPost = cache((slug: string) =>
  prisma.blog.findFirst({ where: { slug, published: true, publishedAt: { not: null, lte: new Date() } } }),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return buildMetadata({ title: "Not found", path: `/blog/${slug}`, noindex: true });
  return buildMetadata({
    fullTitle: post.seoTitle || undefined,
    title: post.seoTitle ? undefined : post.title,
    description: post.seoDescription || (post.excerpt ?? stripHtml(post.contentHtml).slice(0, 160)),
    path: `/blog/${slug}`,
    image: post.coverImage,
    ogType: "article",
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <StructuredData
        data={[
          articleJsonLd({
            title: post.title,
            slug: post.slug,
            description: post.excerpt,
            coverImage: post.coverImage,
            author: post.author,
            publishedAt: post.publishedAt?.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
          }),
          breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }, { name: post.title, path: `/blog/${post.slug}` }]),
        ]}
      />

      <Link href="/blog" className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to blog
      </Link>

      <h1 className="font-heading text-2xl font-bold sm:text-4xl">{post.title}</h1>
      <div className="mt-2 flex items-center gap-2 text-sm text-text-muted">
        {post.author ? <span>{post.author}</span> : null}
        {post.author && post.publishedAt ? <span>·</span> : null}
        {post.publishedAt ? <span>{format(post.publishedAt, "MMMM d, yyyy")}</span> : null}
      </div>

      {post.coverImage ? (
        <div className="glow-ring relative mt-6 aspect-[1200/630] w-full overflow-hidden rounded-xl">
          <Image src={post.coverImage} alt={post.title} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" priority />
        </div>
      ) : null}

      {post.contentHtml ? (
        <div className="richtext mt-8 text-text" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
      ) : (
        <p className="mt-8 text-sm text-text-muted">This post has no content yet.</p>
      )}
    </div>
  );
}
