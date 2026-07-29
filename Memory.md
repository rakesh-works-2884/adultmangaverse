# Memory.md — Project Progress Log

> **Purpose:** This file is the AI's persistent memory across chats/tools. The AI must READ this file at the start of every session and APPEND an entry at the end of every session. Keep entries short and factual — this file replaces re-reading the whole codebase.
>
> **Note:** This file starts nearly empty. It gets filled in only once coding begins.

---

## Project Snapshot (keep updated)

- **Current Phase:** **Phase 8 ✅ COMPLETE — ALL PHASES 0–8 DONE.** Static pages + settings/analytics + error/404 + R2 adapter + Dockerfile + deploy README. Build+lint green; verified 11/11. Full adult-manga platform is feature-complete and admin-operable. DB migrations: **2**. Not yet deployed to prod (infra ready).
- **⚠ PIVOT:** Project is now an **18+ adult manga platform** (age gate, content-intensity levels, premium/subscription tiers w/ gating — no real payments yet, adult legal pages). Design switched from blue/Poppins → cyan `#00D9FF`/navy `#0A192F` + Montserrat/Roboto/Inter (from `adult-content-platform-builder` skill at `C:\Users\igkai\Downloads\amv\...`). Boundary: build platform software only; content is operator-uploaded; all content depicts adults, never minors.
- **Stack (actual):** Next.js **16.2.11** (App Router, Turbopack) · React 19 · TS strict · Tailwind **v4** (CSS-based theme, no tailwind.config) · shadcn/ui (style `base-nova`) · Prisma **7** (driver-adapter, client generated to `src/generated/prisma`) · PostgreSQL (Neon) · Auth.js **v5** (Credentials + JWT, role in token) · @node-rs/argon2 · sharp · pnpm 11.17
- **DB migrations applied:** 1 → `20260723201358_init` (all 11 models). DB seeded (12 genres, 7 manga, 14 chapters, 56 pages, admin+reader users).
- **Auth:** JWT sessions; `src/auth.config.ts` (edge-safe, callbacks) + `src/auth.ts` (Credentials provider). Route protection in `src/proxy.ts` (Next 16 renamed middleware→proxy). Seed logins: `admin@mangablue.local / MangaBlue!Admin1` (ADMIN), `reader@mangablue.local / MangaBlue!User1` (USER).
- **Deployed:** no
- **Run notes:** pnpm is via npm-global (`C:\Users\igkai\AppData\Roaming\npm`) — corepack couldn't write to Program Files. Native builds (sharp/prisma) are approved through the `allowBuilds` block in `pnpm-workspace.yaml`.

## Key Decisions Log

| Date | Decision | Reason |
|---|---|---|
| 2026-07-24 | Use latest Next 16 / React 19 / Tailwind v4 (not literally "14") | Docs say "Next.js 14+"; create-next-app installs latest. All within the stack lock. |
| 2026-07-24 | Site is **dark-only**; `:root` IS the dark theme; shadcn semantic tokens mapped onto Design.md navy palette | Design.md defines only a dark theme; no light mode requested. |
| 2026-07-24 | shadcn `--accent` kept as interactive surface; Design's bright accent (#60A5FA) exposed as `highlight` utility | Avoid clash — shadcn uses `accent` for hover surfaces, Design uses it for bright text. |
| 2026-07-24 | Prisma 7 uses `prisma-client` generator + `@prisma/adapter-pg` driver adapter; URL via `prisma.config.ts`+dotenv | Prisma 7 default architecture; client generated to `src/generated/prisma`, imported only in `src/lib/db.ts`. |
| 2026-07-24 | Dev + prod DB = **Neon** (free cloud) | User choice; already Architecture.md's documented prod Postgres → standard `postgresql://` works with the pg adapter. |
| 2026-07-24 | Password hashing = **@node-rs/argon2** (argon2id) not `argon2` | Rust prebuilt binaries — reliable on Windows, no node-gyp. Satisfies Rules.md §4 (argon2id). |
| 2026-07-24 | `middleware.ts` → **`src/proxy.ts`** | Next 16 renamed the convention (middleware deprecated). Same API; next-auth `auth()` wrapper works as the default export. |
| 2026-07-24 | Split auth config: edge-safe `auth.config.ts` + node `auth.ts` | Credentials provider needs prisma+argon2 (node); proxy must stay edge-safe. Standard Auth.js v5 pattern. |
| 2026-07-24 | Prisma 7: run `prisma generate` AFTER `migrate dev` | In this setup `migrate dev` did NOT regenerate the client with models — generate explicitly or seed/build fails with `prisma.<model> undefined`. |
| 2026-07-24 | **PIVOT → 18+ Adult Manga Verse** (user directive + skill) | User: "make my website like [the skill] and rest as in prompt." Keep Next.js/Prisma/admin/SEO; adopt skill's adult features + cyan/navy look. |
| 2026-07-24 | Subscriptions = tiers + gating, **no real payments** yet | User choice. Subscribe page + premium gating via `User.tier`; Stripe deferred. |
| 2026-07-24 | Age gate = client overlay in root layout (not a route) | Better for an SSR site than a `/age-gate` route; localStorage `amv_age_verified`. |

