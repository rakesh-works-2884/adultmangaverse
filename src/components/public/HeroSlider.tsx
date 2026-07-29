"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { IntensityBadge } from "@/components/public/IntensityBadge";

export type HeroSlide = {
  slug: string;
  title: string;
  coverUrl: string | null;
  heroImageDesktop: string | null;
  heroImageMobile: string | null;
  blurb: string;
  intensity: string;
  isPremium: boolean;
};

const MOBILE_QUERY = "(max-width: 639px)";

// SSR-safe viewport read (matches this codebase's existing pattern for
// browser-only state — see AgeGate/ContinueReadingButton) so we render a
// single <Image>, not both desktop+mobile posters, avoiding a double fetch.
function useIsMobile(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(MOBILE_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const isMobile = useIsMobile();

  useEffect(() => {
    if (count <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count]);

  if (count === 0) return null;
  const active = slides[index];
  // Manual poster (if the admin uploaded one for this device) wins over the
  // regular cover — that's the whole point of setting one.
  const heroImage = (isMobile ? active.heroImageMobile : active.heroImageDesktop) || active.coverUrl;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-bg-soft">
      {/* Full-bleed hero image — fills the whole carousel, no separate poster thumbnail. */}
      {heroImage ? (
        <Image key={heroImage} src={heroImage} alt={active.title} fill sizes="100vw" className="object-cover" priority />
      ) : null}
      {/* Red glow accents */}
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-28 size-80 rounded-full bg-primary/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 right-8 size-96 rounded-full bg-primary/15 blur-3xl" />
      {/* Fade the bottom (and a touch of the left) so overlaid text stays legible over any image. */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-transparent" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/70 via-transparent to-transparent" aria-hidden />

      <div className="relative flex min-h-[380px] flex-col justify-end gap-3 p-6 sm:min-h-[460px] sm:p-10 lg:min-h-[520px]">
        <div className="flex flex-wrap items-center gap-2">
          <IntensityBadge intensity={active.intensity} />
        </div>
        <h1 className="max-w-2xl font-heading text-2xl font-bold leading-tight sm:text-4xl">{active.title}</h1>
        {active.blurb ? (
          <p className="line-clamp-3 max-w-xl text-sm text-text-muted sm:text-base">{active.blurb}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href={`/manga/${active.slug}`} className="btn-3d inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:scale-[0.97]">
            <BookOpen className="size-4" strokeWidth={2} /> Begin Reading
          </Link>
          <Link href="/browse" className="btn-3d-outline inline-flex h-11 items-center rounded-lg border border-primary/40 px-5 font-ui text-sm font-semibold text-primary hover:bg-primary/10">
            Browse all
          </Link>
        </div>

        {count > 1 ? (
          <div className="mt-2 flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.slug}
                type="button"
                aria-label={`Show ${s.title}`}
                onClick={() => setIndex(i)}
                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-primary" : "w-1.5 bg-white/30 hover:bg-white/50")}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
