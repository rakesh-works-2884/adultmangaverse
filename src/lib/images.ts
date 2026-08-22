import type { ResizeOptions } from "sharp";

/**
 * sharp is a native module, loaded lazily and on first use only.
 *
 * A top-level `import sharp` is evaluated as soon as anything in this file's
 * module graph is loaded — and Next.js bundles every Server Action reachable
 * from a page into one chunk. That made a server whose sharp binaries are
 * broken fail *unrelated* actions: saving a static page pulled in the rich-text
 * editor's image-upload action, which pulled in this file, and the save died on
 * a dlopen error it had nothing to do with. Deferring the import confines that
 * failure to image processing, and reports it in words instead of a digest.
 */
let sharpModule: typeof import("sharp").default | undefined;

async function getSharp() {
  if (!sharpModule) {
    try {
      sharpModule = (await import("sharp")).default;
    } catch (e) {
      throw new Error(
        "Image processing is unavailable: the sharp native module failed to load " +
          `on this server (${(e as Error).message}).`,
      );
    }
  }
  return sharpModule;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10MB (Rules.md §4)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ProcessedImage = {
  buffer: Buffer;
  width: number;
  height: number;
};

/**
 * Validate + re-encode an uploaded image to WebP with sharp (Rules.md §4:
 * images only, ≤10MB, re-encode to strip any embedded payloads). sharp itself
 * acts as the magic-byte check — it throws on non-image input.
 */
async function processImageBuffer(input: Buffer, resize: ResizeOptions): Promise<ProcessedImage> {
  const sharp = await getSharp();
  const pipeline = sharp(input, { failOn: "error" });
  const meta = await pipeline.metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Invalid or corrupt image file.");
  }

  const { data, info } = await pipeline
    .rotate()
    .resize(resize)
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  return { buffer: data, width: info.width, height: info.height };
}

async function processImage(file: File, resize: ResizeOptions): Promise<ProcessedImage> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG, or WebP images are allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 10MB or smaller.");
  }
  return processImageBuffer(Buffer.from(await file.arrayBuffer()), resize);
}

/** Manga cover → 2:3 WebP, 600×900. */
export function processCover(file: File): Promise<ProcessedImage> {
  return processImage(file, { width: 600, height: 900, fit: "cover" });
}

/** Chapter page → WebP, capped at 1000px wide, aspect preserved, no upscaling. */
export function processChapterPage(file: File): Promise<ProcessedImage> {
  return processImage(file, { width: 1000, withoutEnlargement: true });
}

/** Cover from an already-decoded buffer (e.g. extracted from a bulk-import ZIP). */
export function processCoverBuffer(input: Buffer): Promise<ProcessedImage> {
  if (input.length > MAX_BYTES) {
    throw new Error("Image must be 10MB or smaller.");
  }
  return processImageBuffer(input, { width: 600, height: 900, fit: "cover" });
}

/** Process an already-decoded image buffer (e.g. a rendered PDF page) → WebP page. */
export function processChapterPageBuffer(input: Buffer): Promise<ProcessedImage> {
  return processImageBuffer(input, { width: 1000, withoutEnlargement: true });
}

/** Blog cover → 16:9 WebP, 1200×630 (also doubles as the OG/social preview image). */
export function processBlogCover(file: File): Promise<ProcessedImage> {
  return processImage(file, { width: 1200, height: 630, fit: "cover" });
}

/** Inline image pasted/dropped/inserted into a rich-text editor → capped width, aspect preserved. */
export function processContentImage(file: File): Promise<ProcessedImage> {
  return processImage(file, { width: 1200, withoutEnlargement: true });
}

/** Manual featured-carousel poster (desktop/landscape) → capped width, no forced crop — admin's own framing. */
export function processHeroDesktop(file: File): Promise<ProcessedImage> {
  return processImage(file, { width: 1600, withoutEnlargement: true });
}

/** Manual featured-carousel poster (mobile/portrait) → capped width, no forced crop. */
export function processHeroMobile(file: File): Promise<ProcessedImage> {
  return processImage(file, { width: 900, withoutEnlargement: true });
}
