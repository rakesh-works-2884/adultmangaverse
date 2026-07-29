import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import type { Prisma } from "@/generated/prisma/client";
import { UserManager, type AdminUser } from "@/components/admin/UserManager";
import { adminInput, btnSecondary } from "@/components/admin/styles";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const where: Prisma.UserWhereInput = query
    ? { OR: [{ email: { contains: query, mode: "insensitive" } }, { name: { contains: query, mode: "insensitive" } }] }
    : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, email: true, name: true, role: true, tier: true, banned: true, createdAt: true },
  });

  const rows: AdminUser[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    tier: u.tier,
    banned: u.banned,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-text-muted">{users.length} shown</p>
      </div>

      <form className="flex gap-2" action="/admin/users">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <input name="q" defaultValue={query} placeholder="Search by email or name…" className={`${adminInput} pl-9`} />
        </div>
        <button type="submit" className={btnSecondary}>Search</button>
      </form>

      <UserManager users={rows} currentUserId={session!.user.id} />
    </div>
  );
}
