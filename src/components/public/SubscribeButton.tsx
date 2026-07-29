"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createCryptoPayment } from "@/actions/payments";
import { PAYMENT_DURATIONS, priceFor } from "@/lib/pricing";

export function SubscribeButton({
  tierKey,
  tierName,
  currentTier,
  isLoggedIn,
  highlight,
}: {
  tierKey: "FREE" | "PREMIUM" | "VIP";
  tierName: string;
  currentTier: string | null;
  isLoggedIn: boolean;
  highlight?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const base = "inline-flex h-11 w-full items-center justify-center rounded-lg px-5 font-ui text-sm font-semibold transition-all active:scale-[0.97]";
  const primary = cn(base, "btn-3d bg-primary text-primary-foreground hover:bg-primary-hover");
  const secondary = cn(base, "btn-3d-outline border border-primary/40 text-primary hover:bg-primary/10");

  if (!isLoggedIn) {
    return (
      <Link href="/login?callbackUrl=/subscribe" className={highlight ? primary : secondary}>
        {tierKey === "FREE" ? "Get started" : `Choose ${tierName}`}
      </Link>
    );
  }

  const active = cn(
    base,
    "cursor-default border border-success/30 bg-surface text-text-muted shadow-[inset_0_1px_0_0_rgb(255_255_255/0.08),0_0_0_1px_rgb(34_197_94/0.2),0_4px_16px_-4px_rgb(34_197_94/0.3)]",
  );

  if (currentTier === tierKey) {
    return <button type="button" disabled className={active}>Current plan</button>;
  }

  if (tierKey === "FREE") {
    return <button type="button" disabled className={active}>Included</button>;
  }

  function choose(months: number) {
    setError(null);
    startTransition(async () => {
      const res = await createCryptoPayment(tierKey as "PREMIUM" | "VIP", months);
      if (!res.ok || !res.data) {
        setError(res.ok ? "Could not start checkout." : res.error);
        return;
      }
      window.location.href = res.data.invoiceUrl;
    });
  }

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} className={highlight ? primary : secondary}>
        Choose {tierName}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-center text-xs text-text-muted">Pay with crypto — choose a duration</p>
      <div className="grid grid-cols-3 gap-2">
        {PAYMENT_DURATIONS.map((months) => (
          <button
            key={months}
            type="button"
            onClick={() => choose(months)}
            disabled={pending}
            className="flex flex-col items-center rounded-lg border border-border bg-surface px-2 py-2 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-surface-hover disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <>
              <span>{months} mo</span>
              <span className="text-text-muted">${priceFor(tierKey as "PREMIUM" | "VIP", months).toFixed(2)}</span>
            </>}
          </button>
        ))}
      </div>
      {error ? <p className="text-center text-xs text-danger">{error}</p> : null}
    </div>
  );
}