## Dependencies Added (beyond the obvious Phase 0 baseline)

| Package | Phase | Reason |
|---|---|---|
| `@prisma/adapter-pg` | 0 | **Required by Prisma 7** — the new client needs a driver adapter to connect. |
| `dotenv` (dev) | 0 | **Required by Prisma 7** `prisma.config.ts` to load `DATABASE_URL` from `.env`. |
| `lucide-react` | 0 | Icons (Design.md §5 mandates lucide only). |
| `date-fns` | 0 | Rules.md §1 mandates date-fns over moment. |
| `next-auth@beta` + `@auth/prisma-adapter` | 0 (installed) | Auth.js v5, wired in Phase 1. |
| `zod`, `sharp` | 0 | Stack baseline (validation, image pipeline). |
| `@node-rs/argon2` | 1 | Password hashing (argon2id), Windows-safe prebuilt binary. |
| `tsx` (dev) | 1 | Runs `prisma/seed.ts` (configured as `migrations.seed` in prisma.config.ts). Needed esbuild build approval. |
| `@tiptap/react` `@tiptap/starter-kit` `@tiptap/pm` | 2 | Rich-text synopsis editor (admin). StarterKit v3 already bundles Link/Underline. |
| `@tiptap/extension-link` | 2 | **Redundant** — StarterKit v3 includes Link; installed then not used. Safe to remove. |
| `sanitize-html` + `@types/sanitize-html` (dev) | 2 | Server-side sanitize of TipTap HTML before save (Rules §4 allowlist). |
| `playwright` (dev) | 3 | Browser E2E verification of each phase. |
| `aws4fetch` | 8 | Signed S3-compatible requests for the Cloudflare R2 storage adapter. |

## Known Issues / TODO Carryover

- Prisma 7 `init` also dropped agent-skill files (`.windsurf/`, `.agents/`, `.claude/skills/`, `skills-lock.json`) in the repo — harmless, left in place.
- `pnpm install` exits non-zero on an ignored nested `sharp@0.34.5`/`unrs-resolver` build — cosmetic; direct `sharp@0.35.3` builds fine (WebP verified).
- Native builds need approval via the `allowBuilds` block in `pnpm-workspace.yaml` (a harness hook appends new entries as `set this to true or false` on each install — flip to true/false). Approved: sharp, prisma, @prisma/engines, esbuild.
- **JWT type augmentation** (`src/types/next-auth.d.ts`) does not override next-auth's JWT `[key:string]: unknown` index signature → `token.id/role` read as `unknown`. Worked around with `as string`/`as Role` casts in the session callback. Revisit if next-auth types change.
- pg emits an SSL deprecation warning: `sslmode=require` treated as `verify-full`; future pg v9 changes semantics. Non-blocking now; revisit connection string at deploy (Phase 8).
- App Router: underscore-prefixed route folders (`_x`) are PRIVATE (non-routed) — bit me once during verification.
- **ALWAYS clear `.next` before `pnpm dev` if a `pnpm build` ran since the last dev start.** Starting dev on top of a production `.next` corrupts the dev route manifest → every route except `/` 404s (incl. `/api/auth/*`). Fix: stop node, `rm -rf .next`, restart dev.
- Premium gating reads `User.tier` **fresh from the DB** in the reader page (tier is NOT in the JWT/session — only `id`+`role` are). So admin-set tier changes take effect immediately. `hasPremiumAccess` in `lib/access.ts`.
- ~~**Auth-aware header deferred**~~ — RESOLVED 2026-07-24: user reported "can't sign in". Diagnosed with Playwright (login backend was fine 3/3; the issue was the static header still showing "Sign in" after login → looked broken). Fixed: `(public)/layout` now `await auth()` and passes `user` to `SiteHeader`, which shows a user menu (name, My Library, Admin panel if staff, Sign out via `next-auth/react`). Public pages are now SSR (layout reads cookies) — fine; Phase 7 SEO can revisit caching.
- Added `playwright` (dev) for browser E2E diagnosis of the login flow. Kept for future E2E; remove if unwanted.
- **sharp + Turbopack + Windows crash (FIXED 2026-07-24):** loading any server module that imports `sharp` (e.g. `/admin/manga/new` → actions/manga → images.ts) crashed the dev server with `ERR_DLOPEN_FAILED: The specified procedure could not be found` — Turbopack bundled the native `.node` and broke the Windows sibling-DLL load. Fix: `serverExternalPackages: ["sharp", "@prisma/adapter-pg"]` in `next.config.ts`. Verified `/admin/manga/new` → 200, server stable. (Standalone `require('sharp')` always worked — it was a bundling issue, not a broken binary.)

---

## Session Entries

<!-- TEMPLATE — copy for each session:

### [YYYY-MM-DD] Session N — Phase X
**Completed:**
- ...

**Files created/changed:**
- src/... (what & why, one line each)

**Assumptions made:**
- ...

**Next step:**
- Exact next task to start with.

**Build status:** `pnpm build` ✅/❌ · `pnpm lint` ✅/❌
-->

