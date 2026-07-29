# Phases.md — Build Plan (one phase per session)

Each phase ends with: `pnpm build` passes, `pnpm lint` clean, Memory.md updated. Do not start the next phase until the previous is ✅.

> **Adult-platform pivot (2026-07-24)** — folded into existing phases:
> - **Theme/schema (start of Phase 2 continuation):** re-theme to navy/cyan + Montserrat/Roboto/Inter; add `ContentIntensity`, `isPremium`, `contentWarnings`, `User.tier`, `Review`.
> - **Phase 2:** manga form gains intensity, premium, content-warnings fields; IntensityBadge.
> - **Phase 4 (Home/Browse):** **Age Gate overlay** + site-wide 18+ strip; intensity filter; category tiles; premium-lock on cards; MangaCard.
> - **Phase 5 (Detail/Reader):** content-warning box, community reviews, **premium gating** (server-checked by `User.tier`); reader brightness/zoom/mode controls.
> - **Phase 6.5 (new) — Subscribe & tiers:** `/subscribe` (Free/Premium/VIP + comparison + FAQ), premium gating end-to-end, admin sets `User.tier`. Real Stripe deferred.
> - **Phase 8:** adult legal pages (Terms, Privacy, Content Policy, DMCA).

---

## Phase 0 — Project Bootstrap
- Init Next.js 14 (App Router, TS strict, Tailwind, pnpm), install shadcn/ui, Prisma, Auth.js, Zod, sharp.
- Set up `src/` structure per Architecture.md, `.env.example`, Prisma connected to Postgres.
- Root layout with dark theme tokens from Design.md, fonts loaded via `next/font`.
- Placeholder homepage rendering "MangaBlue" shell (header, footer, nav).
**Done when:** app runs, DB connects, dark theme visible.

## Phase 1 — Database, Auth & Roles
- Full Prisma schema (all models from Architecture.md) + first migration + seed script (6–8 dummy manga, genres, 2 chapters each with placeholder images, 1 admin user).
- Auth.js credentials login/register, argon2 hashing, JWT session with role.
- Middleware protecting `/admin/*` (ADMIN/MOD only) and `/library` (logged in).
- Login/Register pages styled per Design.md.
**Done when:** can register, log in, admin user reaches empty `/admin`.

## Phase 2 — Admin Panel Core (Manga + Genre CRUD)
- Admin layout: sidebar, topbar, dashboard with basic counts.
- Genre CRUD.
- Manga CRUD: form (title, alt titles, synopsis via TipTap, author, artist, status, type, year, genres multi-select, featured, published toggle), cover upload → sharp → WebP → storage adapter, slug auto-gen + uniqueness + SlugRedirect on change.
- Server Actions + Zod for everything; DataTable with search/pagination.
**Done when:** full manga lifecycle manageable from admin.

## Phase 3 — Admin Chapters & Page Upload
- Chapter CRUD per manga (number as decimal for 10.5-style extras, optional title, publish now/schedule).
- Bulk image uploader: drag-drop multi-file, client preview, ordered by filename, server converts to WebP + stores dimensions, progress UI.
- Page reorder (drag) + delete; republish triggers `revalidateTag`.
**Done when:** a 20-page chapter can be published in < 3 minutes.

## Phase 4 — Public Site: Home, Browse, Search, Genre
- Homepage: hero slider (featured), Trending (views), Latest Updates, New Series, genre links.
- `/browse` with filters (genre/status/type/year), sorts, pagination (URL-driven state).
- `/genre/[slug]`, `/search` page + `/api/search` instant search in header.
- MangaCard component, skeleton loaders, responsive grid.
**Done when:** all listing pages work against seed data.

## Phase 5 — Manga Detail + Chapter Reader
- `/manga/[slug]`: full info, chapter list (newest first), rating widget, view counter, related manga, Start/Continue Reading.
- `/manga/[slug]/[chapter]`: vertical reader, lazy images, paged-mode toggle, prev/next + chapter dropdown, keyboard nav, progress save (localStorage guests / DB users via `/api` on auth).
**Done when:** end-to-end reading flow is smooth on mobile + desktop.

## Phase 6 — User Features: Bookmarks, History, Comments
- Bookmark toggle + `/library` (bookmarks + continue-reading list).
- Comments on manga + chapters (auth required), PENDING by default.
- Admin: comment moderation queue, user manager (ban/role), dashboard upgraded (views today/week, latest comments).
**Done when:** reader accounts feel complete; moderation works.

## Phase 7 — SEO Engine (deep pass)
- `lib/seo.ts`: metadata builders with template fallbacks from Settings; per-manga/per-static-page SEO override fields wired into admin (SeoFields component with Google-style preview + character counters).
- JSON-LD: WebSite+SearchAction (home), ComicSeries/Book + AggregateRating (manga), Chapter/CreativeWork (reader), BreadcrumbList (all).
- Dynamic `sitemap.ts` (split indexes if large) + `robots.ts` (editable base rules in Settings).
- Canonicals, OG/Twitter cards, 301 middleware for SlugRedirect, admin SEO settings page.
**Done when:** Lighthouse SEO ≥ 95 on home, browse, manga, chapter pages; rich-results test passes.

## Phase 8 — Static Pages, Settings, Polish & Launch
- StaticPage manager (About/Contact/DMCA/Privacy/Terms) with per-page SEO.
- Settings page: site name, logo, favicon, socials, analytics snippet, default OG image.
- Performance pass: image sizes/srcset audit, route caching, error/404 pages, empty states, mobile QA.
- Production Dockerfile (or Vercel config), R2 storage switch, README deploy guide.
**Done when:** production build deployed and admin-operable end to end.

---

### Later / Optional Phases
- P9: OAuth (Google), email verification & password reset
- P10: Notifications ("new chapter" for bookmarked manga)
- P11: Ad slots / premium subscriptions
- P12: PWA + offline reading
