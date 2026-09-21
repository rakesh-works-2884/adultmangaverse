import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { StaticPageForm, type StaticPageInitial } from "@/components/admin/StaticPageForm";

export const dynamic = "force-dynamic";

export default async function EditStaticPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) redirect("/");
  const { id } = await params;
  const page = await prisma.staticPage.findUnique({ where: { id } });
  if (!page) notFound();

  const initial: StaticPageInitial = {
    id: page.id,
    title: page.title,
    slug: page.slug,
    contentHtml: page.contentHtml,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    focusKeyword: page.focusKeyword,
    canonicalUrl: page.canonicalUrl,
    noindex: page.noindex,
    nofollow: page.nofollow,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/pages" className="mb-2 inline-flex items-center gap-1 text-sm text-text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to pages
        </Link>
        <h1 className="font-heading text-2xl font-semibold">Edit: {page.title}</h1>
      </div>
      <StaticPageForm mode="edit" initial={initial} />
    </div>
  );
}
