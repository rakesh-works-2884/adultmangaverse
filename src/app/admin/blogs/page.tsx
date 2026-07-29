import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { BlogRowActions } from "@/components/admin/BlogRowActions";
import { btnPrimary } from "@/components/admin/styles";

export const dynamic = "force-dynamic";

export default async function AdminBlogsPage() {
  const posts = await prisma.blog.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true, published: true, publishedAt: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Blog</h1>
          <p className="mt-1 text-sm text-text-muted">Posts shown under /blog…</p>
        </div>
        <Link href="/admin/blogs/new" className={btnPrimary}><Plus className="size-4" /> New post</Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-soft text-left text-text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">URL</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-text-muted">No posts yet.</td></tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id} className="border-t border-border odd:bg-surface/40">
                  <td className="px-4 py-2.5 font-medium">{p.title}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/blog/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-text-muted hover:text-highlight">/blog/{p.slug} <ExternalLink className="size-3" /></Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.published ? "bg-success/15 text-success" : "bg-surface text-text-muted"}`}>
                      {p.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <BlogRowActions id={p.id} title={p.title} published={p.published} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
