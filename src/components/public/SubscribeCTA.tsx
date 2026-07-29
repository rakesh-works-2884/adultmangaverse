import Link from "next/link";
import { Crown } from "lucide-react";

export function SubscribeCTA() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-6 text-center sm:p-10">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative mx-auto max-w-2xl">
        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-primary/20 text-primary">
          <Crown className="size-6" strokeWidth={1.5} />
        </span>
        <h2 className="font-heading text-2xl font-bold sm:text-3xl">Upgrade Your Experience</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted sm:text-base">
          Every title is free. Go Premium for ad-free &amp; offline reading, early access, and higher-resolution pages.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/subscribe" className="btn-3d inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:scale-[0.97]">
            View Premium Plans
          </Link>
          <Link href="/browse" className="btn-3d-outline inline-flex h-11 items-center rounded-lg border border-primary/40 px-5 font-ui text-sm font-semibold text-primary hover:bg-primary/10">
            Browse Free Content
          </Link>
        </div>
      </div>
    </section>
  );
}
