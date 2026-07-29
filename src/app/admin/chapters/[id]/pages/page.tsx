import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageUploader } from "@/components/admin/PageUploader";
import type { UploadedPage } from "@/actions/pages";
import { signPages } from "@/lib/image-urls";

export const dynamic = "force-dynamic";

export default async function ChapterPagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chapter = await prisma.chapter.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      title: true,
      manga: { select: { id: true, title: true } },
      pages: { orderBy: { index: "asc" }, select: { id: true, index: true, imageUrl: true, width: true, height: true } },
    },
  });

  if (!chapter) notFound();

  const pages: UploadedPage[] = await signPages(chapter.pages);
  const chapterNumber = chapter.number.toString();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/manga/${chapter.manga.id}/chapters`} className="mb-2 inline-flex items-center gap-1 text-sm text-text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to chapters
        </Link>
        <h1 className="font-heading text-2xl font-semibold">
          {chapter.manga.title} — Chapter {chapterNumber}
          {chapter.title ? <span className="text-text-muted"> · {chapter.title}</span> : null}
        </h1>
        <p className="mt-1 text-sm text-text-muted">Upload, reorder, and delete pages.</p>
      </div>
      <PageUploader chapterId={chapter.id} initialPages={pages} mangaTitle={chapter.manga.title} chapterNumber={chapterNumber} />
    </div>
  );
}
