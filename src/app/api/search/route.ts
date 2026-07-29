import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Instant-search endpoint. Returns a minimal DTO (no internal fields).
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const results = await prisma.manga.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { altTitles: { has: q } },
        { author: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { views: "desc" },
    take: 8,
    select: { slug: true, title: true, coverUrl: true, type: true },
  });

  return NextResponse.json({ results });
}
