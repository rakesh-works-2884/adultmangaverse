import type { NextConfig } from "next";

// Allow next/image to optimize images served from the R2 public bucket (prod).
function r2RemotePatterns() {
  const u = process.env.R2_PUBLIC_URL;
  if (!u) return [];
  try {
    const url = new URL(u);
    return [{ protocol: url.protocol.replace(":", "") as "http" | "https", hostname: url.hostname }];
  } catch {
    return [];
  }
}

// Hosts a Server Action may be POSTed from. Next.js CSRF-checks every Server
// Action by comparing the browser's `Origin` against `Host` / `X-Forwarded-Host`;
// behind a reverse proxy (Hostinger, nginx, Cloudflare) those two routinely
// disagree — the proxy forwards the public domain while Node sees its own —
// and the action is aborted before it runs. The client only ever sees the
// generic "An error occurred in the Server Components render" message.
// Listing our own domain here is the documented remedy. Read from env so no
// domain is hard-coded; set NEXT_PUBLIC_SITE_URL in the deployment *before*
// building, since this is baked into the build.
function serverActionOrigins(): string[] {
  const hosts = new Set<string>();
  for (const raw of [process.env.NEXT_PUBLIC_SITE_URL, process.env.AUTH_URL, process.env.NEXTAUTH_URL]) {
    if (!raw) continue;
    try {
      const { host, hostname } = new URL(raw.includes("://") ? raw : `https://${raw}`);
      const bare = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
      hosts.add(host);
      hosts.add(bare);
      hosts.add(`www.${bare}`);
      hosts.add(`*.${bare}`);
    } catch {
      // Malformed URL in env — nothing to allow.
    }
  }
  return [...hosts];
}

const nextConfig: NextConfig = {
  // Login Server Actions receive passwords; never print their arguments in dev.
  logging: { serverFunctions: false },
  // Lean container output (Dockerfile copies .next/standalone).
  output: "standalone",
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  // sharp ships a native .node with sibling DLLs; bundling it via Turbopack
  // breaks the Windows loader (ERR_DLOPEN_FAILED). Keep it external so Next
  // requires it normally at runtime. Same for the Prisma driver adapter.
  serverExternalPackages: ["sharp", "@prisma/adapter-pg", "@napi-rs/canvas", "pdf-to-img", "pdfjs-dist"],
  compress: true,
  reactStrictMode: true,
  images: { formats: ["image/avif", "image/webp"], remotePatterns: r2RemotePatterns() },
  experimental: {
    // Uploads go through Server Actions: images ≤10MB, and chapter PDFs can
    // be larger, so raise the default 1MB Server Action body limit.
    serverActions: {
      bodySizeLimit: "25mb",
      allowedOrigins: serverActionOrigins(),
    },
    // Per-icon/per-function imports instead of pulling in the whole barrel
    // file — smaller client JS, which matters most on mobile (parse/exec
    // time, not just download).
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  async headers() {
    return [
      {
        // Baseline hardening on every response. No CSP here deliberately —
        // the admin-configurable analytics snippet (Settings → SEO) injects
        // arbitrary <script> HTML by design, so a strict CSP would need to
        // special-case that before it could ship without breaking it.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        // Never let the browser HTTP-cache the worker script itself — the
        // update check needs to see byte changes on deploy, or clients get
        // stuck running a stale offline-reading implementation.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
