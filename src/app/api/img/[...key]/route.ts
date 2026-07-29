import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { contentTypeFor, protectedRootDir, verifyLocalSignature } from "@/lib/storage";

/**
 * Serves chapter page images from the protected (non-public) storage root —
 * only with a valid, unexpired signature from storage.ts's getSignedUrl().
 * This is what actually enforces the short-lived-URL protection for the
 * local storage driver; R2 does the equivalent with a native presigned URL
 * and never touches this route.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: segments } = await params;
  const key = segments.join("/");

  const url = new URL(_req.url);
  const exp = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");
  if (!exp || !sig || !verifyLocalSignature(key, exp, sig)) {
    return new Response("Forbidden", { status: 403 });
  }

  const root = path.resolve(protectedRootDir());
  const resolved = path.resolve(root, key);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const buf = await readFile(resolved);
    const remaining = Math.max(0, Number(exp) - Math.floor(Date.now() / 1000));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": contentTypeFor(key),
        "Cache-Control": `private, max-age=${remaining}`,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
