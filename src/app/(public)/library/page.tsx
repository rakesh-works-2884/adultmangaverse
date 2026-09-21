import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowUpRight, BookOpen, Heart, WifiOff } from "lucide-react";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { cardSelect } from "@/lib/catalog";
import { MangaCard } from "@/components/public/MangaCard";
import { getOfflineUsage } from "@/actions/offline";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Library", robots: { index: false } };

export default async function LibraryPage() {
  const session = await requireUser();
  if (!session) redirect("/login?callbackUrl=/library");

  const [bookmarks, progress, offlineUsage] = await Promise.all([
    prisma.bookmark.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { manga: { select: cardSelect } },
    }),
    prisma.readProgress.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 18,
      select: { chapter: { select: { number: true } }, manga: { select: { slug: true, title: true, coverUrl: true } } },
    }),
    getOfflineUsage(),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">My Library</h1>

      {/* Offline library */}
      <section>
        <Link href="/offline" className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/50 hover:bg-surface-hover">
          <span className="flex items-center gap-3">
            <WifiOff className="size-5 text-primary" />
            <span>
              <span className="block font-heading text-sm font-semibold">Offline Library</span>
              <span className="block text-xs text-text-muted">
                {offlineUsage
                  ? offlineUsage.limit === null
                    ? `${offlineUsage.used} title${offlineUsage.used === 1 ? "" : "s"} saved · unlimited on VIP`
                    : offlineUsage.allowed
                      ? `${offlineUsage.used}/${offlineUsage.limit} titles saved`
                      : "Premium/VIP perk — read on-site without internet"
                  : "Read saved titles without an internet connection"}
              </span>
            </span>
          </span>
          <ArrowUpRight className="size-4 text-text-muted" />
        </Link>
      </section>

      {/* Continue Reading */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold">
          <BookOpen className="size-5 text-primary" /> Continue Reading
        </h2>
        {progress.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-bg-soft px-5 py-10 text-center text-sm text-text-muted">
            Nothing in progress yet. <Link href="/browse" className="text-highlight hover:underline">Start reading →</Link>
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {progress.map((p) => (
              <Link key={p.manga.slug} href={`/manga/${p.manga.slug}/${p.chapter.number.toString()}`} className="group block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-surface transition-all group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgb(225_29_46/0.2)]">
                  {p.manga.coverUrl ? <Image src={p.manga.coverUrl} alt={`${p.manga.title} cover`} fill sizes="16vw" className="object-cover" /> : null}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-1.5 text-[11px] font-semibold text-white">Ch. {p.chapter.number.toString()}</span>
                </div>
                <h3 className="mt-1.5 line-clamp-2 font-heading text-sm font-semibold group-hover:text-highlight">{p.manga.title}</h3>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Bookmarks */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold">
          <Heart className="size-5 text-primary" /> Bookmarks
        </h2>
        {bookmarks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-bg-soft px-5 py-10 text-center text-sm text-text-muted">
            No bookmarks yet. Tap “Add to Library” on any title.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {bookmarks.map((b) => <MangaCard key={b.manga.slug} manga={b.manga} />)}
          </div>
        )}
      </section>
    </div>
  );
}
