# Architecture.md — MangaBlue Clone

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | SSR/SSG for SEO, API routes, image optimization built-in |
| Language | TypeScript | Safety, better AI-assisted coding |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, matches modern dark UI |
| Database | **PostgreSQL** via **Prisma ORM** | Relational fits manga→chapters→pages; Prisma = typed queries |
| Auth | **Auth.js (NextAuth v5)** — Credentials provider, JWT sessions | Simple, role support |
| File Storage | Local `/public/uploads` in dev → **S3-compatible (Cloudflare R2)** in prod via storage adapter | Cheap, CDN-friendly |
| Image Processing | `sharp` (server-side WebP conversion + resize on upload) | Performance |
| Rich Text | TipTap (admin static pages/synopsis) | Sanitizable |
| Validation | Zod (shared schemas client+server) | Single source of truth |
| Caching | Next.js route cache + `revalidateTag` on publish | Fresh + fast |
| Deployment | VPS (Docker) or Vercel + Neon Postgres + R2 | Flexible |

---

## 2. High-Level Flow

```
Reader Browser
   │  (SSR HTML + cached WebP images)
   ▼
Next.js App (App Router)
   ├── Public routes (SSR/ISR) ──► Prisma ──► PostgreSQL
   ├── /api/* route handlers (search, views, bookmarks, comments)
   └── /admin (role-gated) ──► Server Actions ──► Prisma + Storage Adapter ──► R2/local
                                        │
                                        └─► revalidateTag() → sitemap regen → cache purge
```

**Chapter publish flow:** Admin uploads images → sharp converts to WebP + generates widths → files stored → `Page` rows created in order → chapter published → `revalidateTag('manga:{slug}')` → sitemap updated.

**SEO render flow:** Every public route uses `generateMetadata()` reading: per-entity SEO override → else auto-template from Settings. JSON-LD injected via a `<StructuredData>` component.

---

## 3. Database Schema (Prisma models)

> **18+ adult platform (pivot 2026-07-24).** Added: content-intensity levels,
> premium/subscription gating, per-manga content warnings, community reviews.
> Payments are stubbed for now (no Stripe) — `User.tier` is set manually/by a
> future checkout. All content depicts adults (18+); nothing involving minors.

```
User        (id, email, passwordHash, name, role[USER|MOD|ADMIN], banned,
             tier[FREE|PREMIUM|VIP], tierUntil?, createdAt)
Manga       (id, title, slug, altTitles[], synopsis, coverUrl, author, artist,
             status[ONGOING|COMPLETED|HIATUS], type[MANGA|MANHWA|MANHUA],
             intensity[MODERATE|HIGH|VERY_HIGH|EXTREME], isPremium, contentWarnings[],
             releaseYear, rating, ratingCount, views, featured, published,
             seoTitle?, seoDescription?, ogImage?, createdAt, updatedAt)
Genre       (id, name, slug)          — M:N with Manga
Chapter     (id, mangaId, number(Decimal), title?, isPremium, views, publishedAt?, createdAt)
Page        (id, chapterId, index, imageUrl, width, height)
Bookmark    (userId, mangaId, createdAt)
ReadProgress(userId, mangaId, chapterId, updatedAt)
Review      (id, mangaId, userId, rating(1-5), body, createdAt)  — unique(mangaId,userId)
Comment     (id, userId, mangaId?, chapterId?, body, status[PENDING|APPROVED|SPAM], createdAt)
StaticPage  (id, slug, title, contentHtml, seoTitle?, seoDescription?)
Setting     (key, value)              — site name, logo, defaults, SEO templates, robots.txt
SlugRedirect(oldSlug, newSlug, entity)

enums: Role, MangaStatus, MangaType, CommentStatus,
       ContentIntensity[MODERATE|HIGH|VERY_HIGH|EXTREME], SubscriptionTier[FREE|PREMIUM|VIP]
```

**Access gating:** premium manga/chapters are readable only when
`session.user.tier ∈ {PREMIUM, VIP}` (VIP also unlocks VIP-only content later).
Gating is re-checked server-side in the reader route + page API — never trusted
from the client.

---

## 4. Folder Structure

```
mangablue/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx                    # Homepage
│   │   │   ├── browse/page.tsx             # Directory + filters
│   │   │   ├── search/page.tsx
│   │   │   ├── genre/[slug]/page.tsx
│   │   │   ├── manga/[slug]/page.tsx       # Manga detail
│   │   │   ├── manga/[slug]/[chapter]/page.tsx  # Reader (premium-gated)
│   │   │   ├── subscribe/page.tsx          # Free/Premium/VIP tiers + FAQ
│   │   │   ├── p/[slug]/page.tsx           # Static pages (Terms, Privacy, Content Policy, DMCA)
│   │   │   ├── login/page.tsx  register/page.tsx
│   │   │   └── library/page.tsx            # Bookmarks/history (auth)
│   │   ├── components/public/AgeGate.tsx   # 18+ overlay (localStorage amv_age_verified), in root layout
│   │   ├── admin/
│   │   │   ├── layout.tsx                  # Role guard + sidebar
│   │   │   ├── page.tsx                    # Dashboard
│   │   │   ├── manga/  (list, new, [id]/edit, [id]/chapters)
│   │   │   ├── chapters/[id]/pages/        # Page upload/reorder
│   │   │   ├── genres/ users/ comments/ pages/ seo/ settings/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── search/route.ts
│   │   │   ├── views/route.ts
│   │   │   ├── bookmarks/route.ts
│   │   │   └── comments/route.ts
│   │   ├── sitemap.ts                      # Dynamic sitemap.xml
│   │   ├── robots.ts
│   │   └── layout.tsx                      # Root: theme, fonts, analytics
│   ├── components/
│   │   ├── public/   (MangaCard, ChapterList, ReaderView, SearchBar, HeroSlider…)
│   │   ├── admin/    (DataTable, ImageUploader, SeoFields, RichTextEditor…)
│   │   ├── seo/StructuredData.tsx
│   │   └── ui/       (shadcn)
│   ├── lib/
│   │   ├── db.ts prisma singleton
│   │   ├── auth.ts
│   │   ├── storage.ts        # adapter: local | r2
│   │   ├── images.ts         # sharp pipeline
│   │   ├── seo.ts            # metadata builders + JSON-LD builders
│   │   ├── slug.ts  validators.ts (zod)  utils.ts
│   ├── actions/              # Server Actions (admin mutations)
│   └── types/
├── .env.example
├── Rules.md  PRD.md  Architecture.md  Phases.md  Design.md  Memory.md
└── package.json
```

---

## 5. Routing & Caching Strategy

| Route | Rendering | Cache |
|---|---|---|
| `/` | ISR, revalidate 300s + tag `home` | High traffic |
| `/manga/[slug]` | ISR + tag `manga:{slug}` | Purged on edit |
| `/manga/[slug]/[chapter]` | ISR + tag | Purged on publish |
| `/browse`, `/search` | SSR (dynamic filters) | Short cache |
| `/admin/*` | Dynamic, no cache | Auth-gated |

## 6. Security Boundaries

- Middleware: `/admin/*` requires session.role ∈ {ADMIN, MOD}; MOD limited to comments/chapters.
- All mutations via Server Actions with Zod validation + role re-check server-side.
- Uploads: MIME + magic-byte check, max 10MB/image, sharp re-encode (strips payloads).
- Rich text sanitized with a strict allowlist before storage.
