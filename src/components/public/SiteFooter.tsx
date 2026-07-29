import Link from "next/link";
import { Mail } from "lucide-react";
import { siteConfig } from "@/lib/site";

const footerLinks = [
  { label: "About", href: "/p/about" },
  { label: "Contact", href: "/p/contact" },
  { label: "Content Policy", href: "/p/content-policy" },
  { label: "DMCA", href: "/p/dmca" },
  { label: "Privacy", href: "/p/privacy" },
  { label: "Terms", href: "/p/terms" },
];

// TODO: swap in the real invite URL / support address when available.
const socialLinks = [
  { label: "Discord", href: "#", icon: DiscordIcon },
  { label: "Email", href: "mailto:", icon: Mail },
];

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.246.195.373.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028ZM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.311-.956 2.38-2.157 2.38Zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.311-.947 2.38-2.157 2.38Z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-border bg-bg-soft">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded bg-primary font-heading text-[10px] font-bold text-primary-foreground">
              18+
            </span>
            <span className="font-heading text-lg font-bold">{siteConfig.name}</span>
          </div>
          <p className="max-w-sm text-sm text-text-muted">{siteConfig.description}</p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {footerLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-text-muted transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {socialLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.href.startsWith("mailto:") ? undefined : "_blank"}
              rel={item.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
              aria-label={item.label}
              title={item.label}
              className="btn-3d-ghost grid size-9 place-items-center rounded-lg border border-border text-text-muted transition-colors duration-200 hover:border-primary/50 hover:text-highlight"
            >
              <item.icon className="size-4" />
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl space-y-1 px-4 py-5 text-xs text-text-muted sm:px-6">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. We don&apos;t claim ownership of the works featured here — the
            original author or publisher is credited and linked on each title&apos;s page so you can support them
            directly.
          </p>
          <p>
            18+ only. This site contains adult material intended solely for adults.
          </p>
        </div>
      </div>
    </footer>
  );
}
