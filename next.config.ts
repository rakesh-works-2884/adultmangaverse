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

const nextConfig: NextConfig = {
  // Lean container output (Dockerfile copies .next/standalone).
  output: "standalone",
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  // sharp ships a native .node with sibling DLLs; bundling it via Turbopack
  // breaks the Windows loader (ERR_DLOPEN_FAILED). Keep it external so Next
  // requires it normally at runtime. Same for the Prisma driver adapter.
  serverExternalPackages: ["sharp", "@prisma/adapter-pg", "@napi-rs/canvas", "pdf-to-img", "pdfjs-dist"],
  images: { remotePatterns: r2RemotePatterns() },
  experimental: {
    // Uploads go through Server Actions: images ≤10MB, and chapter PDFs can
    // be larger, so raise the default 1MB Server Action body limit.
    serverActions: {
      bodySizeLimit: "25mb",
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
