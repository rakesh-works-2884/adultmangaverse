import Link from "next/link";
import { Flame, Clock, Sparkles, Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { cardSelect, publishedWhere } from "@/lib/catalog";
import { stripHtml } from "@/lib/utils";
import { SectionHeading } from "@/components/public/SectionHeading";
import { MangaCard, type MangaCardData } from "@/components/public/MangaCard";
import { HeroSlider, type HeroSlide } from "@/components/public/HeroSlider";
import { SubscribeCTA } from "@/components/public/SubscribeCTA";
import { RevealOnScroll } from "@/components/public/RevealOnScroll";
import { buildMetadata, websiteJsonLd } from "@/lib/seo";
import { StructuredData } from "@/components/seo/StructuredData";

// No session/cookie reads here — safe to serve a cached copy and regenerate
// it in the background instead of hitting the DB on every single request.
export const revalidate = 60;

export async function generateMetadata() {
  return buildMetadata({ path: "/" });
}

const CATEGORY_TILES = [
  { label: "Most Explicit", icon: Flame, href: "/browse?intensity=EXTREME", accent: "text-intensity-extreme" },
  { label: "Trending", icon: Sparkles, href: "/browse?sort=popular", accent: "text-highlight" },
  { label: "Top Rated", icon: Star, href: "/browse?sort=rating", accent: "text-warning" },
  { label: "New Releases", icon: Clock, href: "/browse?sort=new", accent: "text-success" },
];

function Grid({ items }: { items: MangaCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 min-[480px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((m) => <MangaCard key={m.slug} manga={m} />)}
    </div>
  );
}

export default async function HomePage() {
  const now = new Date();
  const [featured, trending, newSeries, recentChapters] = await Promise.all([
    prisma.manga.findMany({
      where: { ...publishedWhere, featured: true },
      orderBy: { featuredAt: "desc" },
      take: 3,
      select: { ...cardSelect, synopsis: true, heroImageDesktop: true, heroImageMobile: true },
    }),
    prisma.manga.findMany({ where: publishedWhere, orderBy: { views: "desc" }, take: 12, select: cardSelect }),
    prisma.manga.findMany({ where: publishedWhere, orderBy: { createdAt: "desc" }, take: 12, select: cardSelect }),
    prisma.chapter.findMany({
      where: { publishedAt: { not: null, lte: now }, manga: { published: true } },
      orderBy: { publishedAt: "desc" },
      take: 40,
      select: { manga: { select: cardSelect } },
    }),
  ]);

  // Dedupe "Just Updated" by manga.
  const seen = new Set<string>();
  const justUpdated: MangaCardData[] = [];
  for (const c of recentChapters) {
    if (!seen.has(c.manga.slug)) {
      seen.add(c.manga.slug);
      justUpdated.push(c.manga);
    }
    if (justUpdated.length >= 12) break;
  }

  const slides: HeroSlide[] = featured.map((m) => ({
    slug: m.slug,
    title: m.title,
    coverUrl: m.coverUrl,
    heroImageDesktop: m.heroImageDesktop,
    heroImageMobile: m.heroImageMobile,
    intensity: m.intensity,
    isPremium: m.isPremium,
    blurb: m.synopsis ? stripHtml(m.synopsis) : "",
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6">
      <StructuredData data={websiteJsonLd()} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-highlight">The reading room</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find your next obsession.</h1><p className="mt-3 text-sm text-text-muted">Discover manga, manhwa, and manhua. Save your favorites. Read at your pace.</p></div>
        <Link href="/browse" className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-medium hover:border-primary">Explore the library →</Link>
      </div>
      {slides.length > 0 ? <HeroSlider slides={slides} /> : null}

      {/* Category tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {CATEGORY_TILES.map(({ label, icon: Icon, href, accent }, i) => (
          <RevealOnScroll key={href} delayMs={i * 60}>
            <Link href={href} className="tilt-card flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-primary/50 hover:bg-surface-hover">
              <Icon className={`size-6 ${accent}`} strokeWidth={1.5} />
              <span className="font-heading text-sm font-semibold">{label}</span>
            </Link>
          </RevealOnScroll>
        ))}
      </div>

      {trending.length > 0 ? (
        <RevealOnScroll>
          <section>
            <SectionHeading title="Trending This Week" href="/browse?sort=popular" />
            <Grid items={trending} />
          </section>
        </RevealOnScroll>
      ) : null}

      {justUpdated.length > 0 ? (
        <RevealOnScroll>
          <section>
            <SectionHeading title="Just Updated" href="/browse" />
            <Grid items={justUpdated} />
          </section>
        </RevealOnScroll>
      ) : null}

      <RevealOnScroll><SubscribeCTA /></RevealOnScroll>

      {newSeries.length > 0 ? (
        <RevealOnScroll>
          <section>
            <SectionHeading title="New Series" href="/browse?sort=new" />
            <Grid items={newSeries} />
          </section>
        </RevealOnScroll>
      ) : null}

      {trending.length === 0 && newSeries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-bg-soft px-5 py-12 text-center text-sm text-text-muted">
          New stories are on their way. Check back soon to find your next read.
        </div>
      ) : null}
    </div>
  );
}
