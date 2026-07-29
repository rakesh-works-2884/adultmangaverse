import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyIpnSignature } from "@/lib/nowpayments";

/**
 * NOWPayments IPN callback. Fires on every status transition of a payment
 * (waiting -> confirming -> confirmed -> finished, or -> failed/expired).
 * Only "finished" is treated as a real payment — everything else just
 * updates the tracking row so the account/admin side can show progress.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-nowpayments-sig");

  if (!verifyIpnSignature(rawBody, signature)) {
    console.warn("[NOWPAYMENTS] IPN signature verification failed.");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: { order_id?: string; payment_id?: string | number; payment_status?: string };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const { order_id: orderId, payment_id: paymentId, payment_status: status } = body;
  if (!orderId || !status) return new NextResponse("Missing fields", { status: 400 });

  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) {
    console.warn("[NOWPAYMENTS] IPN for unknown order_id:", orderId);
    return new NextResponse("Unknown order", { status: 404 });
  }

  // Payments can bounce through the same non-terminal status more than
  // once; only act once we transition INTO "finished" for the first time.
  const alreadyFinished = payment.status === "finished";

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status, invoiceId: payment.invoiceId ?? (paymentId ? String(paymentId) : undefined) },
  });

  if (status === "finished" && !alreadyFinished) {
    const user = await prisma.user.findUnique({ where: { id: payment.userId }, select: { tier: true, tierUntil: true } });
    if (user) {
      const base = user.tierUntil && user.tierUntil > new Date() ? user.tierUntil : new Date();
      const newUntil = new Date(base);
      newUntil.setMonth(newUntil.getMonth() + payment.months);

      // VIP outranks Premium — don't let a Premium renewal downgrade an
      // active VIP if somehow processed out of order.
      const tierRank = { FREE: 0, PREMIUM: 1, VIP: 2 } as const;
      const nextTier = tierRank[payment.tier as "PREMIUM" | "VIP"] >= tierRank[user.tier] ? payment.tier : user.tier;

      await prisma.user.update({
        where: { id: payment.userId },
        data: { tier: nextTier, tierUntil: newUntil },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
