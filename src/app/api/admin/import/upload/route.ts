import { requireAdmin } from "@/lib/auth-guards";
import { storage, checkStorageAccess, StorageError } from "@/lib/storage";
import { createUpload, verifyUpload, chunkKey, removeUpload, CHUNK_BYTES } from "@/lib/import-upload";

export const maxDuration = 60;

async function handle(request: Request) {
  const session = await requireAdmin();
  if (!session) return Response.json({ error: "Not authorized." }, { status: 403 });
  if (process.env.STORAGE_DRIVER !== "r2") return Response.json({ error: "Large ZIP uploads require R2 storage. Set STORAGE_DRIVER=r2 in the hosting settings." }, { status: 503 });
  try {
    if (request.method === "POST") {
      const { name, size } = await request.json();
      const token = createUpload(session.user.id, name, size);
      await checkStorageAccess();
      return Response.json({ token, chunkBytes: CHUNK_BYTES });
    }
    const upload = verifyUpload(request.headers.get("x-upload-token") || "", session.user.id);
    if (request.method === "DELETE") {
      await removeUpload(upload);
      return Response.json({ ok: true });
    }
    const rawIndex = request.headers.get("x-upload-part");
    const index = rawIndex === null ? -1 : Number(rawIndex);
    const key = chunkKey(upload, index);
    const data = Buffer.from(await request.arrayBuffer());
    if (data.length !== Math.min(CHUNK_BYTES, upload.size - index * CHUNK_BYTES)) return Response.json({ error: "Invalid upload part size." }, { status: 400 });
    await storage.save(key, data, "protected");
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof StorageError ? error.message : "Upload could not be completed. Check the file and retry." }, { status: 400 });
  }
}
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
