import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { MangaForm } from "@/components/admin/MangaForm";

export const dynamic = "force-dynamic";

export default async function NewMangaPage() {
  if (!(await requireAdmin())) redirect("/");
  const genres = await prisma.genre.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/manga" className="mb-2 inline-flex items-center gap-1 text-sm text-text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to list
        </Link>
        <h1 className="font-heading text-2xl font-semibold">New manga</h1>
      </div>
      <MangaForm mode="create" genres={genres} />
    </div>
  );
}
