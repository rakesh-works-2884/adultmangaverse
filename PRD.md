# PRD.md — Project Requirements Document
## Project: Adult Manga Verse — Premium 18+ Adult Manga Platform

> **Pivot 2026-07-24:** Reframed from "MangaBlue" into an **18+ adult manga
> platform** per the `adult-content-platform-builder` skill. Same Next.js/Prisma
> foundation; adds age verification, content-intensity levels, premium/subscription
> tiers (UI + gating; real payments deferred), and adult-specific legal compliance.

---

## 1. Overview

A modern, fast, SEO-optimized **18+ adult manga** platform. Adults verify their age, then browse, search, and read adult manga chapters online, with a color-coded content-intensity system and premium/subscription gating. A full-featured **Admin Panel** lets the operator manage all content (manga, chapters, pages, genres, intensity, premium flags, users, SEO) without touching code.

> **Legal / safety notes:**
> - **Adults only, adults only.** The platform is strictly 18+ and all content must depict adults (18 or older). Nothing involving minors — ever.
> - Mandatory age verification gate on first visit; 18+ warnings site-wide; content warnings on explicit material; Terms/Privacy/Content-Policy/DMCA pages.
> - The platform must only host content the operator owns, has licensed, or that is freely distributable. It is a CMS/reader — content responsibility lies with the operator.

---

## 2. Goals

- Deliver a fast, mobile-first manga reading experience with a premium dark-blue aesthetic.
- Give the admin complete control: add/edit/delete manga, upload chapters, manage genres, moderate comments, and edit per-page SEO.
- Achieve strong on-page SEO (unique meta titles/descriptions, OpenGraph, JSON-LD structured data, sitemaps) for every page type.
- Keep infrastructure cheap and simple to deploy (single VPS or serverless).

## 3. Non-Goals (v1)

- No mobile apps (responsive web only).
- **No real payment processing yet** — subscription tiers + premium gating are built as UI + access control; checkout is stubbed (Stripe deferred to a later phase).
- No scanlation team workflow tools (multi-editor pipelines).
- No official licensing/API integrations with publishers.

## 3b. Adult-platform features (pivot)

- **Age verification gate:** full-screen overlay on first visit — birth-year (must be ≥ 18), Terms checkbox, explicit-content warning; "under 18" leaves the site; verified state persisted in `localStorage` (`amv_age_verified`). 18+ warning strip shown site-wide.
- **Content-intensity system:** every manga tagged MODERATE / HIGH / VERY_HIGH / EXTREME, shown as a color+label badge; browse filters by intensity.
- **Content warnings:** per-manga list, surfaced in a warning box on the detail page.
- **Premium & subscriptions:** manga/chapters can be flagged premium; Free/Premium ($9.99)/VIP ($19.99) tiers on a Subscribe page with feature comparison + FAQ; premium content gated by `User.tier` (server-checked). Checkout stubbed for now.
- **Community reviews:** star rating + text review per user per manga on the detail page.
- **Adult legal pages:** Terms, Privacy, Content Policy, DMCA — editable from admin.

---

## 4. Target Users

| User | Description | Needs |
|---|---|---|
| **Reader (guest)** | Casual visitor from Google/social | Fast pages, easy reading, no login required to read |
| **Reader (registered)** | Returning fan | Bookmarks, reading history, "continue reading", comments |
| **Admin (you)** | Site owner | Full CMS: content, users, comments, SEO, analytics |

---

## 5. Core Features

### 5.1 Public Site (Reader-facing)

1. **Homepage**
   - Hero/featured slider (admin-curated)
   - Trending / Popular Today section
   - Latest Updates grid (recently added chapters)
   - New Series section
   - Genre quick links
2. **Browse / Directory Page**
   - Filter by genre, status (ongoing/completed), type (manga/manhwa/manhua), year
   - Sort by: latest update, popularity (views), rating, A–Z
   - Paginated grid with cover, title, latest chapter, rating
3. **Search**
   - Instant search (debounced) with title + alt-title matching
   - Full search results page
4. **Manga Detail Page**
   - Cover, title, alternative titles, author, artist, status, type, release year
   - Genres (linked), synopsis, rating (user votes), view count
   - Full chapter list (newest first) with upload dates
   - Bookmark button, "Start Reading" / "Continue Reading"
   - Related/similar manga
   - Comments section
5. **Chapter Reader Page**
   - Vertical long-strip reading (default) + paged mode toggle
   - Prev/Next chapter navigation (top + bottom), chapter dropdown selector
   - Lazy-loaded, optimized images (WebP)
   - Keyboard navigation (←/→), remembers reading position
   - Reading progress auto-saved (localStorage for guests, DB for users)
6. **User Accounts**
   - Email/password registration + login (optional OAuth later)
   - Bookmarks/library page, reading history
   - Comment posting (with moderation)
7. **Static Pages** — About, Contact, DMCA, Privacy Policy, Terms (all editable from admin)

### 5.2 Admin Panel (`/admin`)

1. **Dashboard** — stats: total manga, chapters, users, views today/week, latest comments
2. **Manga Manager** — CRUD: title, slug, alt titles, cover upload, synopsis, author, artist, status, type, year, genres, featured flag
3. **Chapter Manager** — per manga: add chapter (number, title), bulk image upload (drag-drop, auto-ordered, auto-compressed to WebP), reorder pages, schedule/publish
4. **Genre/Taxonomy Manager** — CRUD genres and types
5. **User Manager** — list, search, ban/unban, role assignment (admin/moderator/user)
6. **Comment Moderation** — approve/delete/spam queue
7. **Pages Manager** — edit static pages (rich text)
8. **SEO Manager** *(critical)* —
   - Global defaults: site title template, default meta description, default OG image
   - **Per-manga SEO override**: meta title, meta description, OG image, canonical URL
   - Auto-generated fallbacks: e.g. `Read {Manga Title} Manga Online — All Chapters | {SiteName}`
   - Auto sitemap.xml (manga, chapters, pages) + robots.txt editor
   - JSON-LD auto-injected: `Book`/`ComicSeries` on manga pages, `BreadcrumbList` everywhere, `WebSite` + SearchAction on home
9. **Settings** — site name, logo, favicon, social links, ads slots (optional), analytics code injection

---

## 6. Functional Requirements Summary

- FR-1: All public pages server-rendered (SSR/SSG) for SEO.
- FR-2: Every page has unique, admin-controllable `<title>` and `<meta description>`.
- FR-3: Images served in WebP with width-appropriate srcsets; chapter images lazy-loaded.
- FR-4: Admin routes protected by role-based auth; public API rate-limited.
- FR-5: Slugs auto-generated from titles, editable, unique, redirect on change (301).
- FR-6: View counter per manga + per chapter (debounced/unique-ish per session).
- FR-7: Sitemap regenerates on content publish.

## 7. Non-Functional Requirements

- **Performance:** LCP < 2.5s on 4G; chapter images progressive; CDN/cache headers.
- **SEO:** Lighthouse SEO score ≥ 95 on all page types.
- **Security:** hashed passwords (bcrypt/argon2), CSRF protection, sanitized rich text, upload validation (type/size), admin 2FA optional.
- **Scalability:** image storage abstracted (local disk → S3-compatible switchable).
- **Accessibility:** semantic HTML, alt text on covers, keyboard-navigable reader.

## 8. Success Metrics

- Organic impressions/clicks growth (Search Console)
- Avg. chapters read per session ≥ 2
- Admin can publish a new chapter (20 pages) in under 3 minutes
