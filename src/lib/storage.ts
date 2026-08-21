import "server-only";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { AwsClient } from "aws4fetch";

/**
 * Storage adapter (Rules.md §2 — the ONLY module that touches the filesystem /
 * object store). Dev uses the local driver; Cloudflare R2 is available behind
 * the same interface via STORAGE_DRIVER=r2.
 *
 * `key` is the path relative to the driver's root, e.g. "manga/azure-blade/cover-ab12.webp".
 *
 * Two visibility levels:
 *  - "public"    Covers/thumbnails — fine to be permanently, anonymously
 *                fetchable (they're marketing material, and need to stay
 *                crawlable for SEO/social previews). Served as a normal
 *                static URL.
 *  - "protected" Chapter page scans — the actual content. Never given a
 *                permanent URL; every render generates a fresh, short-lived
 *                signed URL (see getSignedUrl) so a copied link goes stale
 *                and bulk-scraping the whole library can't just walk a
 *                predictable/public URL scheme.
 */
export type Visibility = "public" | "protected";

export interface StorageAdapter {
  save(key: string, data: Buffer, visibility: Visibility): Promise<string>; // "public" → public URL, "protected" → bare key
  remove(key: string, visibility: Visibility): Promise<void>;
  getSignedUrl(key: string, ttlSeconds?: number): Promise<string>;
}

const PUBLIC_ROOT = path.join(process.cwd(), "public", "uploads");
// Deliberately outside /public — Next never serves this directory as static
// assets, so the only way to read a file here is through the signed /api/img
// route below.
const PROTECTED_ROOT = path.join(process.cwd(), "storage-uploads");

const DEFAULT_TTL_SECONDS = 30 * 60;

function rootFor(visibility: Visibility): string {
  return visibility === "public" ? PUBLIC_ROOT : PROTECTED_ROOT;
}

export function contentTypeFor(key: string): string {
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function imageSignSecret(): string {
  const secret = process.env.IMAGE_SIGN_SECRET;
  if (!secret) {
    throw new Error("[STORAGE] IMAGE_SIGN_SECRET is not set — required to sign protected image URLs.");
  }
  return secret;
}

function signPayload(key: string, exp: number): string {
  return createHmac("sha256", imageSignSecret()).update(`${key}:${exp}`).digest("hex");
}

/** Used by the /api/img route handler to verify a request's exp/sig query params. */
export function verifyLocalSignature(key: string, expParam: string, sigParam: string): boolean {
  const exp = Number(expParam);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const expected = Buffer.from(signPayload(key, exp), "hex");
  const actual = Buffer.from(sigParam, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function protectedRootDir(): string {
  return PROTECTED_ROOT;
}

/** Strip a legacy `/uploads/...` or R2-public-URL prefix, if present, back down to a bare key. */
export function keyFromUrl(url: string): string | null {
  const r2 = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (r2 && url.startsWith(`${r2}/`)) return url.slice(r2.length + 1);
  const prefix = "/uploads/";
  if (url.startsWith(prefix)) return url.slice(prefix.length);
  // Already a bare key (protected files, or any value that isn't a legacy URL).
  return url || null;
}

class LocalStorage implements StorageAdapter {
  async save(key: string, data: Buffer, visibility: Visibility): Promise<string> {
    const full = path.join(rootFor(visibility), key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
    const posixKey = key.split(path.sep).join("/");
    return visibility === "public" ? `/uploads/${posixKey}` : posixKey;
  }

  async remove(key: string, visibility: Visibility): Promise<void> {
    try {
      await unlink(path.join(rootFor(visibility), key));
    } catch {
      // Missing file on delete is not an error.
    }
  }

  async getSignedUrl(key: string, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<string> {
    const bareKey = keyFromUrl(key) ?? key;
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const sig = signPayload(bareKey, exp);
    return `/api/img/${bareKey}?exp=${exp}&sig=${sig}`;
  }
}

/** Cloudflare R2 (S3-compatible) via signed fetch. Enabled with STORAGE_DRIVER=r2. */
class R2Storage implements StorageAdapter {
  private client = new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    region: "auto",
    service: "s3",
  });
  private endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}`;
  private publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

  async save(key: string, data: Buffer, visibility: Visibility): Promise<string> {
    // Explicit Content-Length: without it, Next's fetch (undici) can send
    // this PUT without one in some runtime contexts (observed from a Route
    // Handler specifically), and R2 replies 411 Length Required.
    const res = await this.client.fetch(`${this.endpoint}/${key}`, {
      method: "PUT",
      body: new Uint8Array(data),
      headers: { "content-type": contentTypeFor(key), "content-length": String(data.byteLength) },
    });
    if (!res.ok) throw new Error(`[STORAGE] R2 upload failed: ${res.status} ${await res.text().catch(() => "")}`);
    // "protected" content should live in a bucket with no public custom
    // domain bound — access only ever happens through a presigned URL below.
    return visibility === "public" ? `${this.publicUrl}/${key}` : key;
  }

  async remove(key: string): Promise<void> {
    try {
      await this.client.fetch(`${this.endpoint}/${key}`, { method: "DELETE" });
    } catch {
      /* non-fatal */
    }
  }

  async getSignedUrl(key: string, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<string> {
    const bareKey = keyFromUrl(key) ?? key;
    const url = `${this.endpoint}/${bareKey}?X-Amz-Expires=${ttlSeconds}`;
    const signed = await this.client.sign(url, { method: "GET", aws: { signQuery: true } });
    return signed.url;
  }
}

function createStorage(): StorageAdapter {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "r2") {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_BUCKET || !process.env.R2_PUBLIC_URL) {
      console.warn("[STORAGE] STORAGE_DRIVER=r2 but R2_* env vars are incomplete; using local.");
      return new LocalStorage();
    }
    return new R2Storage();
  }
  return new LocalStorage();
}

export const storage: StorageAdapter = createStorage();
