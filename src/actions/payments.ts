"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { siteConfig } from "@/lib/site";
import { createInvoice } from "@/lib/nowpayments";
import { priceFor, PAYMENT_DURATIONS, type PaymentDuration } from "@/lib/pricing";
import type { ActionResult } from "@/lib/actions";

export async function createCryptoPayment(tier: "PREMIUM" | "VIP", months: number): Promise<ActionResult<{ invoiceUrl: string }>> {
  const session = await auth();
  if (!session) return { ok: false, error: "Please sign in first." };
  if (!PAYMENT_DURATIONS.includes(months as PaymentDuration)) return { ok: false, error: "Invalid duration." };

  const amountUsd = priceFor(tier, months);

  try {
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        orderId: `amv_${session.user.id}_${Date.now()}`,
        tier,
        months,
        amountUsd,
        status: "waiting",
      },
    });

    const invoice = await createInvoice({
      priceAmount: amountUsd,
      orderId: payment.orderId,
      orderDescription: `${siteConfig.name} — ${tier} (${months} month${months > 1 ? "s" : ""})`,
      ipnCallbackUrl: `${siteConfig.url}/api/webhooks/nowpayments`,
      successUrl: `${siteConfig.url}/subscribe?payment=success`,
      cancelUrl: `${siteConfig.url}/subscribe?payment=cancelled`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { invoiceId: invoice.id, invoiceUrl: invoice.invoiceUrl },
    });

    return { ok: true, data: { invoiceUrl: invoice.invoiceUrl } };
  } catch (e) {
    // Any authenticated user can hit this — never echo the raw exception
    // back (could be a DB/provider internal detail); full detail is logged
    // server-side above for debugging.
    console.error("[PAYMENT] create failed:", e);
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
}
