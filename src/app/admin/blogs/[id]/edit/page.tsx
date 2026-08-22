import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { BlogForm, type BlogFormInitial } from "@/components/admin/BlogForm";

export const dynamic = "force-dynamic";

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.blog.findUnique({ where: { id } });
  if (!post) notFound();

  const initial: BlogFormInitial = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    contentHtml: post.contentHtml,
    author: post.author,
    published: post.published,
    coverImage: post.coverImage,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    focusKeyword: post.focusKeyword,
    canonicalUrl: post.canonicalUrl,
    noindex: post.noindex,
    nofollow: post.nofollow,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/blogs" className="mb-2 inline-flex items-center gap-1 text-sm text-text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to blog
        </Link>
        <h1 className="font-heading text-2xl font-semibold">Edit: {post.title}</h1>
      </div>
      <BlogForm mode="edit" initial={initial} />
    </div>
  );
}