### [2026-07-24] Session 1 — Phase 0 (Project Bootstrap)
**Completed:**
- Scaffolded Next.js 16 (App Router, TS strict, Tailwind v4, src/, pnpm) in project root; docs preserved.
- Installed stack: shadcn/ui (init, `base-nova`), Prisma 7 (+adapter-pg, dotenv), Auth.js v5 (+prisma-adapter), Zod, sharp (WebP verified), lucide-react, date-fns.
- Built Architecture.md §4 folder skeleton (`(public)`, `admin`, `api`, `components/{public,admin,seo,ui}`, `lib`, `actions`, `types`, `prisma`).
- Wired full Design.md dark-blue theme in `globals.css` (brand tokens → shadcn semantic tokens) + Inter/Poppins via `next/font`.
- Root layout (metadata base, fonts) + `(public)` layout (SiteHeader/SiteFooter) + placeholder homepage shell (hero + Trending/Latest/New Series sections).
- Prisma singleton `src/lib/db.ts` (only PrismaClient instance), schema stub (no models yet), `.env.example`.
- **Verified:** `pnpm lint` ✅ (exit 0), `pnpm build` ✅ (exit 0, `/` prerenders static). Dev server smoke test: HTTP 200, Inter+Poppins fonts + navy tokens render, header/homepage content present.

**Files created/changed:**
- `src/app/layout.tsx` — root: Inter+Poppins, metadata base from `siteConfig`.
- `src/app/globals.css` — Design.md tokens (dark-only), shadcn mapping, reduced-motion.
- `src/app/(public)/{layout,page}.tsx` — public shell + homepage placeholder (removed default `src/app/page.tsx`).
- `src/components/public/{SiteHeader,SiteFooter,SectionHeading}.tsx` — header (client, mobile drawer), footer, section heading.
- `src/lib/{site,db,utils}.ts` — site config, Prisma singleton, shadcn cn().
- `prisma/schema.prisma`, `prisma.config.ts`, `.env`, `.env.example`, `eslint.config.mjs` (ignore generated), `pnpm-workspace.yaml` (allowBuilds).

**Assumptions made:**
- "Next.js 14+" → used latest 16 (see Decisions). Dark-only theme (Design.md has no light mode).
- Homepage is a structural placeholder until Phase 4 wires real data (no seed content until Phase 1).

- **DB connects:** ✅ Neon `DATABASE_URL` set in `.env`; verified via `prisma db execute` AND the runtime pg adapter (temp `/api/dbcheck` route returned `{ok:true,rows:[{ok:1}]}`, then removed).

**Next step:**
- Begin **Phase 1**: full Prisma schema (User, Manga, Genre, Chapter, Page, Bookmark, ReadProgress, Comment, StaticPage, Setting, SlugRedirect) → first `prisma migrate dev` → `prisma/seed.ts` (6–8 manga, genres, 2 chapters each w/ placeholder images, 1 admin) → Auth.js v5 credentials login/register (argon2) → middleware guarding `/admin/*` (ADMIN/MOD) & `/library` → styled login/register pages.

**Build status:** `pnpm build` ✅ · `pnpm lint` ✅ · DB connects ✅

### [2026-07-24] Session 2 — Phase 1 (Database, Auth & Roles)
**Completed:**
- Full Prisma schema (11 models, 4 enums, relations/indexes) → first migration `20260723201358_init` applied to Neon.
- `prisma/seed.ts` — generates local placeholder cover/page images with sharp (no external hotlinking), seeds 12 genres, 7 manga (varied type/status/year/featured), 2 chapters each × 4 pages, admin + reader users (argon2id). Wired as `migrations.seed` (tsx).
- Auth.js v5: split config (`auth.config.ts` edge-safe + `auth.ts` Credentials), JWT sessions with `role`/`id`, route handler, `next-auth.d.ts` type augmentation.
- Register Server Action (`src/actions/auth.ts`, Zod + argon2, discriminated-union result), styled Login/Register pages (noindex) + client forms, shared `AuthCard`.
- `src/proxy.ts` (Next 16 middleware→proxy) gating `/admin/*` (ADMIN/MOD) and `/library` (auth). Admin layout with server-side role re-check + sidebar + sign-out; minimal `/admin` dashboard with live counts.
- **Verified end-to-end (8/8 via scripted HTTP against dev server):** unauth /admin→login redirect; register ok + duplicate rejected; new USER login+session; USER blocked from /admin; wrong password→no session; ADMIN login+session; ADMIN reaches /admin 200. Temp verify route + @test.local users removed after.

**Files created/changed:**
- `prisma/schema.prisma` (full model), `prisma/seed.ts`, `prisma.config.ts` (seed cmd).
- `src/auth.config.ts`, `src/auth.ts`, `src/proxy.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/types/next-auth.d.ts`.
- `src/lib/validators.ts`, `src/actions/auth.ts`.
- `src/components/public/{AuthCard,LoginForm,RegisterForm}.tsx`, `src/app/(public)/{login,register}/page.tsx`.
- `src/components/admin/SignOutButton.tsx`, `src/app/admin/{layout,page}.tsx`.
- `.env` (+AUTH_SECRET), `.gitignore` (+/public/uploads), removed obsolete `.gitkeep`s + `src/middleware.ts`.

