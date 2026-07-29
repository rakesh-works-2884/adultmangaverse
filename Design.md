# Design.md — Adult Manga Verse Visual System

Premium **18+ adult manga** platform. Immersive **black** backgrounds, vivid **red** accents, glassy cards, high-contrast covers as the visual hero, and a color-coded **content-intensity** system. Dark-only.

> Theme: **red & black** (2026-07-25, user request). Core: bg `#0A0A0C`, surface `#1A1A20`, primary red `#E11D2E`, text `#ECECEF`, muted `#9494A0`, highlight `#FF6273`. (Superseded the earlier navy/cyan and blue/Poppins themes.)

---

## 1. Color Palette (CSS variables → Tailwind v4 `@theme`)

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#0A192F` | Page background (deep navy) |
| `--bg-soft` | `#0E2038` | Section backgrounds |
| `--surface` | `#112240` | Cards, panels (slate) |
| `--surface-hover` | `#1C3557` | Card hover |
| `--border` | `#233554` | Card/input borders (subtle) |
| `--primary` | `#00D9FF` | Cyan — buttons, links, active states, premium |
| `--primary-hover` | `#22C3E6` | Button hover |
| `--primary-foreground` | `#04121F` | Text ON cyan (dark, for contrast) |
| `--highlight` | `#67E8F9` | Highlights, hover text, badges |
| `--glow` | `#00D9FF` @ 20% | Soft cyan glows behind hero/featured/cards |
| `--text` | `#CCD6F6` | Primary text (light gray) |
| `--text-muted` | `#8892B0` | Secondary text, dates, meta |
| `--success` | `#16A34A` | "Completed" status, checkmarks |
| `--warning` | `#EAB308` | "Hiatus", ratings stars |
| `--danger` | `#DC2626` | Age-gate/warnings, 18+ text, delete |

**Content-intensity colors** (color **and** always paired with a text label — color-blind safe):

| Level | Hex | Meaning |
|---|---|---|
| `--intensity-extreme` | `#DC2626` (red) | Most explicit |
| `--intensity-very-high` | `#EA580C` (orange) | Highly explicit |
| `--intensity-high` | `#EAB308` (yellow) | Moderate explicit |
| `--intensity-moderate` | `#16A34A` (green) | Mild |

Gradients: hero overlay `linear-gradient(180deg, rgba(0,0,0,.8), rgba(0,0,0,.4), transparent)`; primary CTA `linear-gradient(135deg, #00D9FF, #3B82F6)`; card-hover glow `0 0 20px rgb(0 217 255 / 0.2)`.

## 2. Typography

- **Display / Headings:** `Montserrat` (700 display, 600 section) — bold, geometric.
- **Body:** `Roboto` (400/500) — clean, readable.
- **Buttons / UI:** `Inter` (600) — CTAs, controls.
- Load all three via `next/font/google`, `display: swap`.

| Element | Size / Weight / Font |
|---|---|
| H1 (hero/page title) | 28–44px / 700 / Montserrat |
| H2 (section: "Trending This Week") | 20–28px / 600 / Montserrat, with 3px cyan left-bar or underline |
| Card title | 14–15px / 600 / Montserrat, 2-line clamp |
| Body | 15–16px / 400 / Roboto, line-height 1.7 |
| Buttons | 14px / 600 / Inter |
| Meta (dates, chapter no.) | 12–13px / 500 / Roboto, `--text-muted` |

## 3. Layout & Components

- **Container:** max-w-7xl, px-4 (mobile) → px-6.
- **18+ header strip:** thin bar, `--danger` text on a subtle red tint — "18+ Adults Only — all characters are 18 or older" — visible site-wide.
- **Header:** sticky, `--bg`/80 backdrop-blur; logo left (cyan "18" badge + wordmark), center nav (Home, Browse, Subscribe), right: search + premium badge + favorites + profile/auth. Mobile: hamburger drawer with the 18+ warning.
- **Age Gate:** full-screen centered modal (blocks first visit): cyan "18" logo, birth-year (YYYY) input, ToS checkbox, red-bordered explicit-content warning box, two buttons — "I'm under 18" (leaves the site) and "I'm 18 or older" (disabled until valid). Persists `amv_age_verified=true` in localStorage.
- **Intensity badge:** pill, `intensity-{level}` tint (bg 20% / text / border 30%), always shows the label text.
- **Premium lock:** `absolute top-2 right-2`, `bg-black/60 backdrop-blur` rounded, cyan lock icon; overlays covers for premium titles.
- **Manga cards:** 2:3 cover, rounded-lg, hover: `scale-[1.03]` + cyan glow + reveal latest chapter; top-left type badge, top-right premium lock, bottom rating ★ + intensity badge.
- **Grids:** 2-col mobile → 3 (md) → 4–5 (lg) browse; home sections 2→6 col.
- **Hero:** 500–600px, blurred cover bg + bottom-up black gradient, foreground cover + title + intensity/premium badges + "Begin Reading" / "Add to Library".
- **Chapter list:** rows on `--surface`, hover `--surface-hover`, chapter number bold cyan, date muted; "NEW" pill < 48h; premium chapters show a lock.
- **Reader:** pure black bg `#000`, centered max-w-3xl images, floating controls bar (`bg-black/80 backdrop-blur`) — prev / chapter select / next / brightness / zoom / mode toggle / fullscreen / exit — auto-hides after 3s, reappears on click.
- **Subscribe:** three tier cards (Free / **Premium $9.99** highlighted with cyan border+glow+scale / VIP $19.99), feature comparison (green ✓ / red ✗ / cyan lock), collapsible FAQ.
- **Content-warning box:** red-tinted border box listing warnings on detail pages.
- **Buttons:** primary = cyan (`--primary`) with `--primary-foreground` dark text + hover glow; secondary = transparent + cyan border; all 150ms ease; active `scale(0.97)`.
- **Admin panel:** same dark tokens, denser spacing, 240px sidebar, cyan accents; visually consistent with the public site.

## 4. Effects & Motion

- Shadows: cards `0 4px 24px rgb(0 0 0 / 0.4)`; hover adds `0 0 20px rgb(0 217 255 / 0.2)`.
- Entrance: fade-in-up 150–200ms; hover scale 1.03/1.05; button press scale 0.97; stagger grids 30–50ms.
- Transitions ≤ 200ms; skeleton shimmer; respect `prefers-reduced-motion`.

## 5. Iconography & Imagery

- Icons: `lucide-react` only, 1.5px stroke, 18–20px.
- Covers always 2:3, `object-cover`, blur-up placeholder.
- Empty states: cyan line-art + muted text.

## 6. Responsive Rules

- Mobile-first. Reader controls thumb-reachable (bottom).
- Touch targets ≥ 44px. No horizontal scroll except intentional carousels.
- Test at 375px, 768px, 1024px, 1280px.
