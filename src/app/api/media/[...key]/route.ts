import { storage } from "@/lib/storage";
import { isPublicMediaKey } from "@/lib/public-media";

/** Public artwork from a private bucket. Signed URLs stay on the server. */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!isPublicMediaKey(key)) return new Response("Not found", { status: 404 });
  try {
    const url = await storage.getSignedUrl(key, 60);
    // This endpoint is for R2 artwork only; local uploads use /uploads directly.
    if (!url.startsWith("https://")) return new Response("Not found", { status: 404 });
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return new Response("Image unavailable", { status: 404 });
    return new Response(response.body, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Image temporarily unavailable", { status: 503 });
  }
}
