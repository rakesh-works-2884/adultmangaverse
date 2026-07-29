# Adult Manga Verse

A premium **18+ adult manga** platform — Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma 7 · PostgreSQL · Auth.js v5 · sharp.

Full admin CMS (manga, chapters, bulk page upload, genres, comments moderation, users, static pages, SEO/settings), age verification, content-intensity ratings, premium/subscription gating, and a complete on-page SEO engine (metadata, JSON-LD, sitemap, robots, canonicals, slug redirects).

> **18+ / legal:** Adults only. All characters depicted are 18 or older. The operator is responsible for the content they upload; the platform is a CMS/reader.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind v4 + shadcn/ui |
| DB / ORM | PostgreSQL (Neon) via Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Auth | Auth.js v5 (Credentials + JWT, roles) · argon2id (`@node-rs/argon2`) |
| Images | sharp (WebP) · storage adapter: local disk → Cloudflare R2 |
| Rich text | TipTap (+ server-side sanitize) |

## Local development

Requires Node 20+ and pnpm.

```bash
pnpm install
cp .env.example .env          # fill in DATABASE_URL (+ AUTH_SECRET)
pnpm prisma migrate dev       # apply migrations
pnpm prisma generate          # generate the client
pnpm prisma db seed           # 7 demo manga, genres, users, legal pages
pnpm dev                      # http://localhost:3000
```

Seed logins: `admin@mangablue.local / MangaBlue!Admin1` (ADMIN), `reader@mangablue.local / MangaBlue!User1`.

> **Windows note:** if you run `pnpm build` then `pnpm dev`, delete `.next` first — a dev server started on top of a production build serves 404s.

## Environment variables

See `.env.example`. Key ones:

- `DATABASE_URL` — Postgres connection string (Neon works out of the box).
- `NEXT_PUBLIC_SITE_URL` — public base URL (canonicals, sitemap, OG).
- `AUTH_SECRET` — `npx auth secret`.
- Storage (prod): `STORAGE_DRIVER=r2` + `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`. Default is local disk (`/public/uploads`).

## Deploy — Vercel + Neon + R2 (recommended)

1. Create a **Neon** Postgres project; copy the connection string.
2. Push this repo to GitHub and import it into **Vercel**.
3. Set env vars in Vercel: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET`, and the `R2_*` vars with `STORAGE_DRIVER=r2` (Vercel's filesystem is read-only, so R2 is required for uploads in prod).
4. Create a **Cloudflare R2** bucket, an API token (access key/secret), and a public bucket URL; fill the `R2_*` vars.
5. Run migrations against Neon once: `DATABASE_URL=... pnpm prisma migrate deploy` (locally or via a Vercel build step).
6. Deploy. Log in at `/admin` and start publishing.

## Deploy — Docker (self-hosted / VPS)

The app builds to a standalone server (`output: "standalone"`).

```bash
docker build -t adult-manga-verse .
docker run -p 3000:3000 --env-file .env adult-manga-verse
# run migrations against your DB (once):
#   pnpm prisma migrate deploy   (or exec into the container)
```

For a VPS you can put this behind a reverse proxy (Caddy/nginx) for TLS. Persist `/app/public/uploads` with a volume if using the local storage driver, or use R2.

## Project structure

```
prisma/           schema, migrations, seed
src/app/          (public) routes, /admin, /api, sitemap.ts, robots.ts
src/components/   public/ · admin/ · seo/ · ui/ (shadcn)
src/lib/          db, auth, storage, images, seo, settings, catalog, validators…
src/actions/      server actions (admin + user mutations)
```

## Scripts

- `pnpm dev` · `pnpm build` · `pnpm start` · `pnpm lint`
- `pnpm prisma migrate dev` · `pnpm prisma db seed` · `pnpm prisma studio`
