import Link from "next/link";
import { Check, ChevronDown, Crown, X } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { SubscribeButton } from "@/components/public/SubscribeButton";
import { buildMetadata } from "@/lib/seo";
import { TIER_MONTHLY_USD } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildMetadata({
    title: "Subscribe — Premium & VIP Plans",
    description: "Every title on Adult Manga Verse is free to read. Go Premium or VIP for ad-free reading, offline reading, early access to new chapters, and higher-resolution pages.",
    path: "/subscribe",
  });
}

type TierKey = "FREE" | "PREMIUM" | "VIP";

const TIERS: {
  key: TierKey;
  name: string;
  price: string;
  period: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
}[] = [
  { key: "FREE", name: "Free", price: "$0", period: "forever", features: ["Read every title, free", "Community reviews & comments", "Standard-resolution pages", "Supported by ads"] },
  { key: "PREMIUM", name: "Premium", price: `$${TIER_MONTHLY_USD.PREMIUM.toFixed(2)}`, period: "/month", badge: "Most Popular", highlight: true, features: ["Everything in Free", "Ad-free reading", "Offline reading — up to 50 titles (on-site, no download)", "Early access to new chapters", "HD (1080p) pages", "Priority support"] },
  { key: "VIP", name: "VIP", price: `$${TIER_MONTHLY_USD.VIP.toFixed(2)}`, period: "/month", features: ["Everything in Premium", "Unlimited offline reading (on-site, no download)", "Earliest access to new chapters", "Ultra-HD (4K) pages", "24/7 priority support", "Beta features"] },
];

const COMPARE: { label: string; free: boolean | string; premium: boolean | string; vip: boolean | string }[] = [
  { label: "Full library — every title", free: true, premium: true, vip: true },
  { label: "Reviews & comments", free: true, premium: true, vip: true },
  { label: "Ad-free reading", free: false, premium: true, vip: true },
  { label: "Offline reading (on-site, no download)", free: false, premium: "Up to 50", vip: "Unlimited" },
  { label: "Early access to new chapters", free: false, premium: "Early", vip: "Earliest" },
  { label: "Page quality", free: "720p", premium: "1080p", vip: "4K" },
  { label: "Priority support", free: false, premium: true, vip: "24/7" },
  { label: "Beta features", free: false, premium: false, vip: true },
];

const FAQ = [
  { q: "Do paid plans unlock exclusive manga?", a: "No — every title on the site is free to read for everyone. Paid plans don't lock any content; they remove ads and add convenience perks like offline reading, early access to new chapters, and higher-resolution pages." },
  { q: "What does “offline reading” mean?", a: "With Premium or VIP you can keep reading on our site even without an internet connection — pages are cached in your browser. Premium can keep up to 50 titles available offline; VIP is unlimited. It is not a download: files are never saved to your device and can't be shared or opened outside our reader." },
  { q: "What is early access?", a: "Premium and VIP members can read newly released chapters ahead of free readers. VIP members get the earliest access." },
  { q: "Can I cancel anytime?", a: "Yes. Plans are month-to-month and you can cancel whenever you like — you keep your perks until the end of the billing period." },
  { q: "What payment methods are accepted?", a: "Crypto, via NOWPayments — pick a duration (1, 3, or 12 months) and pay with any supported coin. Access activates automatically once the payment confirms on-chain, which usually takes a few minutes." },
  { q: "Do you offer refunds?", a: "If something goes wrong, contact support within 7 days of a charge and we'll make it right." },
];

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <Check className="mx-auto size-4 text-success" strokeWidth={2.5} />;
  if (v === false) return <X className="mx-auto size-4 text-text-muted/50" strokeWidth={2} />;
  return <span className="text-xs font-medium">{v}</span>;
}

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const session = await auth();
  const { payment } = await searchParams;
  let currentTier: string | null = null;
  if (session) {
    const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { tier: true } });
    currentTier = u?.tier ?? null;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {payment === "success" ? (
        <div className="mb-6 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-center text-sm text-success">
          Payment submitted. Crypto confirmations can take a few minutes — your plan updates automatically as soon as it&apos;s confirmed, no need to refresh and wait here.
        </div>
      ) : payment === "cancelled" ? (
        <div className="mb-6 rounded-xl border border-border bg-bg-soft px-4 py-3 text-center text-sm text-text-muted">
          Checkout was cancelled — no charge was made. You can try again anytime.
        </div>
      ) : null}
      <div className="text-center">
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">Choose Your Plan</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-text-muted sm:text-base">
          <strong className="text-foreground">Every title is free to read for everyone.</strong> Plans add
          ad-free reading, offline reading, early access, and higher-resolution pages — never locked content.
          {currentTier ? <> You&apos;re currently on the <span className="font-semibold text-primary">{currentTier}</span> plan.</> : null}
        </p>
      </div>

      {/* Tier cards */}
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {TIERS.map((t) => (
          <div key={t.key} className={cn("relative flex flex-col rounded-2xl border bg-surface p-6", t.highlight ? "border-primary shadow-[0_0_28px_rgb(225_29_46/0.2)] lg:scale-[1.03]" : "border-border")}>
            {t.badge ? <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{t.badge}</span> : null}
            <div className="flex items-center gap-2">
              {t.key === "VIP" ? <Crown className="size-5 text-warning" /> : null}
              <h2 className="font-heading text-xl font-bold">{t.name}</h2>
            </div>
            <div className="mt-2 flex items-end gap-1">
              <span className="font-heading text-4xl font-bold">{t.price}</span>
              <span className="mb-1 text-sm text-text-muted">{t.period}</span>
            </div>
            <ul className="mt-5 flex-1 space-y-2.5">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.5} /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <SubscribeButton tierKey={t.key} tierName={t.name} currentTier={currentTier} isLoggedIn={!!session} highlight={t.highlight} />
            </div>
          </div>
        ))}
      </div>

      {/* Comparison */}
      <div className="mt-12">
        <h2 className="mb-4 text-center font-heading text-xl font-semibold">Compare plans</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-bg-soft">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Feature</th>
                <th className="px-4 py-3 text-center font-medium">Free</th>
                <th className="px-4 py-3 text-center font-medium text-primary">Premium</th>
                <th className="px-4 py-3 text-center font-medium">VIP</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row.label} className="border-t border-border odd:bg-surface/40">
                  <td className="px-4 py-2.5 text-text-muted">{row.label}</td>
                  <td className="px-4 py-2.5 text-center"><Cell v={row.free} /></td>
                  <td className="px-4 py-2.5 text-center"><Cell v={row.premium} /></td>
                  <td className="px-4 py-2.5 text-center"><Cell v={row.vip} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="mb-4 text-center font-heading text-xl font-semibold">Frequently asked questions</h2>
        <div className="mx-auto max-w-2xl divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {FAQ.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium transition-colors hover:bg-surface-hover">
                {item.q}
                <ChevronDown className="size-4 shrink-0 text-text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-5 pb-4 text-sm text-text-muted">{item.a}</div>
            </details>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 text-center">
        <Link href="/browse" className="btn-3d-outline inline-flex h-11 items-center rounded-lg border border-primary/40 px-6 font-ui text-sm font-semibold text-primary hover:bg-primary/10">
          Browse Free Content
        </Link>
      </div>
    </div>
  );
}
