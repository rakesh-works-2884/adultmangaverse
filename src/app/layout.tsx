import type { Metadata } from "next";
import { Montserrat, Roboto, Inter } from "next/font/google";
import { siteConfig } from "@/lib/site";
import { getSettings } from "@/lib/settings";
import { AnalyticsInjector } from "@/components/public/AnalyticsInjector";
import { ServiceWorkerRegistrar } from "@/components/public/ServiceWorkerRegistrar";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-roboto",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { analyticsSnippet } = await getSettings();
  return (
    <html lang="en" className={`${montserrat.variable} ${roboto.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-bg text-foreground">
        {children}
        <ServiceWorkerRegistrar />
        {analyticsSnippet ? <AnalyticsInjector snippet={analyticsSnippet} /> : null}
      </body>
    </html>
  );
}
