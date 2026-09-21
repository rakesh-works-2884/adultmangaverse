import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { IntensityBadge } from "@/components/public/IntensityBadge";

export type MangaCardData = {
  slug: string;
  title: string;
  coverUrl: string | null;
  type: string;
  intensity: string;
  isPremium: boolean;
  rating: number;
};

export function MangaCard({ manga }: { manga: MangaCardData }) {
  return (
    <Link href={`/manga/${manga.slug}`} className="group block">
      <div className=" relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-surface shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06)] group-hover:border-primary/50">
        {manga.coverUrl ? (
          <Image
            src={manga.coverUrl}
            alt={`${manga.title} cover`}
            fill
            sizes="(max-width: 479px) 50vw, (max-width: 639px) 33vw, (max-width: 1023px) 25vw, (max-width: 1280px) 16vw, 200px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-text-muted">No cover</div>
        )}

        {/* Bottom gradient + rating + intensity */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent p-1.5">
          {manga.rating > 0 ? (
            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-white">
              <Star className="size-3 text-warning" fill="currentColor" /> {manga.rating.toFixed(1)}
            </span>
          ) : <span />}
          <IntensityBadge intensity={manga.intensity} className="scale-90 origin-bottom-right" />
        </div>
      </div>

      <h3 className="mt-3 line-clamp-2 font-heading text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-highlight">
        {manga.title}
      </h3>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-text-muted">{manga.type.toLowerCase()}</p>
    </Link>
  );
}

export function MangaCardSkeleton() {
  return (
    <div>
      <div className="aspect-[2/3] animate-pulse rounded-xl border border-border bg-surface" />
      <div className="mt-1.5 h-3 w-3/4 animate-pulse rounded bg-surface" />
    </div>
  );
}
