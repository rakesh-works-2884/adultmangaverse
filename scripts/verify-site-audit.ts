import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { chromium } from "playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import sharp from "sharp";
import { AwsClient } from "aws4fetch";

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: process.env.TEST_BASE_URL || "http://localhost:3006" });
  const key = randomUUID();
  const email = `audit-${key}@example.com`, password = randomBytes(24).toString("hex");
  let userId: string | undefined, mangaId: string | undefined;
  try {
    userId = (await db.user.create({ data: { email, passwordHash: await hash(password), role: "ADMIN", name: "Audit admin" } })).id;
    const manga = await db.manga.create({ data: { title: `Audit ${key}`, slug: `audit-${key}`, published: false } });
    mangaId = manga.id;
    await context.addInitScript(() => localStorage.setItem("amv_age_verified", "true"));
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("response", response => {
      if (response.request().method() === "POST") console.log(`Save response: ${response.status()}`);
    });
    const csrf = await (await context.request.get("/api/auth/csrf")).json();
    await context.request.post("/api/auth/callback/credentials", { form: { csrfToken: csrf.csrfToken, email, password }, headers: { "X-Auth-Return-Redirect": "1" } });
    assert.equal((await (await context.request.get("/api/auth/session")).json()).user.role, "ADMIN");
    await page.goto(`/admin/manga/${manga.id}/edit`);
    await page.locator('input[name="title"]').fill(`Edited ${key}`);
    const saving = page.waitForResponse(r => r.request().method() === "POST" && r.url().includes(`/admin/manga/${manga.id}/edit`));
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    const savedResponse = await saving;
    if (!savedResponse.ok()) {
      const body = await savedResponse.text();
      const digest = body.match(/"digest":"([^"]+)"/)?.[1];
      throw new Error(`Save HTTP ${savedResponse.status()}; type=${savedResponse.headers()["content-type"]}; platform=${savedResponse.headers()["x-vercel-error"] || "none"}; digest=${digest || "none"}; originRejected=${body.includes("Invalid Server Actions request")}; saved=${(await db.manga.findUniqueOrThrow({where:{id:manga.id}})).title === `Edited ${key}`}`);
    }
    try { await page.getByText("Saved.", { exact: true }).waitFor(); }
    catch { throw new Error(`Save did not succeed. Browser errors: ${errors.join("; ") || "none"}`); }
    assert.equal((await db.manga.findUniqueOrThrow({ where: { id: manga.id } })).title, `Edited ${key}`);
    console.log("PASS manga save persists and stays on editor");
    if (process.env.TEST_REGRESSIONS === "1") {
      // A dropped Server Action request must keep the form and its edits usable.
      await page.route("**/admin/manga/*/edit", route => route.request().method() === "POST" ? route.abort("failed") : route.continue());
      await page.locator('input[name="author"]').fill("Audit author");
      await page.getByRole("button", { name: "Save changes", exact: true }).click();
      await page.getByText(/Your edits are still here/).waitFor();
      assert.equal(await page.locator('input[name="author"]').inputValue(), "Audit author");
      await page.unroute("**/admin/manga/*/edit");
      for (const suffix of ["-renamed", "-again", ""]) {
        await page.locator('input[name="slug"]').fill(manga.slug + suffix);
        await page.getByRole("button", { name: "Save changes", exact: true }).click();
        await page.getByText("Saved.", { exact: true }).waitFor();
        assert.equal((await db.manga.findUniqueOrThrow({ where: { id: manga.id } })).slug, manga.slug + suffix);
      }
      for (const suffix of ["-renamed", "-again"]) {
        const redirect = await context.request.get(`/manga/${manga.slug}${suffix}/1`, { maxRedirects: 0 });
        assert.equal(redirect.status(), 308);
        assert.equal(new URL(redirect.headers().location, "http://localhost").pathname, `/manga/${manga.slug}/1`);
      }
      console.log("PASS interrupted save recovery, repeated slug renames, and old chapter redirects");
      const png = await sharp({ create: { width: 100, height: 150, channels: 3, background: "#345678" } }).png().toBuffer();
      await page.locator('input[name="cover"]').setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: png });
      await page.locator('input[name="published"]').check();
      await page.getByRole("button", { name: "Save changes", exact: true }).click();
      await page.getByText("Saved.", { exact: true }).waitFor();
      await page.getByPlaceholder("1 or 10.5").fill("1");
      await page.locator("form").filter({ has: page.getByRole("heading", { name: "Add chapter", exact: true }) }).getByRole("button", { name: "Add", exact: true }).click();
      await page.getByRole("button", { name: "Pages", exact: true }).waitFor();
      const chapter = await db.chapter.findFirstOrThrow({ where: { mangaId: manga.id } });
      await page.goto(`/admin/chapters/${chapter.id}/pages`);
      await page.locator('input[type="file"]').setInputFiles([{ name: "01.png", mimeType: "image/png", buffer: png }, { name: "02.png", mimeType: "image/png", buffer: png }]);
      await page.getByRole("button", { name: "Upload 2", exact: true }).click();
      await page.getByText("Upload complete. Pages are saved.", { exact: true }).waitFor();
      await page.getByRole("heading", { name: "Pages (2)", exact: true }).waitFor();
      await page.goto(`/manga/${manga.slug}`);
      await page.getByRole("button", { name: "Add to Library", exact: true }).click();
      await page.getByRole("button", { name: "In Library", exact: true }).waitFor();
      assert.equal(await db.bookmark.count({ where: { mangaId: manga.id, userId } }), 1);
      await page.goto(`/manga/${manga.slug}/1`);
      await page.getByRole("img", { name: /page 1$/ }).waitFor();
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
      await page.getByRole("button", { name: "Reset zoom", exact: true }).filter({ hasText: "125%" }).waitFor();
      await page.getByRole("button", { name: "Toggle reading mode", exact: true }).click();
      await page.getByRole("button", { name: "Next page", exact: true }).click();
      await page.getByRole("img", { name: /page 2$/ }).waitFor();
      console.log("PASS cover upload, publishing, chapter creation, page uploads, bookmarks, reader zoom and navigation");
    }
    for (const path of ["/", "/browse", "/search?q=audit", "/blog", "/library", "/account", "/admin", "/admin/manga", "/admin/import", "/admin/genres", "/admin/comments", "/admin/users", "/admin/pages", "/admin/blogs", "/admin/seo", "/admin/settings", "/admin/revenue", "/sitemap.xml", "/robots.txt"]) {
      const response = await page.goto(path);
      assert.equal(response?.status(), 200, `${path} status`);
      assert.equal(await page.getByRole("heading", { name: "Something went wrong", exact: true }).count(), 0, `${path} error boundary`);
      console.log(`PASS route ${path}`);
    }
    assert.deepEqual(errors, []);
  } finally {
    await db.slugRedirect.deleteMany({ where: { entity: "manga", oldSlug: { startsWith: `audit-${key}` } } });
    if (mangaId) {
      const fixture = await db.manga.findUnique({ where: { id: mangaId }, include: { chapters: { include: { pages: true } } } });
      const keys = fixture?.chapters.flatMap(c => c.pages.map(p => p.imageUrl)) || [];
      if (fixture?.coverUrl) {
        const prefix = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "") + "/";
        if (fixture.coverUrl.startsWith("/api/media/")) keys.push(fixture.coverUrl.slice(11));
        else if (process.env.R2_PUBLIC_URL && fixture.coverUrl.startsWith(prefix)) keys.push(fixture.coverUrl.slice(prefix.length));
      }
      const s3 = new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, region: "auto", service: "s3" });
      for (const key of keys) {
        const response = await s3.fetch(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`, { method: "DELETE" });
        assert.ok(response.ok, "Test upload cleanup");
      }
      await db.manga.delete({ where: { id: mangaId } });
    }
    if (userId) await db.user.delete({ where: { id: userId } });
    await context.close(); await browser.close(); await db.$disconnect();
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
