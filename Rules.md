# Rules.md — Boundaries & Conventions for the AI

These rules are **mandatory** for every coding session on this project. Read this file plus Memory.md before writing any code.

---

## 1. Stack Lock (do NOT deviate)

- ✅ Next.js 14+ App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Prisma + PostgreSQL, Auth.js v5, Zod, sharp, TipTap.
- ❌ Do NOT introduce: Redux, MobX, styled-components, CSS modules, Express server, Mongoose/MongoDB, class components, jQuery, moment.js (use `date-fns`), axios (use native `fetch`).
- ❌ Do NOT switch package manager mid-project. Use **pnpm**.
- ❌ Do NOT add a new dependency without listing it and the reason in Memory.md.

## 2. Code Conventions

- Server Components by default; add `"use client"` only when interactivity requires it.
- All admin mutations = **Server Actions** in `src/actions/`, each validated with a Zod schema from `src/lib/validators.ts` and re-checking `role === ADMIN` server-side. Never trust client role checks.
- Database access **only** through the Prisma singleton in `src/lib/db.ts`. Never instantiate PrismaClient elsewhere.
- File/storage access **only** through `src/lib/storage.ts` adapter. Never call fs or S3 SDK directly from components/actions.
- SEO metadata **only** through helpers in `src/lib/seo.ts` (`buildMetadata()`, `buildMangaJsonLd()` etc.). Never hand-write `<meta>` tags in pages.
- Naming: components `PascalCase.tsx`, utilities `camelCase.ts`, route folders lowercase.
- No `any`. No `@ts-ignore` without a comment explaining why.
- Keep files under ~300 lines; split when larger.

## 3. Error Handling

- Every Server Action returns a discriminated union: `{ ok: true, data } | { ok: false, error: string }`. Never throw raw errors to the client.
- Wrap all Prisma calls that can conflict (unique slugs, etc.) and translate P2002 → friendly message.
- Public pages: use `notFound()` for missing slugs; add `error.tsx` and `not-found.tsx` in each route group.
- API routes: always return proper status codes + `{ error }` JSON; rate-limit write endpoints (views, comments) with a simple in-memory/Upstash limiter.
- Log server errors with a prefix `[AREA]` (e.g. `[UPLOAD]`, `[SEO]`) — no `console.log` left in client code.

## 4. Security Rules

- Never store plaintext passwords — argon2id (or bcrypt ≥ 12 rounds).
- Sanitize all TipTap HTML server-side before saving (allowlist: p, h2–h4, strong, em, a[href], ul, ol, li, img[src|alt], blockquote).
- Validate uploads: images only (jpg/png/webp), ≤ 10MB, re-encode with sharp; reject anything else.
- Never expose Prisma models directly in API responses — map to DTOs (no passwordHash, no email leaks in public endpoints).
- All secrets from `.env` — never hardcode. Keep `.env.example` updated.

## 5. SEO Rules (non-negotiable)

- Every new public page MUST implement `generateMetadata()` via `lib/seo.ts`.
- Every public page MUST render exactly one `<h1>`.
- Every image needs meaningful `alt` (covers: `"{title} cover"`; chapter pages: `"{title} Chapter {n} page {i}"`).
- New content types MUST be added to `sitemap.ts` in the same phase they're built.
- Slug changes MUST create a `SlugRedirect` row and middleware must 301 old slugs.

## 6. What the AI Should Do

- Read `Memory.md` at session start; append a progress entry at session end.
- Complete one Phase (see Phases.md) at a time; do not jump ahead.
- After each phase: run `pnpm build` + `pnpm lint` and fix all errors before marking done.
- Write seed data (`prisma/seed.ts`) with 6–8 dummy manga + placeholder chapter images so the UI is testable.
- Ask (or note an assumption in Memory.md) when a requirement is ambiguous — never silently invent product decisions.

## 7. What the AI Should NOT Do

- ❌ Do NOT scrape, download, or hotlink manga content/images from other manga websites, and do not build scrapers/importers for third-party manga sites. All content enters via the admin upload flow only.
- ❌ Do NOT refactor working code from previous phases unless the current phase requires it (note any refactor in Memory.md).
- ❌ Do NOT change the DB schema without writing a Prisma migration (`prisma migrate dev`), never `db push` in later phases.
- ❌ Do NOT delete or rewrite these planning docs.
- ❌ Do NOT add authentication providers, payment systems, or i18n unless a phase asks.
- ❌ Do NOT generate fake analytics/SEO claims — implement real tags only.
