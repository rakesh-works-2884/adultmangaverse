import "dotenv/config";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
// Seed scripts are the sanctioned exception to Rules.md §2 (no PrismaClient
// outside src/lib/db.ts): this is a one-off CLI script, not app runtime.
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "seed");
// Chapter pages are "protected" storage (src/lib/storage.ts) — outside
// /public, only ever reachable through a signed /api/img URL. Covers stay
// public. Mirrors storage.ts's PROTECTED_ROOT convention without importing
// app code into this standalone script (Rules.md §2 exception, see below).
const PROTECTED_ROOT = path.join(process.cwd(), "storage-uploads", "seed");

// Red/black-family gradients so placeholder covers match the theme.
const COVER_COLORS = [
  ["#1a0a0c", "#dc2626"],
  ["#450a0a", "#b91c1c"],
  ["#3f0d12", "#e11d48"],
  ["#500724", "#be123c"],
  ["#7f1d1d", "#ef4444"],
  ["#111114", "#e11d2e"],
  ["#631212", "#f43f5e"],
];

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Render an SVG to WebP on disk and return its dimensions. */
async function writeImage(svg: string, w: number, h: number, outPath: string) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(outPath);
  return { width: w, height: h };
}

async function makeCover(slug: string, title: string, type: string, colorIdx: number) {
  const w = 512;
  const h = 768;
  const [c1, c2] = COVER_COLORS[colorIdx % COVER_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <rect x="16" y="16" width="${w - 32}" height="${h - 32}" fill="none" stroke="#ffffff33" stroke-width="2" rx="12"/>
    <text x="50%" y="46%" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="40" font-weight="700" fill="#ffffff">${esc(title)}</text>
    <text x="50%" y="54%" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="20" fill="#e5eaf3cc">${esc(type)}</text>
  </svg>`;
  const outPath = path.join(UPLOAD_ROOT, slug, "cover.webp");
  await writeImage(svg, w, h, outPath);
  return `/uploads/seed/${slug}/cover.webp`;
}

async function makePage(slug: string, chNum: number, idx: number, title: string) {
  const w = 800;
  const h = 1200;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="#070b14"/>
    <rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="#111a2e" stroke="#243350" stroke-width="2" rx="8"/>
    <text x="50%" y="40%" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="48" font-weight="700" fill="#3b82f6">${esc(title)}</text>
    <text x="50%" y="50%" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="30" fill="#e5eaf3">Chapter ${chNum}</text>
    <text x="50%" y="56%" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="26" fill="#8a97ae">Page ${idx}</text>
  </svg>`;
  const key = `seed/${slug}/c${chNum}-p${idx}.webp`;
  const outPath = path.join(PROTECTED_ROOT, slug, `c${chNum}-p${idx}.webp`);
  await writeImage(svg, w, h, outPath);
  return key; // bare storage key — signed on read, same as real uploads
}

const GENRES = [
  "Action", "Adventure", "Fantasy", "Romance", "Drama", "Supernatural",
  "Sci-Fi", "Martial Arts", "Slice of Life", "Comedy", "Horror", "Mystery",
];

type MangaSeed = {
  title: string;
  slug: string;
  type: "MANGA" | "MANHWA" | "MANHUA";
  status: "ONGOING" | "COMPLETED" | "HIATUS";
  intensity: "MODERATE" | "HIGH" | "VERY_HIGH" | "EXTREME";
  isPremium: boolean;
  contentWarnings: string[];
  year: number;
  genres: string[];
  featured: boolean;
  author: string;
  authorLink?: string;
  synopsis: string;
  rating: number;
  ratingCount: number;
  views: number;
};

// Placeholder adult titles for a testable UI. Covers/pages are generated
// locally (no external content). All characters are adults (18+).
const MANGA: MangaSeed[] = [
  { title: "Azure Nights", slug: "azure-nights", type: "MANHWA", status: "ONGOING", intensity: "HIGH", isPremium: false, contentWarnings: ["Explicit sexual content", "Strong language"], year: 2021, genres: ["Romance", "Drama"], featured: true, author: "K. Mori", authorLink: "https://example.com/creators/k-mori", synopsis: "Two rival nightclub owners keep crossing lines they swore they never would.", rating: 4.6, ratingCount: 1280, views: 98230 },
  { title: "Moonlit Requiem", slug: "moonlit-requiem", type: "MANHWA", status: "ONGOING", intensity: "VERY_HIGH", isPremium: true, contentWarnings: ["Explicit sexual content", "Supernatural themes"], year: 2022, genres: ["Romance", "Drama", "Supernatural"], featured: true, author: "Yuna Seo", authorLink: "https://example.com/creators/yuna-seo", synopsis: "A grieving cellist strikes a bargain with a moon spirit — every night comes at a price.", rating: 4.8, ratingCount: 2040, views: 152900 },
  { title: "Neon Afterhours", slug: "neon-afterhours", type: "MANGA", status: "COMPLETED", intensity: "MODERATE", isPremium: false, contentWarnings: ["Suggestive themes"], year: 2019, genres: ["Drama", "Slice of Life"], featured: false, author: "R. Tanaka", synopsis: "In a rain-soaked megacity, two coworkers keep meeting on the last train home.", rating: 4.3, ratingCount: 860, views: 64110 },
  { title: "Crimson Vineyard", slug: "crimson-vineyard", type: "MANHUA", status: "ONGOING", intensity: "EXTREME", isPremium: true, contentWarnings: ["Explicit sexual content", "Graphic violence", "Dubious consent themes"], year: 2023, genres: ["Fantasy", "Drama"], featured: false, author: "L. Chen", synopsis: "Heir to a fallen sect, a cultivator ferments forbidden desire into power.", rating: 4.5, ratingCount: 1130, views: 73400 },
  { title: "Velvet Hours", slug: "velvet-hours", type: "MANGA", status: "ONGOING", intensity: "HIGH", isPremium: false, contentWarnings: ["Explicit sexual content"], year: 2020, genres: ["Romance", "Comedy"], featured: false, author: "H. Okada", synopsis: "A late-night radio host and her most loyal caller finally meet in person.", rating: 4.4, ratingCount: 970, views: 51220 },
  { title: "Hollow Crown", slug: "hollow-crown", type: "MANHWA", status: "HIATUS", intensity: "VERY_HIGH", isPremium: false, contentWarnings: ["Graphic violence", "Explicit sexual content"], year: 2018, genres: ["Drama", "Fantasy"], featured: false, author: "D. Park", synopsis: "A disgraced knight bears a cursed crown — and the appetites that come with it.", rating: 4.1, ratingCount: 640, views: 39980 },
  { title: "Paper Lanterns", slug: "paper-lanterns", type: "MANGA", status: "COMPLETED", intensity: "MODERATE", isPremium: false, contentWarnings: ["Suggestive themes"], year: 2017, genres: ["Romance", "Slice of Life"], featured: false, author: "M. Aoyama", synopsis: "Two former classmates reconnect years later at a summer festival.", rating: 4.7, ratingCount: 1510, views: 88760 },
];

// NOTE: These are thorough starting templates — replace bracketed placeholders
// ([Operator], emails, [Country/State]) and have a lawyer review before launch.
const SITE = "Adult Manga Verse";
const STATIC_PAGES: { slug: string; title: string; contentHtml: string }[] = [
  {
    slug: "about",
    title: `About ${SITE}`,
    contentHtml: `
<p><strong>${SITE}</strong> is an 18+ platform for reading adult manga, manhwa, and manhua online. We bring together explicit comics for an adult audience in a fast, modern, mobile-first reader.</p>
<h2>What we do</h2>
<p>We provide a curated, searchable library of adult comics with content-intensity ratings, so readers always know what to expect before they open a title. Every title is free to read for everyone — members can also bookmark series, track their reading progress, and leave reviews. Premium and VIP plans remove ads and add offline reading, early access to new chapters, and higher-resolution pages, but never lock content behind a paywall.</p>
<h2>Adults only</h2>
<p>This website is strictly for adults aged 18 or older (or the age of majority in your jurisdiction, whichever is higher). Access requires age verification, and the site is not directed to, or intended for, minors. Content depicting minors, real or fictional, in a sexual or suggestive context is strictly prohibited — see our <a href="/p/content-policy">Content Policy</a>.</p>
<h2>How content works here</h2>
<p>We don't claim ownership of the works featured here. Wherever possible, the original author or publisher is credited and linked on each title's page so you can support them directly. If you're a rights holder, our <a href="/p/dmca">DMCA page</a> explains how to request changes or removal.</p>
<h2>Get in touch</h2>
<ul>
<li>General &amp; support: <a href="mailto:support@example.com">support@example.com</a></li>
<li>Copyright / DMCA: <a href="/p/dmca">DMCA page</a></li>
<li>Report content: <a href="mailto:abuse@example.com">abuse@example.com</a></li>
</ul>`,
  },
  {
    slug: "contact",
    title: "Contact Us",
    contentHtml: `
<p>We're happy to help. Please use the address that best matches your request so we can route it quickly.</p>
<h2>Support &amp; general enquiries</h2>
<p><a href="mailto:support@example.com">support@example.com</a> — account issues, billing questions, technical problems, and feedback.</p>
<h2>Copyright / DMCA</h2>
<p><a href="mailto:dmca@example.com">dmca@example.com</a> — copyright takedown notices and counter-notices. See our <a href="/p/dmca">DMCA policy</a> for the required information.</p>
<h2>Report content or abuse</h2>
<p><a href="mailto:abuse@example.com">abuse@example.com</a> — to report content you believe violates our <a href="/p/content-policy">Content Policy</a> (for example, anything that appears to involve a minor or non-consensual acts). Reports are treated seriously and confidentially.</p>
<h2>Privacy requests</h2>
<p><a href="mailto:privacy@example.com">privacy@example.com</a> — to access, correct, or delete your personal data. See our <a href="/p/privacy">Privacy Policy</a>.</p>
<h2>Response times</h2>
<p>We aim to respond within 2–3 business days. Urgent safety and legal reports are prioritised.</p>`,
  },
  {
    slug: "content-policy",
    title: "Content Policy",
    contentHtml: `
<p>This Content Policy explains what is and isn't allowed on ${SITE}. It applies to all content on the platform, which is published by the operator.</p>
<h2>1. Adults only, adults only</h2>
<p>${SITE} contains sexually explicit material intended solely for adults. <strong>Content that depicts, or appears to depict, a minor in a sexual or suggestive context is strictly prohibited</strong> and will be removed and reported to the appropriate authorities.</p>
<h2>2. Strictly prohibited content</h2>
<p>We do not allow, and will remove, any content that involves or depicts:</p>
<ul>
<li>Minors (real or fictional) in any sexual or suggestive context — zero tolerance;</li>
<li>Non-consensual acts presented as real, including actual rape or sexual assault;</li>
<li>Real sexual violence, trafficking, or coercion;</li>
<li>Bestiality involving real animals;</li>
<li>Content that is otherwise illegal in the operator's jurisdiction.</li>
</ul>
<h2>3. Content-intensity ratings</h2>
<p>Titles are labelled by intensity (Moderate, High, Very High, Extreme) and may carry content warnings. These are guidance only; all content on the platform is intended for adults.</p>
<h2>4. Ownership &amp; supporting creators</h2>
<p>We do not claim ownership of the works featured on this platform. Wherever possible, the original author or publisher is credited and linked on each title's page so you can support them directly. If you are a rights holder and would like your work credited differently or removed, please see our <a href="/p/dmca">DMCA page</a>.</p>
<h2>5. Reporting &amp; removal</h2>
<p>If you believe any content violates this policy, report it to <a href="mailto:abuse@example.com">abuse@example.com</a> with the URL and a short description. We review reports promptly and remove violating content. For copyright issues, use our <a href="/p/dmca">DMCA process</a>.</p>`,
  },
  {
    slug: "dmca",
    title: "DMCA / Copyright Policy",
    contentHtml: `
<p>${SITE} respects the intellectual-property rights of others and responds to clear notices of alleged copyright infringement under the U.S. Digital Millennium Copyright Act (DMCA) and comparable laws.</p>
<h2>Filing a takedown notice</h2>
<p>If you are a copyright owner (or authorised to act for one) and believe content on this site infringes your copyright, send a written notice to our agent at <a href="mailto:dmca@example.com">dmca@example.com</a> that includes:</p>
<ol>
<li>A physical or electronic signature of the copyright owner or authorised agent;</li>
<li>Identification of the copyrighted work claimed to be infringed;</li>
<li>The exact URL(s) of the material you want removed, with enough detail to locate it;</li>
<li>Your name, address, telephone number, and email address;</li>
<li>A statement that you have a good-faith belief the use is not authorised by the owner, its agent, or the law;</li>
<li>A statement, under penalty of perjury, that the information is accurate and that you are the owner or authorised to act on the owner's behalf.</li>
</ol>
<h2>Counter-notification</h2>
<p>If your content was removed and you believe this was a mistake or misidentification, you may send a counter-notice to <a href="mailto:dmca@example.com">dmca@example.com</a> including your signature, identification of the removed material and its former location, a statement under penalty of perjury that you have a good-faith belief it was removed by mistake, and your contact details and consent to jurisdiction.</p>
<h2>Repeat infringers</h2>
<p>We will, in appropriate circumstances, disable or terminate accounts of users who are repeat infringers.</p>
<h2>Designated agent</h2>
<p>DMCA Agent, [Operator Legal Name], [Address] — <a href="mailto:dmca@example.com">dmca@example.com</a>.</p>`,
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    contentHtml: `
<p>This Privacy Policy explains how ${SITE} ("we", "us") collects, uses, and protects your information. By using the site you agree to this policy.</p>
<h2>Information we collect</h2>
<ul>
<li><strong>Account data:</strong> your email address and a securely hashed password (we never store your password in plain text), and an optional display name.</li>
<li><strong>Activity data:</strong> bookmarks, reading progress, ratings, reviews, and comments you create.</li>
<li><strong>Subscription data:</strong> your plan tier. Payment card details, if/when checkout is enabled, are handled by our payment processor — we do not store full card numbers.</li>
<li><strong>Technical data:</strong> server logs (IP address, browser type, timestamps) used for security and diagnostics.</li>
<li><strong>On-device data:</strong> your age-verification confirmation is stored in your browser's local storage, not on our servers.</li>
</ul>
<h2>How we use your information</h2>
<ul>
<li>To provide and secure the service (accounts, bookmarks, progress, subscription plan);</li>
<li>To moderate comments and enforce our <a href="/p/content-policy">Content Policy</a> and <a href="/p/terms">Terms</a>;</li>
<li>To respond to your requests and communicate service updates;</li>
<li>To understand aggregate usage (if analytics are enabled by the operator).</li>
</ul>
<h2>Cookies &amp; similar technologies</h2>
<p>We use a strictly necessary session cookie to keep you signed in. If the operator enables analytics, additional cookies may be set by that provider. Your age-gate confirmation lives in local storage on your device.</p>
<h2>Sharing &amp; third parties</h2>
<p>We do not sell your personal data. We share it only with service providers that help us run the platform (for example, our database host, media storage/CDN, and — if enabled — analytics and payment processors), and where required by law.</p>
<h2>Data retention</h2>
<p>We keep account data while your account is active. When you delete your account, we remove your personal data except where we must retain limited records to comply with legal obligations.</p>
<h2>Your rights</h2>
<p>Depending on your location, you may have the right to access, correct, export, or delete your personal data, and to object to or restrict certain processing. To exercise these rights, contact <a href="mailto:privacy@example.com">privacy@example.com</a>.</p>
<h2>Children</h2>
<p>This is an 18+ service. We do not knowingly collect data from anyone under 18. If you believe a minor has provided us data, contact us and we will delete it.</p>
<h2>Security</h2>
<p>We use industry-standard measures (hashed passwords, encrypted connections, access controls) to protect your data. No method is 100% secure, but we work to protect your information.</p>
<h2>Changes</h2>
<p>We may update this policy; material changes will be posted here with a new effective date.</p>
<h2>Contact</h2>
<p>Questions? Email <a href="mailto:privacy@example.com">privacy@example.com</a>.</p>`,
  },
  {
    slug: "terms",
    title: "Terms of Service",
    contentHtml: `
<p>These Terms of Service ("Terms") govern your use of ${SITE} (the "Service"). By accessing or using the Service you agree to these Terms. If you do not agree, do not use the Service.</p>
<h2>1. Eligibility &amp; age</h2>
<p>The Service contains explicit adult content. You must be at least 18 years old (or the age of majority in your jurisdiction, whichever is higher) and it must be legal for you to view adult content where you live. By using the Service you confirm you meet these requirements.</p>
<h2>2. Your account</h2>
<p>You are responsible for your account and for keeping your password confidential. Do not share your account or let anyone under 18 use it. Notify us of any unauthorised use.</p>
<h2>3. Acceptable use</h2>
<p>You agree not to: attempt to access minors' or others' accounts; scrape, copy, or redistribute content; upload malware; harass other users; post illegal content in comments or reviews; or circumvent access controls or the age gate. Comments are moderated and may be removed.</p>
<h2>4. Content &amp; intellectual property</h2>
<p>We do not claim ownership of the manga, manhwa, and manhua featured on the Service — rights remain with the original author or publisher, credited and linked where possible (see our <a href="/p/dmca">DMCA page</a> for rights-holder requests). Your access is a personal, non-transferable, revocable licence to view content on the Service for your own use; you may not scrape, copy, redistribute, or download it. Content you submit (comments, reviews) grants us a licence to display it on the Service; you are responsible for what you post.</p>
<h2>5. Subscriptions &amp; billing</h2>
<p>Free, Premium, and VIP tiers are described on the <a href="/subscribe">Subscribe</a> page. Every title on the Service is free to read regardless of plan — Premium and VIP do not unlock any exclusive content. They remove ads and add convenience perks such as offline reading, early access to new chapters, and higher-resolution pages. Where paid subscriptions are offered, pricing, renewals, and cancellation terms will be presented at checkout.</p>
<h2>6. Disclaimers</h2>
<p>The Service is provided "as is" and "as available" without warranties of any kind. We do not guarantee the Service will be uninterrupted, secure, or error-free.</p>
<h2>7. Limitation of liability</h2>
<p>To the maximum extent permitted by law, ${SITE} and the operator will not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>
<h2>8. Termination</h2>
<p>We may suspend or terminate your access at any time for any violation of these Terms or our <a href="/p/content-policy">Content Policy</a>.</p>
<h2>9. Governing law</h2>
<p>These Terms are governed by the laws of [Country/State], without regard to conflict-of-laws rules.</p>
<h2>10. Changes</h2>
<p>We may update these Terms from time to time; continued use after changes means you accept the updated Terms.</p>
<h2>11. Contact</h2>
<p>Questions about these Terms? Email <a href="mailto:support@example.com">support@example.com</a>.</p>`,
  },
];

async function seedStaticPages() {
  for (const p of STATIC_PAGES) {
    await prisma.staticPage.upsert({
      where: { slug: p.slug },
      update: { title: p.title, contentHtml: p.contentHtml },
      create: { slug: p.slug, title: p.title, contentHtml: p.contentHtml },
    });
  }
}

async function reset() {
  await prisma.comment.deleteMany();
  await prisma.readProgress.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.page.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.manga.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.slugRedirect.deleteMany();
  // Users are upserted below, no wipe needed.
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  console.log("[SEED] Resetting content tables...");
  await reset();

  console.log("[SEED] Genres...");
  const genreMap = new Map<string, string>();
  for (const name of GENRES) {
    const g = await prisma.genre.create({ data: { name, slug: slugify(name) } });
    genreMap.set(name, g.id);
  }

  console.log("[SEED] Users (admin + demo reader)...");
  const adminEmail = process.env.ADMIN_EMAIL || "admin@mangablue.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "MangaBlue!Admin1";
  const demoPassword = "MangaBlue!User1";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", passwordHash: await hash(adminPassword) },
    create: {
      email: adminEmail,
      name: "Site Admin",
      role: "ADMIN",
      passwordHash: await hash(adminPassword),
    },
  });
  await prisma.user.upsert({
    where: { email: "reader@mangablue.local" },
    update: { role: "USER", passwordHash: await hash(demoPassword) },
    create: {
      email: "reader@mangablue.local",
      name: "Demo Reader",
      role: "USER",
      passwordHash: await hash(demoPassword),
    },
  });

  console.log("[SEED] Manga + chapters + pages (generating placeholder images)...");
  let colorIdx = 0;
  for (const m of MANGA) {
    const coverUrl = await makeCover(m.slug, m.title, m.type, colorIdx++);
    const manga = await prisma.manga.create({
      data: {
        title: m.title,
        slug: m.slug,
        altTitles: [`${m.title} (${m.type})`],
        synopsis: m.synopsis,
        coverUrl,
        author: m.author,
        authorLink: m.authorLink ?? null,
        artist: m.author,
        status: m.status,
        type: m.type,
        intensity: m.intensity,
        isPremium: m.isPremium,
        contentWarnings: m.contentWarnings,
        releaseYear: m.year,
        rating: m.rating,
        ratingCount: m.ratingCount,
        views: m.views,
        featured: m.featured,
        published: true,
        genres: { connect: m.genres.map((name) => ({ id: genreMap.get(name)! })) },
      },
    });

    for (let chNum = 1; chNum <= 2; chNum++) {
      const publishedAt = new Date(Date.now() - (2 - chNum) * 36 * 3600 * 1000);
      const chapter = await prisma.chapter.create({
        data: {
          mangaId: manga.id,
          number: chNum,
          title: chNum === 1 ? "Prologue" : `Chapter ${chNum}`,
          publishedAt,
          views: Math.floor(m.views / (chNum + 2)),
        },
      });
      for (let i = 1; i <= 4; i++) {
        const imageUrl = await makePage(m.slug, chNum, i, m.title);
        await prisma.page.create({
          data: { chapterId: chapter.id, index: i, imageUrl, width: 800, height: 1200 },
        });
      }
    }
    console.log(`  ✓ ${m.title} (${m.slug})`);
  }

  console.log("[SEED] Static pages...");
  await seedStaticPages();

  console.log("\n[SEED] Done.");
  console.log("  Admin login  : admin@mangablue.local  /  " + adminPassword);
  console.log("  Reader login : reader@mangablue.local /  " + demoPassword);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("[SEED] Failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
