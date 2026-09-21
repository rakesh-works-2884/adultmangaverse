import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { GenreManager, type GenreRow } from "@/components/admin/GenreManager";

export const dynamic = "force-dynamic";

export default async function AdminGenresPage() {
  if (!(await requireAdmin())) redirect("/");
  const genres = await prisma.genre.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { manga: true } } },
  });

  const rows: GenreRow[] = genres.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    count: g._count.manga,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Genres</h1>
        <p className="mt-1 text-sm text-text-muted">
          Create, rename, and delete genres. Slugs are generated automatically.
        </p>
      </div>
      <GenreManager genres={rows} />
    </div>
  );
}
