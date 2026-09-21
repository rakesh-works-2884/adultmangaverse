import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth-guards";
import { storage, checkStorageAccess, StorageError } from "@/lib/storage";
import { processCoverBuffer, processChapterPageBuffer } from "@/lib/images";
import { slugify, uniqueSlug } from "@/lib/slug";

/**
 * Bulk import from a single ZIP: one ComicInfo-style XML file + a flat set of
 * numbered page images (any nesting). The first image (by natural sort) is
 * used as the cover. If a manga with the same title/slug already exists,
 * this ZIP is added as its next chapter instead of creating a duplicate —
 * that's what makes this usable for daily updates to an ongoing title, not
 * just one-shots.
 *
 * Route Handler, not a Server Action: bulk uploads can exceed the site-wide
 * Server Action body cap, and this way that cap (shared by every other
 * action) doesn't need to grow just for this one admin tool.
 */

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const MANGA_STATUSES = ["ONGOING", "COMPLETED", "HIATUS"] as const;
// How many pages to decode/re-encode/upload at once. High enough to matter
// for a 200+ page chapter, low enough not to blow past R2/DB connection
// limits or spike memory holding that many decoded buffers at once.
const UPLOAD_CONCURRENCY = 6;

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Find-or-create is a check-then-act race: if two imports resolve the same
 * new genre name concurrently (e.g. a resubmitted request racing the first
 * one still in flight), both can pass the findUnique check before either
 * commits, and the loser's create() throws a unique constraint error. Rather
 * than prevent that (would need a DB-level advisory lock), just recover from
 * it — the winner's row is already there, so re-fetch by name.
 */
async function findOrCreateGenre(name: string): Promise<{ id: string }> {
  const existing = await prisma.genre.findUnique({ where: { name }, select: { id: true } });
  if (existing) return existing;
  try {
    const gSlug = await uniqueSlug(slugify(name), async (s) => (await prisma.genre.count({ where: { slug: s } })) > 0);
    return await prisma.genre.create({ data: { name, slug: gSlug }, select: { id: true } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const genre = await prisma.genre.findUnique({ where: { name }, select: { id: true } });
      if (genre) return genre;
    }
    throw e;
  }
}

/** Runs `fn` over `items` with at most `limit` in flight, preserving result order. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

type ParsedMeta = {
  title: string;
  releaseYear?: number;
  author?: string;
  authorLink?: string;
  genres: string[];
};

function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)["#text"] ?? "");
  }
  return String(value).trim();
}

/** Parses the subset of ComicInfo.xml fields this importer actually uses. */
function parseComicInfoXml(xml: string): ParsedMeta {
  const parser = new XMLParser({ ignoreAttributes: false });
  const doc = parser.parse(xml);
  const root = doc.ComicInfo ?? doc;

  const title = textOf(root.Title).trim();
  if (!title) throw new Error("XML is missing a <Title>.");

  const yearRaw = textOf(root.Year).trim();
  const releaseYear = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : undefined;

  const author = textOf(root.Writer).trim() || undefined;
  const web = textOf(root.Web).trim();
  const authorLink = /^https?:\/\//i.test(web) ? web : undefined;

  // Tags commonly look like "category: Romance, Comedy" — strip that label if present.
  const tagsRaw = textOf(root.Tags).trim();
  const withoutLabel = tagsRaw.replace(/^category\s*:\s*/i, "");
  const genres = withoutLabel
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  return { title, releaseYear, author, authorLink, genres };
}

export type ImportResult =
  | { ok: true; mode: "created"; id: string; title: string; slug: string; chapter: number; pages: number }
  | { ok: true; mode: "appended"; id: string; title: string; slug: string; chapter: number; pages: number }
  | { ok: false; error: string };

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload. Please select the ZIP again and retry." }, { status: 400 });
  }
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No ZIP file provided." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return NextResponse.json({ error: "Please upload a .zip file." }, { status: 400 });
  }

  try {
    await checkStorageAccess();
  } catch (error) {
    return NextResponse.json({ error: error instanceof StorageError ? error.message : "Upload storage is temporarily unavailable." }, { status: 503 });
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "Could not read the ZIP file — is it corrupt?" }, { status: 400 });
  }

  const allEntries = Object.values(zip.files).filter((e) => !e.dir && !e.name.split("/").some((part) => part === "__MACOSX" || part.startsWith("._")));
  const xmlEntry = allEntries.find((e) => e.name.toLowerCase().endsWith(".xml"));

  const imageEntries = allEntries.filter((e) => IMAGE_EXT.test(e.name)).sort((a, b) => naturalCompare(a.name, b.name));
  if (imageEntries.length === 0) {
    return NextResponse.json({ error: "No page images found in the ZIP." }, { status: 400 });
  }

  let meta: ParsedMeta;
  try {
    meta = xmlEntry ? parseComicInfoXml(await xmlEntry.async("string")) : { title: file.name.replace(/\.zip$/i, "").trim(), genres: [] };
    const titleOverride = fd.get("title");
    if (typeof titleOverride === "string" && titleOverride.trim()) meta.title = titleOverride.trim();
  } catch {
    return NextResponse.json({ error: "Could not read the XML metadata. Check that it is valid and includes a <Title>." }, { status: 400 });
  }

  if (!meta.title || meta.title.length > 300) {
    return NextResponse.json({ error: "Enter a title between 1 and 300 characters." }, { status: 400 });
  }

  const result = await importChapter(meta, imageEntries);
  if (result.ok) {
    revalidatePath("/admin/manga");
    revalidatePath("/");
  }
  return NextResponse.json({ result });
}

