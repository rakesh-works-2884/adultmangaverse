"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";

export interface SeoAuditIssue {
  id: string;
  type: "manga" | "blog" | "page";
  title: string;
  editUrl: string;
  severity: "error" | "warning";
  message: string;
}

export interface SeoAuditReport {
  score: number; // 0..100
  totalAnalyzed: number;
  totalErrors: number;
  totalWarnings: number;
  totalPassed: number;
  issues: SeoAuditIssue[];
  scannedAt: string;
}

/**
 * Server action to run a site-wide SEO audit scan across all Manga, Blogs, and Pages.
 */
export async function runSeoAudit(): Promise<{ ok: boolean; report?: SeoAuditReport; error?: string }> {
  try {
    await requireAdmin();

    const [mangaList, blogList, pageList] = await Promise.all([
      prisma.manga.findMany({ select: { id: true, title: true, slug: true, seoTitle: true, seoDescription: true, focusKeyword: true, coverUrl: true, synopsis: true } }),
      prisma.blog.findMany({ select: { id: true, title: true, slug: true, seoTitle: true, seoDescription: true, focusKeyword: true, coverImage: true, contentHtml: true } }),
      prisma.staticPage.findMany({ select: { id: true, title: true, slug: true, seoTitle: true, seoDescription: true, focusKeyword: true, contentHtml: true } }),
    ]);

    const issues: SeoAuditIssue[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    // Scan Manga
    for (const item of mangaList) {
      const editUrl = `/admin/manga/${item.id}/edit`;
      
      // Check 1: Meta Description
      totalChecks++;
      if (!item.seoDescription) {
        issues.push({
          id: `manga-desc-${item.id}`,
          type: "manga",
          title: item.title,
          editUrl,
          severity: "warning",
          message: "Missing SEO Meta Description (falling back to generic synopsis snippet).",
        });
      } else {
        passedChecks++;
      }

      // Check 2: Focus Keyword
      totalChecks++;
      if (!item.focusKeyword) {
        issues.push({
          id: `manga-kw-${item.id}`,
          type: "manga",
          title: item.title,
          editUrl,
          severity: "warning",
          message: "No Focus Keyword specified for SEO analysis.",
        });
      } else {
        passedChecks++;
      }

      // Check 3: Cover Image
      totalChecks++;
      if (!item.coverUrl) {
        issues.push({
          id: `manga-img-${item.id}`,
          type: "manga",
          title: item.title,
          editUrl,
          severity: "error",
          message: "Missing cover image (required for OpenGraph & Twitter preview cards).",
        });
      } else {
        passedChecks++;
      }
    }

    // Scan Blog Posts
    for (const item of blogList) {
      const editUrl = `/admin/blogs/${item.id}/edit`;

      // Check 1: Meta Description
      totalChecks++;
      if (!item.seoDescription) {
        issues.push({
          id: `blog-desc-${item.id}`,
          type: "blog",
          title: item.title,
          editUrl,
          severity: "warning",
          message: "Missing SEO Meta Description.",
        });
      } else {
        passedChecks++;
      }

      // Check 2: Focus Keyword
      totalChecks++;
      if (!item.focusKeyword) {
        issues.push({
          id: `blog-kw-${item.id}`,
          type: "blog",
          title: item.title,
          editUrl,
          severity: "warning",
          message: "No Focus Keyword assigned.",
        });
      } else {
        passedChecks++;
      }

      // Check 3: Cover Image
      totalChecks++;
      if (!item.coverImage) {
        issues.push({
          id: `blog-img-${item.id}`,
          type: "blog",
          title: item.title,
          editUrl,
          severity: "error",
          message: "Missing blog post cover image.",
        });
      } else {
        passedChecks++;
      }
    }

    // Scan Static Pages
    for (const item of pageList) {
      const editUrl = `/admin/pages/${item.id}/edit`;
      totalChecks++;
      if (!item.seoDescription) {
        issues.push({
          id: `page-desc-${item.id}`,
          type: "page",
          title: item.title,
          editUrl,
          severity: "warning",
          message: "Missing custom Meta Description.",
        });
      } else {
        passedChecks++;
      }
    }

    const totalAnalyzed = mangaList.length + blogList.length + pageList.length;
    const errors = issues.filter((i) => i.severity === "error").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;
    const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

    return {
      ok: true,
      report: {
        score,
        totalAnalyzed,
        totalErrors: errors,
        totalWarnings: warnings,
        totalPassed: passedChecks,
        issues,
        scannedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Get all SEO Redirection rules.
 */
export async function getSeoRedirects() {
  await requireAdmin();
  return prisma.seoRedirect.findMany({ orderBy: { updatedAt: "desc" } });
}

/**
 * Save or create a 301/302 Redirect Rule.
 */
export async function saveSeoRedirect(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const sourceUrl = String(fd.get("sourceUrl") ?? "").trim();
    const destinationUrl = String(fd.get("destinationUrl") ?? "").trim();
    const statusCode = Number(fd.get("statusCode") ?? 301);

    if (!sourceUrl || !destinationUrl) {
      return { ok: false, error: "Source URL and Destination URL are required." };
    }

    await prisma.seoRedirect.upsert({
      where: { sourceUrl },
      create: { sourceUrl, destinationUrl, statusCode },
      update: { destinationUrl, statusCode },
    });

    revalidatePath("/admin/seo");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Delete a redirect rule.
 */
export async function deleteSeoRedirect(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.seoRedirect.delete({ where: { id } });
    revalidatePath("/admin/seo");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Get all 404 error logs.
 */
export async function get404Logs() {
  await requireAdmin();
  return prisma.seo404Log.findMany({ orderBy: { hits: "desc" }, take: 100 });
}

/**
 * Clear all 404 error logs.
 */
export async function clear404Logs(): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.seo404Log.deleteMany();
    revalidatePath("/admin/seo");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * 1-Click Convert 404 error into a 301 Redirect.
 */
export async function convert404ToRedirect(logId: string, destinationUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const log = await prisma.seo404Log.findUnique({ where: { id: logId } });
    if (!log) return { ok: false, error: "Log entry not found." };

    await prisma.$transaction([
      prisma.seoRedirect.upsert({
        where: { sourceUrl: log.url },
        create: { sourceUrl: log.url, destinationUrl, statusCode: 301 },
        update: { destinationUrl, statusCode: 301 },
      }),
      prisma.seo404Log.delete({ where: { id: logId } }),
    ]);

    revalidatePath("/admin/seo");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
