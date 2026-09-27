import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { storage } from "@/lib/storage";

export const CHUNK_BYTES = 3 * 1024 * 1024;
export const MAX_ZIP_BYTES = 200 * 1024 * 1024;
type Upload = { id: string; user: string; name: string; size: number; expires: number };
function signature(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Upload signing is not configured.");
  return createHmac("sha256", secret).update(value).digest();
}
export function createUpload(user: string, name: string, size: number) {
  if (typeof name !== "string" || name.length > 300 || !name.toLowerCase().endsWith(".zip") || !Number.isSafeInteger(size) || size < 1 || size > MAX_ZIP_BYTES) {
    throw new Error("Select a ZIP file up to 200 MB.");
  }
  const upload: Upload = { id: randomUUID(), user, name, size, expires: Date.now() + 3600_000 };
  const payload = Buffer.from(JSON.stringify(upload)).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}
export function verifyUpload(token: string, user: string): Upload {
  if (typeof token !== "string" || token.length > 2000) throw new Error("Invalid upload.");
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra) throw new Error("Invalid upload.");
  const expected = signature(payload);
  const actual = Buffer.from(sig, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Invalid upload.");
  const upload = JSON.parse(Buffer.from(payload, "base64url").toString()) as Upload;
  if (upload.user !== user || upload.expires <= Date.now()) throw new Error("Upload expired. Select the ZIP again.");
  return upload;
}
export function chunkKey(upload: Upload, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= Math.ceil(upload.size / CHUNK_BYTES)) throw new Error("Invalid upload part.");
  return `imports/${upload.id}/${index}.part`;
}
export async function removeUpload(upload: Upload) {
  await Promise.allSettled(Array.from({ length: Math.ceil(upload.size / CHUNK_BYTES) }, (_, i) => storage.remove(chunkKey(upload, i), "protected")));
}
export async function readUpload(upload: Upload): Promise<File> {
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < Math.ceil(upload.size / CHUNK_BYTES); i++) {
    const url = await storage.getSignedUrl(chunkKey(upload, i), 60);
    if (!url.startsWith("https://")) throw new Error("Large ZIP uploads require R2 storage.");
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error("An upload part is missing. Please upload the ZIP again.");
    const data = new Uint8Array(await response.arrayBuffer());
    if (data.length !== Math.min(CHUNK_BYTES, upload.size - i * CHUNK_BYTES)) throw new Error("Incomplete upload part. Please retry.");
    chunks.push(data);
  }
  return new File(chunks as BlobPart[], upload.name, { type: "application/zip" });
}
