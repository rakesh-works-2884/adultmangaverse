import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StaticPageForm } from "@/components/admin/StaticPageForm";

export default async function NewStaticPage() {
  if (!(await requireAdmin())) redirect("/");
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/pages" className="mb-2 inline-flex items-center gap-1 text-sm text-text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to pages
        </Link>
        <h1 className="font-heading text-2xl font-semibold">New page</h1>
      </div>
      <StaticPageForm mode="create" />
    </div>
  );
}
