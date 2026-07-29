import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  BookText,
  Layers,
  Tags,
  Users,
  MessageSquare,
  FileText,
  Search,
  Settings,
  FolderArchive,
  Newspaper,
  DollarSign,
} from "lucide-react";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/admin/SignOutButton";

const adminNav = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Revenue", href: "/admin/revenue", icon: DollarSign },
  { label: "Manga", href: "/admin/manga", icon: BookText },
  { label: "Bulk Import", href: "/admin/import", icon: FolderArchive },
  { label: "Chapters", href: "/admin/chapters", icon: Layers },
  { label: "Genres", href: "/admin/genres", icon: Tags },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Comments", href: "/admin/comments", icon: MessageSquare },
  { label: "Blog", href: "/admin/blogs", icon: Newspaper },
  { label: "Pages", href: "/admin/pages", icon: FileText },
  { label: "SEO", href: "/admin/seo", icon: Search },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth: middleware already gates /admin, but re-check here
  // server-side (Rules.md §2 — never trust the client / a single gate).
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN" && session.user.role !== "MOD") redirect("/");

  return (
    <div className="min-h-screen bg-bg">
      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-bg-soft md:flex">
          <div className="flex h-16 items-center gap-2 border-b border-border px-5">
            <span className="font-heading text-lg font-bold tracking-tight">
              <span className="text-foreground">Adult Manga</span>
              <span className="text-primary">Verse</span>
            </span>
            <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Admin
            </span>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
            {adminNav.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                <Icon className="size-[18px]" strokeWidth={1.5} />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-bg/80 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-sm text-text-muted transition-colors hover:text-foreground">
                ← View site
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-text-muted sm:inline">
                {session.user.email}{" "}
                <span className="rounded bg-surface px-1.5 py-0.5 text-xs font-medium text-highlight">
                  {session.user.role}
                </span>
              </span>
              <SignOutButton />
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
