import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = String(body.url || "").trim();

    if (!url || url.startsWith("/admin") || url.startsWith("/api")) {
      return NextResponse.json({ ok: true });
    }

    const referrer = req.headers.get("referer") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    await prisma.seo404Log.upsert({
      where: { url },
      create: { url, referrer, userAgent, hits: 1 },
      update: { hits: { increment: 1 }, referrer, userAgent },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