**Assumptions made:**
- Seed admin credentials chosen by me (admin@mangablue.local / MangaBlue!Admin1) — change anytime.
- Auth pages noindex + interim static metadata; full `lib/seo.ts` metadata engine is Phase 7.
- Header stays static "Sign in" until Phase 6 (see Known Issues).

**Next step:**
- **Phase 2 — Admin Panel Core:** admin dashboard counts (done minimally), Genre CRUD, Manga CRUD (TipTap synopsis, cover upload → sharp WebP → storage adapter `src/lib/storage.ts`, slug auto-gen + uniqueness + SlugRedirect on change), Server Actions + Zod, DataTable with search/pagination. Will need: TipTap deps, storage adapter, `src/lib/slug.ts`.

**Build status:** `pnpm build` ✅ · `pnpm lint` ✅ · auth flow ✅ (8/8)

### [2026-07-24] Session 3 — Phase 2 (Admin Manga+Genre CRUD) + PIVOT to Adult Manga Verse
**Completed:**
- **PIVOT** (user directive + `adult-content-platform-builder` skill): reframed to 18+ adult platform. Updated Design.md (navy `#0A192F`/cyan `#00D9FF`, Montserrat/Roboto/Inter, intensity system), Architecture.md (schema+routes), PRD.md, Phases.md.
- Re-themed `globals.css` (cyan/navy tokens + intensity utilities), `layout.tsx` fonts, `site.ts` (Adult Manga Verse), header/footer/auth/homepage buttons → cyan.
- **Age gate** overlay (`AgeGate.tsx`, `useSyncExternalStore` on localStorage `amv_age_verified`, birth-year ≥18, ToS, red warning, under-18 leaves) + site-wide 18+ strip in `(public)/layout`.
- Schema migration 2: `ContentIntensity`, `SubscriptionTier`, `Manga.{intensity,isPremium,contentWarnings}`, `Chapter.isPremium`, `User.{tier,tierUntil}`, `Review` model. Reseeded (7 adult titles w/ intensity/premium/warnings).
- **Phase 2 CRUD:** storage adapter (`lib/storage.ts` local|r2), sharp cover pipeline (`lib/images.ts`), `lib/slug.ts`, `lib/sanitize.ts`; Genre CRUD (create/rename/delete via `GenreManager`); Manga CRUD (create/update/delete/publish server actions, cover→WebP, slug uniqueness + SlugRedirect on change); TipTap synopsis editor; MangaForm (intensity/premium/content-warnings/genres/SEO); admin list (search+pagination+IntensityBadge); new/edit pages.
- **Verified 11/11** (scripted): theme+fonts+18+ strip on `/`; admin list intensity column + seeded titles; new-form content-warnings/premium/intensity; genres admin.

**Files created/changed (highlights):**
- Docs: Design.md, Architecture.md, PRD.md, Phases.md.
- `lib/`: storage.ts, images.ts, slug.ts, sanitize.ts, actions.ts, auth-guards.ts, validators.ts (+manga/genre/intensity), site.ts.
- `actions/`: genres.ts, manga.ts.
- `components/admin/`: styles.ts, GenreManager, MangaRowActions, RichTextEditor, MangaForm.
- `components/public/`: IntensityBadge, AgeGate, SiteHeader/Footer/AuthCard (rebrand).
- `app/admin/manga/{page,new/page,[id]/edit/page}`, `app/admin/genres/page`, `app/globals.css`, `app/layout.tsx`, `app/(public)/layout+page`.

**Assumptions made:**
- Cover pipeline = local disk (`/public/uploads`); R2 in Phase 8. Reviews model added but UI is Phase 5. `@tiptap/extension-link` redundant (StarterKit bundles it).
- Age gate is a client overlay (server renders nothing → no SSR gate; appears post-hydration if unverified).

**Next step:**
- **Phase 3 — Admin Chapters & Page Upload:** Chapter CRUD per manga (decimal number, optional title, `isPremium`, publish/schedule); bulk drag-drop image uploader → sharp WebP + dimensions; page reorder/delete; `revalidateTag` on publish. Needs a page-upload action + client uploader.

**Build status:** `pnpm build` ✅ · `pnpm lint` ✅ · pivot verify ✅ (11/11)

