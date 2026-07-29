import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Star } from "lucide-react";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { MangaRowActions } from "@/components/admin/MangaRowActions";
import { IntensityBadge } from "@/components/public/IntensityBadge";
import { adminInput, btnPrimary, btnSecondary } from "@/components/admin/styles";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const typeBadge: Record<string, string> = {
  MANGA: "text-primary",
  MANHWA: "text-purple-400",
  MANHUA: "text-teal-400",
};
const statusBadge: Record<string, string> = {
  ONGOING: "text-highlight",
  COMPLETED: "text-success",
  HIATUS: "text-warning",
};

export default async function AdminMangaListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const query = (q ?? "").trim();
  const currentPage = Math.max(1, Number(page) || 1);

  const where: Prisma.MangaWhereInput = query
    ? {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { author: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, manga] = await Promise.all([
    prisma.manga.count({ where }),
    prisma.manga.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { chapters: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) =>
    `/admin/manga?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(p) })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Manga</h1>
          <p className="mt-1 text-sm text-text-muted">{total} title{total === 1 ? "" : "s"} total</p>
        </div>
        <Link href="/admin/manga/new" className={btnPrimary}>
          <Plus className="size-4" /> New manga
        </Link>
      </div>

      <form className="flex gap-2" action="/admin/manga">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by title or author…"
            className={`${adminInput} pl-9`}
          />
        </div>
        <button type="submit" className={btnSecondary}>Search</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-bg-soft text-left text-text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Intensity</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Chapters</th>
              <th className="px-4 py-2.5 font-medium">State</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {manga.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                  {query ? "No manga match your search." : "No manga yet. Create your first."}
                </td>
              </tr>
            ) : (
              manga.map((m) => (
                <tr key={m.id} className="border-t border-border odd:bg-surface/40">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded border border-border bg-bg-soft">
                        {m.coverUrl ? (
                          <Image src={m.coverUrl} alt={`${m.title} cover`} fill sizes="40px" className="object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="truncate">{m.title}</span>
                          {m.featured ? <Star className="size-3.5 shrink-0 text-warning" fill="currentColor" /> : null}
                        </div>
                        <div className="truncate text-xs text-text-muted">/{m.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-2.5 font-medium ${typeBadge[m.type]}`}>{m.type}</td>
                  <td className="px-4 py-2.5"><IntensityBadge intensity={m.intensity} /></td>
                  <td className={`px-4 py-2.5 font-medium ${statusBadge[m.status]}`}>{m.status}</td>
                  <td className="px-4 py-2.5 text-text-muted">{m._count.chapters}</td>
                  <td className="px-4 py-2.5">
                    {m.published ? (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                        Published
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-text-muted">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <MangaRowActions id={m.id} title={m.title} published={m.published} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 ? (
              <Link href={pageHref(currentPage - 1)} className={btnSecondary}>Previous</Link>
            ) : null}
            {currentPage < totalPages ? (
              <Link href={pageHref(currentPage + 1)} className={btnSecondary}>Next</Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
