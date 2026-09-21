import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import { FolderArchive } from "lucide-react";
import { BulkImportForm } from "@/components/admin/BulkImportForm";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  if (!(await requireAdmin())) redirect("/");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold">
          <FolderArchive className="size-6 text-primary" /> Bulk Import
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Upload a .zip of numbered page images to add a chapter. XML metadata is optional; without it, the ZIP filename becomes the title.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 text-sm">
        <p className="mb-3 font-semibold">Expected ZIP layout</p>
        <pre className="overflow-x-auto rounded-lg bg-bg-soft p-3 text-xs leading-relaxed text-text-muted">
{`upload.zip
├─ info.xml       (optional ComicInfo-style metadata)
├─ 001.jpg
├─ 002.jpg
├─ 003.jpg
└─ ...            (any sortable filenames, any nesting is fine)`}
        </pre>
        <p className="mt-3 text-xs text-text-muted">
          Images are sorted in natural numeric order. The <strong className="text-foreground">first image is used as the cover</strong> and is
          also kept as page 1 of the chapter.
        </p>

        <p className="mt-4 mb-2 font-semibold">Optional XML fields</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-xs">
            <thead className="text-left text-text-muted">
              <tr>
                <th className="py-1 pr-4">Tag</th>
                <th className="py-1 pr-4">Used for</th>
              </tr>
            </thead>
            <tbody className="text-text-muted">
              <tr><td className="py-1 pr-4 text-foreground">&lt;Title&gt;</td><td className="py-1">Required. Also determines the slug and whether this ZIP creates a new title or adds a chapter to an existing one.</td></tr>
              <tr><td className="py-1 pr-4 text-foreground">&lt;Year&gt;</td><td className="py-1">Release year</td></tr>
              <tr><td className="py-1 pr-4 text-foreground">&lt;Writer&gt;</td><td className="py-1">Author</td></tr>
              <tr><td className="py-1 pr-4 text-foreground">&lt;Web&gt;</td><td className="py-1">Author/publisher link (must start with http:// or https://)</td></tr>
              <tr><td className="py-1 pr-4 text-foreground">&lt;Tags&gt;</td><td className="py-1">Genres — comma-separated, an optional leading &quot;category:&quot; label is stripped. Matched to existing genres or created.</td></tr>
              <tr><td className="py-1 pr-4 text-foreground">Notes, Month, Day, PageCount, LanguageISO, Format, Manga</td><td className="py-1">Present in the file if you have them, but not currently used.</td></tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-text-muted">
          <strong className="text-foreground">Re-uploading with a title that already exists adds a new chapter</strong> (numbered after the
          current highest chapter) instead of creating a duplicate — upload one ZIP per chapter as new chapters become available. New titles
          and new chapters both import <strong className="text-foreground">unpublished</strong> — review and publish from the manga editor.
        </p>
      </div>

      <BulkImportForm />
    </div>
  );
}
