import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BlogForm } from "@/components/admin/BlogForm";

export default function NewBlogPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/blogs" className="mb-2 inline-flex items-center gap-1 text-sm text-text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to blog
        </Link>
        <h1 className="font-heading text-2xl font-semibold">New post</h1>
      </div>
      <BlogForm mode="create" />
    </div>
  );
}
