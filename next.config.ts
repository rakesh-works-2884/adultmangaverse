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
  // Enable HTTP compression for faster network responses
  compress: true,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: r2RemotePatterns(),
  },
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