### [2026-07-24] Session 4 — Phase 3 (Admin Chapters & Page Upload) [+ login/sharp fixes]
**Completed:**
- **Fixes (from prior session's "can't sign in"):** auth-aware header (user menu + Sign out; `(public)/layout` passes session to `SiteHeader`); **sharp+Turbopack Windows crash** → `serverExternalPackages:["sharp","@prisma/adapter-pg"]` in next.config.ts. Both verified via Playwright.
- **Phase 3:** `chapterSchema`; `processChapterPage` (WebP, ≤1000px wide, no upscale); chapter actions (create/update/delete — MOD-allowed via `requireStaff`, publish/schedule via `publishedAt`, page-file cleanup on delete); page actions (`uploadChapterPage` per-file for progress, `reorderPages` two-phase offset to dodge unique(chapterId,index), `deletePage`).
- `ChapterManager` (add/edit/list, Draft/Publish-now/Schedule, premium, publish toggle); `PageUploader` (drag-drop, filename-natural-sort, sequential upload + progress bar, native HTML5 drag reorder + up/down buttons, delete); pages `/admin/manga/[id]/chapters` + `/admin/chapters/[id]/pages`; "Chapters" link in manga row actions.
- **E2E verified (Playwright, HTTP-login + injected cookie):** create chapter → upload 3 imgs → WebP in 6.5s → served `200 image/webp` → delete cascades. 20 pages ≈ 40s (< 3-min target ✅).

**Files created/changed:**
- `actions/chapters.ts`, `actions/pages.ts`; `lib/images.ts` (+processChapterPage), `lib/validators.ts` (+chapterSchema).
- `components/admin/ChapterManager.tsx`, `PageUploader.tsx`, `MangaRowActions.tsx` (+Chapters link).
- `app/admin/manga/[id]/chapters/page.tsx`, `app/admin/chapters/[id]/pages/page.tsx`.
- `next.config.ts` (serverExternalPackages), `(public)/layout.tsx` + `SiteHeader.tsx` (auth-aware).

**Assumptions made:**
- Per-file sequential upload (real progress) over one big multipart call. Page delete leaves index gaps (still ordered; reorder normalizes). Native drag reorder (no dnd lib).

**Next step:**
- **Phase 4 — Public site:** Home (hero, category tiles, Trending/Just-Updated grids, subscription CTA), `/browse` (genre/status/intensity/type filters + sort + pagination, URL-driven), `/genre/[slug]`, `/search` + `/api/search`, `MangaCard` (cover, intensity badge, premium lock, rating), skeletons. Age gate + 18+ strip already done.

**Build status:** `pnpm build` ✅ · `pnpm lint` ✅ · Phase 3 E2E ✅

### [2026-07-24] Session 5 — Phase 4 (Public Home / Browse / Search / Genre)
**Completed:**
- `MangaCard` (+skeleton) — cover, type badge (Manga=cyan/Manhwa=purple/Manhua=teal), premium lock, intensity badge, rating; `lib/catalog.ts` (`cardSelect`, `buildMangaWhere`, `buildOrderBy`, `publishedWhere`); `stripHtml` util.
- **Homepage** — `HeroSlider` (client, auto-rotate 6s featured), category tiles, Trending (views), Just Updated (recent published chapters, deduped), New Series (createdAt), `SubscribeCTA`.
- **/browse** — server-rendered; `BrowseFilters` (client, URL-driven, props-based so no Suspense needed): sort/intensity/type/status/premium/genres + mobile toggle + Clear; pagination (24/page).
- **/genre/[slug]** — genre listing + pagination + generateMetadata.
- **/search** — `/api/search` (min DTO, ≥2 chars, top 8 by views) + `SearchBar` (debounced 250ms dropdown, click-outside, Enter→/search) in header (md+; icon link on mobile) + `/search` results page.
- **Verified 14/14** (fetch SSR + Playwright): home sections, browse `intensity=EXTREME` filters correctly, filter-checkbox click updates URL+results, genre, search API + header dropdown (Moonlit Requiem).

**Files:** `components/public/{MangaCard,HeroSlider,SubscribeCTA,BrowseFilters,SearchBar}.tsx`; `lib/catalog.ts`, `lib/utils.ts` (+stripHtml); `app/(public)/{page,browse/page,genre/[slug]/page,search/page}.tsx`; `app/api/search/route.ts`; `SiteHeader.tsx` (+SearchBar).

**Assumptions made:**
- Public pages are SSR/dynamic (layout reads cookies for the auth header) — ISR/caching deferred to Phase 7. Browse filter checkboxes are URL-controlled (flip after server responds — no optimistic state; slight lag, functionally correct). `/manga/[slug]` links 404 until Phase 5.

**Next step:**
- **Phase 5 — Manga detail + reader:** `/manga/[slug]` (info, chapter list, rating widget, view counter, related, content-warning box, reviews, Start/Continue), `/manga/[slug]/[chapter]` (vertical reader, lazy images, paged toggle, prev/next + chapter dropdown, keyboard nav, **premium gating by User.tier** server-checked, progress save localStorage/DB). Add JSON-LD/canonical in Phase 7.

**Build status:** `pnpm build` ✅ · `pnpm lint` ✅ · Phase 4 verify ✅ (14/14)

### [2026-07-25] Session 6 — Phase 5 (Manga Detail + Chapter Reader)
**Completed:**
- Actions: `reader.ts` (recordMangaView/recordChapterView fire-and-forget, saveProgress upsert ReadProgress for logged-in), `reviews.ts` (submitReview upsert + recompute Manga.rating/ratingCount). `reviewSchema`. `lib/access.ts` (`hasPremiumAccess`).
- **/manga/[slug]** — cover, badges (type/intensity/premium/status), stats (Stars/views/chapters), linked genres, content-warning box, sanitized synopsis (dangerouslySetInnerHTML — safe, sanitized on save), chapter list (newest first, NEW pill <48h, premium lock, relative dates via date-fns), reviews (avg + form + list), Similar Titles. `ViewCounter` (once/session via sessionStorage), Start/Continue (`ContinueReadingButton` guest localStorage via useSyncExternalStore; server ReadProgress for logged-in), `ReviewForm` (star input + body).
- **/manga/[slug]/[chapter]** — `ReaderView` (fixed full-viewport overlay covering site chrome, z-50; vertical + paged modes, prev/next + chapter `<select>`, keyboard ←/→, controls hide on scroll-down, progress save on load). **Premium gating** server-checked: `(manga.isPremium || chapter.isPremium) && !hasPremiumAccess(tier)` → `Paywall`; pages NOT queried/sent when locked.
- **Verified E2E 8/8 (Playwright):** detail sections; guest reads free chapter; guest→paywall on premium; VIP→unlocked; page images render; next-chapter nav; continue-reading after progress; review submit+display.

**Files:** `actions/{reader,reviews}.ts`; `lib/access.ts`, `validators.ts` (+reviewSchema); `components/public/{Stars,ViewCounter,ContinueReadingButton,ReviewForm,ReaderView,Paywall}.tsx`; `app/(public)/manga/[slug]/{page,[chapter]/page}.tsx`.

**Assumptions made:**
- Reader is a fixed overlay (covers header/footer) rather than a separate route group — immersive without restructuring routing. Chapter matched by Decimal `number` string param. Brightness/zoom controls from the skill deferred (mode toggle + nav done); can add in Phase 8 polish.

**Next step:**
- **Phase 6 — User features:** Bookmark toggle + `/library` (bookmarks + continue-reading), comments on manga/chapters (PENDING default) + admin moderation queue, user manager (ban/role/**tier**), dashboard upgrade. Then **Phase 6.5** Subscribe page (Free/Premium/VIP + FAQ) wiring tier.

**Build status:** `pnpm build` ✅ · `pnpm lint` ✅ · Phase 5 E2E ✅ (8/8)

### [2026-07-25] Session 7 — Phase 6 (Bookmarks, History, Comments, Moderation, Users)
**Completed:**
- Actions: `bookmarks.ts` (toggleBookmark upsert/delete), `comments.ts` (postComment→PENDING, moderateComment/deleteComment staff-only), `users.ts` (setUserRole/setUserTier/setUserBanned admin-only, self-protection guards). `commentSchema`.
- `BookmarkButton` + `CommentsSection` (public approved-only list + post→"awaiting moderation") on manga detail; detail now also fetches isBookmarked + approved comments.
- **/library** — Continue Reading (ReadProgress → reader links) + Bookmarks grid.
- **/admin/comments** — status tabs (Pending default) + `CommentModeration` (approve/spam/delete).
- **/admin/users** — search + `UserManager` (role/tier/ban selects, can't demote/ban self).
- **Dashboard** upgraded — total views, stat cards link out, pending-comment count, latest comments, recent sign-ups.
- **Verified E2E 8/8:** bookmark→library; comment→moderation (hidden from public)→admin approve→visible publicly; user manager lists + sets tier.

**Files:** `actions/{bookmarks,comments,users}.ts`; `validators.ts` (+commentSchema); `components/public/{BookmarkButton,CommentsSection}.tsx`, `components/admin/{CommentModeration,UserManager}.tsx`; `app/(public)/{manga/[slug]/page,library/page}.tsx`; `app/admin/{page,comments/page,users/page}.tsx`.

**Assumptions made:**
- Comments are manga-level (schema supports chapterId for future). Banned users blocked at login via `authorize` (`user.banned`) — existing JWT sessions persist until expiry (acceptable). Chapter-level comments/comment UI in reader deferred.

**Next step:**
- **Phase 6.5 — Subscribe page:** `/subscribe` with Free/Premium ($9.99)/VIP ($19.99) tier cards (highlight Premium), feature comparison (✓/✗/lock), collapsible FAQ, "Browse Free" CTA. Checkout stubbed (no Stripe); tier is granted via admin user manager. Show current tier if logged in.

**Build status:** `pnpm build` ✅ · `pnpm lint` ✅ · Phase 6 E2E ✅ (8/8)

### [2026-07-25] Session 8 — Phase 6.5 (Subscribe page)
**Completed:**
- `/subscribe` — Free/Premium($9.99, "Most Popular", highlighted)/VIP($19.99) tier cards, feature comparison table (✓/✗/values), native `<details>` FAQ accordion (6 Qs), "Browse Free Content" CTA. Shows the user's current tier + "Current plan"/"Included" states.
- `SubscribeButton` (client) — guest→/login; current tier→"Current plan"; paid choice→stubbed "checkout coming soon" note (no Stripe; tiers granted via admin user manager).
- **Verified 10/10** (fetch guest + logged-in): headings, prices, badge, comparison, FAQ, CTA, current-plan detection.

**Files:** `app/(public)/subscribe/page.tsx`, `components/public/SubscribeButton.tsx`.

**Assumptions made:**
- No real payments (per earlier decision). Tier changes happen in `/admin/users`. FAQ answers note checkout is not enabled yet.

**Next step:**
- **Phase 7 — SEO engine:** `lib/seo.ts` (buildMetadata with Settings template fallbacks; JSON-LD builders: WebSite+SearchAction home, ComicSeries/Book + AggregateRating manga, BreadcrumbList, Chapter/CreativeWork reader), `<StructuredData>` component, dynamic `app/sitemap.ts` + `app/robots.ts`, canonicals + OG/Twitter, `SlugRedirect` 301 in proxy.ts, admin SEO settings + `SeoFields` (Google preview + counters) wired into manga/static-page forms. Retrofit `generateMetadata` across public pages via lib/seo.ts.

**Build status:** `pnpm build` ✅ · `pnpm lint` ✅ · Phase 6.5 verify ✅ (10/10)

### [2026-07-25] Session 9 — Phase 7 (SEO Engine)
**Completed:**
- `lib/settings.ts` (`getSettings` React-cached, code defaults + DB overlay: siteName/titleTemplate/defaultDescription/defaultOgImage/twitterHandle), `lib/seo.ts` (`buildMetadata` → absolute title via settings template, canonical, OG, Twitter, robots; JSON-LD builders `websiteJsonLd`/`breadcrumbJsonLd`/`mangaJsonLd`(+AggregateRating)/`chapterJsonLd`), `components/seo/StructuredData.tsx`.
- Dynamic `app/sitemap.ts` (home/browse/subscribe + published manga/chapters/genres/static pages) + `app/robots.ts` (Disallow /admin,/api,/login,/register,/library,/search + Sitemap).
- Retrofit `generateMetadata` via `buildMetadata` on home/browse/genre/search/manga/reader/subscribe; JSON-LD injected (WebSite home, ComicSeries+Breadcrumb manga, Chapter+Breadcrumb reader, Breadcrumb browse/genre). Per-manga `seoTitle`/`seoDescription` honored.
- **308 slug redirect** in manga detail (SlugRedirect lookup on notFound → `permanentRedirect`).
- Admin `/admin/seo` + `saveSeoSettings` action; `SeoFields` (Google SERP preview + char counters) replaces raw SEO inputs in MangaForm.
- **Verified 18/18** (fetch): canonicals, OG/Twitter, all JSON-LD types, sitemap urls, robots, search noindex, manga indexable, old-slug→308.

**Files:** `lib/{settings,seo}.ts`, `components/seo/StructuredData.tsx`, `components/admin/{SeoFields,SeoSettingsForm}.tsx`, `actions/settings.ts`, `app/{sitemap,robots}.ts`, `app/admin/seo/page.tsx`, retrofits across public pages + MangaForm.

**Assumptions made:**
- Lighthouse not run in this env, but all SEO fundamentals present (unique title/desc, canonical, OG, JSON-LD, sitemap, robots, single h1, alt text). Slug redirect done at page level (`permanentRedirect` 308) instead of edge proxy (proxy is edge-safe, no DB) — same SEO effect.

**Next step:**
- **Phase 8 — Static pages, Settings, polish & launch:** StaticPage manager (About/Contact/DMCA/Privacy/**Content Policy**/Terms with per-page SEO via TipTap) + public `/p/[slug]`; Settings (logo/favicon/socials/analytics snippet/default OG); perf pass (image srcset, caching), `error.tsx`/`not-found.tsx`, empty states, mobile QA; R2 storage switch; Dockerfile/Vercel + README deploy guide. (Static-page links already referenced in footer/age-gate — currently 404.)

**Build status:** `pnpm build` ✅ · `pnpm lint` ✅ · Phase 7 verify ✅ (18/18)

### [2026-07-25] Session 10 — Phase 8 (Static Pages, Settings, Polish & Launch) — FINAL
**Completed:**
- **Static pages:** `staticPageSchema`, `actions/staticpages.ts` (CRUD, sanitized TipTap content, slug uniqueness), `StaticPageForm` + `DeletePageButton`, admin `/admin/pages` (list/new/[id]/edit), public `/p/[slug]` (per-page SEO via buildMetadata). Seed upserts 6 legal pages (about/contact/content-policy/dmca/privacy/terms) — footer/age-gate links now resolve.
- **Polish:** `app/not-found.tsx` (custom 404) + `app/error.tsx` (client error boundary).
- **Settings/analytics:** `analyticsSnippet` setting + `AnalyticsInjector` (client, appends script tags to head) in root layout (now async, `getSettings`); `/admin/settings` page; analytics field in `SeoSettingsForm`.
- **Deploy infra:** R2 storage adapter in `lib/storage.ts` (`aws4fetch`, `STORAGE_DRIVER=r2`, `keyFromUrl` handles R2+local); `next.config.ts` (`output:"standalone"` + R2 image remotePatterns); `Dockerfile` (multi-stage, node:22-bookworm-slim for sharp glibc) + `.dockerignore`; rewrote `README.md` (Vercel+Neon+R2 and Docker deploy guides).
- **Verified 11/11:** all 6 /p/* pages 200, per-page SEO, custom 404, admin pages manager, settings/analytics field, robots.

**Files:** `actions/staticpages.ts`, `validators.ts` (+staticPageSchema), `components/admin/{StaticPageForm,DeletePageButton}.tsx`, `components/public/AnalyticsInjector.tsx`, `app/(public)/p/[slug]/page.tsx`, `app/admin/{pages/*,settings/page}.tsx`, `app/{not-found,error}.tsx`, `app/layout.tsx`, `lib/{storage,settings}.ts`, `next.config.ts`, `Dockerfile`, `.dockerignore`, `README.md`, `prisma/seed.ts`.

**Assumptions made:**
- Docker/R2 not runtime-tested here (no Docker daemon / R2 creds) — written as standard configs; R2 adapter behind `STORAGE_DRIVER=r2`, default stays local disk. Logo/favicon upload deferred (analytics + SEO defaults cover the Settings brief). `/admin/seo` and `/admin/settings` both render the global settings form.

### [2026-07-25] Post-launch tweaks
- **Server Action body limit:** cover/page uploads hit Next's default 1MB Server Action limit → `experimental.serverActions.bodySizeLimit` in next.config (now **25mb** for images + PDFs). This was a real bug report ("creating manga gives error").
- **Richer legal pages:** rewrote seed `STATIC_PAGES` (About/Contact/Content-Policy/DMCA/Privacy/Terms) with complete templated content; seed upsert now UPDATES existing pages (`update: {title, contentHtml}`). Reseed to refresh.
- **Genres nav dropdown:** `(public)/layout` fetches genres → `SiteHeader` renders a desktop **Genres** dropdown (2-col) + mobile drawer chips → `/genre/[slug]`.
- **Unified manga editor + PDF upload:** `/admin/manga/[id]/edit` now shows MangaForm **+ ChapterManager** (add chapters + expand **Pages** inline per chapter via `ChapterPagesInline` → `getChapterPages` + `PageUploader`). Create redirects to the editor; edit stays (shows "Saved"). **PageUploader accepts PDFs** → `uploadChapterPdf` (pdf-to-img → `@napi-rs/canvas`, split each page → sharp WebP). Deps: `pdf-to-img` (+pdfjs-dist, @napi-rs/canvas). Externalized all three in next.config (native/ESM). Verified E2E 4/4 (create→editor, inline uploader, images + PDF → 4 pages). MangaForm genre section also got an **inline "add new genre"** (createGenre returns the created genre).

### [2026-07-25] More tweaks
- **Red & black theme:** replaced navy/cyan palette in globals.css (primary `#E11D2E`, bg `#0A0A0C`, white on red); sed-swapped 15 cyan glow shadows + 1 indigo → red; enriched HeroSlider backdrop (red glow orbs + directional gradient, removed saturation boost). Recolored seed `COVER_COLORS` to red/dark (blue placeholder covers were showing in hero) + reseeded.
- **Author link + ownership:** migration 3 `manga_author_link` → `Manga.authorLink String?`. Wired through validators (http(s) regex), manga action, MangaForm field, edit-page initial. Detail page shows a "This content isn't owned by us — Support {author}" external link (nofollow) when set. Removed "Age representation" section from Content Policy (nowhere else); reworded About + Content Policy to "we don't own content; creators credited + linked to support." Seeded 2 demo author links.
- **DB migrations: now 3.**

### [2026-07-25] Membership model change — NO exclusive content
- User decision: **all manga are free to read for everyone**; tiers differ only by ads / offline reading (on-site, no downloads) / early access / resolution — NOT content access.
- Removed the reader paywall (deleted `Paywall.tsx`; reader no longer checks tier/isPremium). Removed premium-lock UI from MangaCard, HeroSlider, manga detail (badge+cover lock+chapter locks), admin manga list crown, ChapterManager (premium checkbox+crown → isPremium always false), MangaForm (premium toggle), browse "Premium only" filter, home "Premium Only" tile → "Top Rated".
- `Manga.isPremium`/`Chapter.isPremium` columns kept (unused now) — no migration to drop. `lib/access.ts`/`hasPremiumAccess` now unused.
- Reworked `/subscribe`: tiers/comparison/FAQ to ads/offline/early-access/resolution; header "Every title is free to read for everyone." FAQ explicitly says paid plans don't unlock exclusive content. SubscribeCTA copy updated.
- **Payments:** still stubbed. NOTE for future: mainstream processors (Stripe/PayPal) prohibit adult content — must use adult-friendly billing (CCBill, Segpay, Verotel, Vendo, Epoch, NETbilling).

**PROJECT COMPLETE (Phases 0–8).** Remaining = actual production deploy (env + `prisma migrate deploy` + R2 bucket) and optional later phases (P9 OAuth, P10 notifications, P11 real Stripe, P12 PWA).

**Build status:** `pnpm build` ✅ · `pnpm lint` ✅ · Phase 8 verify ✅ (11/11)
