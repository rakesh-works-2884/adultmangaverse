import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth-guards";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { ChapterManager, type ChapterRow } from "@/components/admin/ChapterManager";

export const dynamic = "force-dynamic";

export default async function MangaChaptersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await requireStaff())) redirect("/");
  const { id } = await params;
  const manga = await prisma.manga.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      chapters: {
        orderBy: { number: "desc" },
        include: { _count: { select: { pages: true } } },
      },
    },
  });

  if (!manga) notFound();

  const rows: ChapterRow[] = manga.chapters.map((c) => ({
    id: c.id,
    number: c.number.toString(),
    title: c.title,
    isPremium: c.isPremium,
    publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
    pagesCount: c._count.pages,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/manga" className="mb-2 inline-flex items-center gap-1 text-sm text-text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to manga
        </Link>
        <h1 className="font-heading text-2xl font-semibold">Chapters — {manga.title}</h1>
        <p className="mt-1 text-sm text-text-muted">{rows.length} chapter{rows.length === 1 ? "" : "s"}</p>
      </div>
      <ChapterManager mangaId={manga.id} mangaTitle={manga.title} chapters={rows} />
    </div>
  );
}
