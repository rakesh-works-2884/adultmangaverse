import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma, CommentStatus } from "@/generated/prisma/client";
import { CommentModeration, type AdminComment } from "@/components/admin/CommentModeration";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "SPAM", label: "Spam" },
  { key: "ALL", label: "All" },
] as const;

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = TABS.some((t) => t.key === status) ? status! : "PENDING";
  const where: Prisma.CommentWhereInput = active === "ALL" ? {} : { status: active as CommentStatus };

  const [comments, pendingCount] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, body: true, createdAt: true, status: true,
        user: { select: { name: true, email: true } },
        manga: { select: { title: true, slug: true } },
      },
    }),
    prisma.comment.count({ where: { status: "PENDING" } }),
  ]);

  const rows: AdminComment[] = comments.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    status: c.status,
    userName: c.user.name,
    userEmail: c.user.email,
    mangaTitle: c.manga?.title ?? null,
    mangaSlug: c.manga?.slug ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Comments</h1>
        <p className="mt-1 text-sm text-text-muted">{pendingCount} awaiting moderation</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/comments?status=${t.key}`} className={cn("border-b-2 px-3 py-2 text-sm font-medium transition-colors", active === t.key ? "border-primary text-foreground" : "border-transparent text-text-muted hover:text-foreground")}>
            {t.label}{t.key === "PENDING" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </Link>
        ))}
      </div>

      <CommentModeration comments={rows} />
    </div>
  );
}
