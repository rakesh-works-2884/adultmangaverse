import Link from "next/link";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { DeletePageButton } from "@/components/admin/DeletePageButton";
import { btnPrimary, btnGhost } from "@/components/admin/styles";

export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
  const pages = await prisma.staticPage.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true, slug: true, updatedAt: true } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Static Pages</h1>
          <p className="mt-1 text-sm text-text-muted">About, legal, and info pages shown under /p/…</p>
        </div>
        <Link href="/admin/pages/new" className={btnPrimary}><Plus className="size-4" /> New page</Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-soft text-left text-text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">URL</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-text-muted">No pages yet.</td></tr>
            ) : (
              pages.map((p) => (
                <tr key={p.id} className="border-t border-border odd:bg-surface/40">
                  <td className="px-4 py-2.5 font-medium">{p.title}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/p/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-text-muted hover:text-highlight">/p/{p.slug} <ExternalLink className="size-3" /></Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/pages/${p.id}/edit`} className={btnGhost} title="Edit"><Pencil className="size-4" /></Link>
                      <DeletePageButton id={p.id} title={p.title} />
                    </div>
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