async function importChapter(meta: ParsedMeta, imageEntries: JSZip.JSZipObject[]): Promise<ImportResult> {
  try {
    const desiredSlug = slugify(meta.title);
    const existing = await prisma.manga.findFirst({
      where: { slug: desiredSlug },
      select: { id: true, slug: true, title: true, chapters: { select: { number: true }, orderBy: { number: "desc" }, take: 1 } },
    });

    const slug = existing
      ? existing.slug
      : await uniqueSlug(desiredSlug, async (s) => (await prisma.manga.count({ where: { slug: s } })) > 0);
    const nextChapterNumber = existing?.chapters[0] ? Number(existing.chapters[0].number) + 1 : 1;

    // Everything slow — file processing/uploads AND genre lookups — happens
    // BEFORE and OUTSIDE the transaction, in parallel. An interactive
    // transaction holds a DB connection open for its whole duration, so the
    // transaction itself should only ever contain the handful of fast writes
    // that must be atomic. If something here fails partway through, nothing
    // has been written to the database yet — no half-created manga/chapter
    // rows to clean up, just some now-orphaned (but harmless — nothing links
    // to them) objects in storage or an unused genre row.
    const genresPromise: Promise<string[]> = existing
      ? Promise.resolve([])
      : (async () => {
          const ids: string[] = [];
          for (const name of meta.genres) {
            const genre = await findOrCreateGenre(name);
            ids.push(genre.id);
          }
          return ids;
        })();

    const coverPromise: Promise<string | undefined> = existing
      ? Promise.resolve(undefined)
      : (async () => {
          // First page doubles as the cover — common for oneshot/doujin-style
          // archives. Re-decode from the original bytes rather than reusing
          // the page-sized encode below, since the cover needs its own
          // 600×900 crop, not the 1000px-wide page resize.
          const coverProcessed = await processCoverBuffer(await imageEntries[0].async("nodebuffer"));
          const coverKey = `manga/${slug}/cover-${Date.now().toString(36)}.webp`;
          return storage.save(coverKey, coverProcessed.buffer, "public");
        })();

    const pagesPromise = mapWithConcurrency(imageEntries, UPLOAD_CONCURRENCY, async (entry, i) => {
      const buf = Buffer.from(await entry.async("nodebuffer"));
      const processed = await processChapterPageBuffer(buf);
      const rand = Math.random().toString(36).slice(2, 8);
      const key = `manga/${slug}/ch-${nextChapterNumber}/page-${Date.now()}-${i}-${rand}.webp`;
      const storedKey = await storage.save(key, processed.buffer, "protected");
      return { index: i, imageUrl: storedKey, width: processed.width, height: processed.height };
    });

    const [genreIds, coverUrl, pageRows] = await Promise.all([genresPromise, coverPromise, pagesPromise]);

    const { mangaId, title, mode } = await prisma.$transaction(async (tx) => {
      let id: string;
      let mangaTitle: string;
      let resultMode: "created" | "appended";

      if (existing) {
        id = existing.id;
        mangaTitle = existing.title;
        resultMode = "appended";
      } else {
        const manga = await tx.manga.create({
          data: {
            title: meta.title,
            slug,
            coverUrl,
            author: meta.author ?? null,
            authorLink: meta.authorLink ?? null,
            status: MANGA_STATUSES[0],
            releaseYear: meta.releaseYear ?? null,
            published: false,
            genres: { connect: genreIds.map((gid) => ({ id: gid })) },
          },
        });
        id = manga.id;
        mangaTitle = manga.title;
        resultMode = "created";
      }

      const chapter = await tx.chapter.create({ data: { mangaId: id, number: nextChapterNumber, publishedAt: null } });
      await tx.page.createMany({ data: pageRows.map((p) => ({ ...p, chapterId: chapter.id })) });

      return { mangaId: id, title: mangaTitle, mode: resultMode };
    }, { timeout: 30_000, maxWait: 15_000 });

    return { ok: true, mode, id: mangaId, title, slug, chapter: nextChapterNumber, pages: pageRows.length };
  } catch (e) {
    console.error("[IMPORT] failed:", e);
    return { ok: false, error: e instanceof StorageError ? e.message : "Import failed. Please retry or ask the site administrator to check the server logs." };
  }
}
