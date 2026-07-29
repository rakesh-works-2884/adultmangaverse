import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { BookText, Eye, Layers, MessageSquare, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  const [mangaCount, chapterCount, userCount, pendingCount, viewsAgg, latestComments, recentUsers] = await Promise.all([
    prisma.manga.count(),
    prisma.chapter.count(),
    prisma.user.count(),
    prisma.comment.count({ where: { status: "PENDING" } }),
    prisma.manga.aggregate({ _sum: { views: true } }),
    prisma.comment.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, body: true, createdAt: true, status: true, user: { select: { name: true } }, manga: { select: { title: true } } },
    }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, email: true, name: true, role: true, createdAt: true } }),
  ]);

  const stats = [
    { label: "Manga", value: mangaCount, icon: BookText, href: "/admin/manga" },
    { label: "Chapters", value: chapterCount, icon: Layers, href: "/admin/manga" },
    { label: "Users", value: userCount, icon: Users, href: "/admin/users" },
    { label: "Pending comments", value: pendingCount, icon: MessageSquare, href: "/admin/comments" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted"><Eye className="size-4" /> {(viewsAgg._sum.views ?? 0).toLocaleString()} total views across all titles</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">{label}</span>
              <Icon className="size-5 text-primary" strokeWidth={1.5} />
            </div>
            <p className="mt-2 font-heading text-3xl font-bold">{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Latest comments */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold">Latest comments</h2>
            <Link href="/admin/comments" className="text-xs text-highlight hover:underline">Moderate →</Link>
          </div>
          {latestComments.length === 0 ? (
            <p className="text-sm text-text-muted">No comments yet.</p>
          ) : (
            <ul className="space-y-3">
              {latestComments.map((c) => (
                <li key={c.id} className="text-sm">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="font-medium text-foreground">{c.user.name || "Reader"}</span>
                    <span>on {c.manga?.title ?? "—"}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${c.status === "PENDING" ? "bg-warning/15 text-warning" : c.status === "APPROVED" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>{c.status}</span>
                    <span className="ml-auto">{formatDistanceToNowStrict(new Date(c.createdAt), { addSuffix: true })}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-text-muted">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent users */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold">Recent sign-ups</h2>
            <Link href="/admin/users" className="text-xs text-highlight hover:underline">Manage →</Link>
          </div>
          <ul className="space-y-2.5">
            {recentUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between text-sm">
                <span className="min-w-0"><span className="font-medium">{u.name || "Reader"}</span> <span className="text-xs text-text-muted">{u.email}</span></span>
                <span className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="rounded bg-bg-soft px-1.5 py-0.5 font-medium">{u.role}</span>
                  {formatDistanceToNowStrict(new Date(u.createdAt), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
