import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const API_BASE = "https://api.nowpayments.io/v1";

function apiKey(): string {
  const key = process.env.NOWPAYMENTS_API_KEY;
  if (!key) throw new Error("[NOWPAYMENTS] NOWPAYMENTS_API_KEY is not set.");
  return key;
}

function ipnSecret(): string {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) throw new Error("[NOWPAYMENTS] NOWPAYMENTS_IPN_SECRET is not set.");
  return secret;
}

export type CreateInvoiceInput = {
  priceAmount: number;
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl: string;
  successUrl: string;
  cancelUrl: string;
};

export type CreateInvoiceResult = { id: string; invoiceUrl: string };

/** Creates a NOWPayments hosted checkout page and returns its URL. */
export async function createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  const res = await fetch(`${API_BASE}/invoice`, {
    method: "POST",
    headers: { "x-api-key": apiKey(), "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: input.priceAmount,
      price_currency: "usd",
      order_id: input.orderId,
      order_description: input.orderDescription,
      ipn_callback_url: input.ipnCallbackUrl,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.invoice_url) {
    console.error("[NOWPAYMENTS] create invoice failed:", res.status, body);
    throw new Error(body?.message || "Could not create invoice.");
  }
  return { id: String(body.id), invoiceUrl: body.invoice_url };
}

/** Recursively sorts object keys — NOWPayments signs the IPN body this way before hashing. */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/** Verifies the `x-nowpayments-sig` header against the raw IPN request body. */
export function verifyIpnSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return false;
  }
  const sortedJson = JSON.stringify(sortKeysDeep(parsed));
  const expected = createHmac("sha512", ipnSecret()).update(sortedJson).digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
