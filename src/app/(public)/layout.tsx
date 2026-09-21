import { getSettings } from "@/lib/settings";
import { AnalyticsInjector } from "@/components/public/AnalyticsInjector";
import { AlertTriangle } from "lucide-react";
import { getGenresList } from "@/lib/catalog";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { AgeGate } from "@/components/public/AgeGate";
import { SessionProvider } from "@/components/providers/SessionProvider";

// Deliberately no auth() call here. This layout wraps every public page —
// calling a dynamic/cookie-reading API here would force all of them into
// full per-request dynamic rendering (no caching), even pages with no
// session-specific content. Login/account state is read client-side inside
// SiteHeader instead, via SessionProvider.
export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [genres, { analyticsSnippet }] = await Promise.all([getGenresList(), getSettings()]);

  return (
    <SessionProvider>
      <div className="flex min-h-screen flex-col">
        {/* Site-wide 18+ strip (Design.md §3) */}
        <div className="flex items-center justify-center gap-2 bg-danger/10 px-4 py-1.5 text-center text-xs font-medium text-danger">
          <AlertTriangle className="size-3.5 shrink-0" strokeWidth={2} />
          18+ Adults Only — sexually explicit content for mature audiences.
        </div>
        <SiteHeader genres={genres} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <AgeGate />
        {analyticsSnippet ? <AnalyticsInjector snippet={analyticsSnippet} /> : null}
      </div>
    </SessionProvider>
  );
}
