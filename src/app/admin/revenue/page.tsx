import Link from "next/link";
import { DollarSign, Receipt, TrendingUp, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { btnSecondary } from "@/components/admin/styles";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  waiting: "Awaiting payment",
  confirming: "Confirming",
  confirmed: "Confirmed",
  sending: "Sending",
  partially_paid: "Partially paid",
  finished: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  expired: "Expired",
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 3600 * 1000);

  // Only "finished" is real, realized revenue (see the NOWPayments webhook) —
  // everything else (waiting/confirming/failed/expired…) is tracking state,
  // not money that actually landed.
  const [totalAgg, todayAgg, monthAgg, byTier, payingUsers, recentFinished, txTotal, transactions] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "finished" }, _sum: { amountUsd: true }, _count: true }),
    prisma.payment.aggregate({ where: { status: "finished", createdAt: { gte: todayStart } }, _sum: { amountUsd: true } }),
    prisma.payment.aggregate({ where: { status: "finished", createdAt: { gte: monthStart } }, _sum: { amountUsd: true } }),
    prisma.payment.groupBy({ by: ["tier"], where: { status: "finished" }, _sum: { amountUsd: true }, _count: true }),
    prisma.payment.groupBy({ by: ["userId"], where: { status: "finished" } }),
    prisma.payment.findMany({
      where: { status: "finished", createdAt: { gte: thirtyDaysAgo } },
      select: { amountUsd: true, createdAt: true },
    }),
    prisma.payment.count(),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        tier: true,
        months: true,
        amountUsd: true,
        status: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
      },
    }),
  ]);

  // Bucket the last 30 days into daily totals for the trend bars.
  const days: { label: string; total: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = startOfDay(new Date(now.getTime() - i * 24 * 3600 * 1000));
    const next = new Date(day.getTime() + 24 * 3600 * 1000);
    const total = recentFinished
      .filter((p) => p.createdAt >= day && p.createdAt < next)
      .reduce((sum, p) => sum + Number(p.amountUsd), 0);
    days.push({ label: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }), total });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.total));

  const totalPages = Math.max(1, Math.ceil(txTotal / PAGE_SIZE));
  const pageHref = (p: number) => `/admin/revenue?page=${p}`;

  const stats = [
    { label: "Total revenue", value: usd.format(Number(totalAgg._sum.amountUsd ?? 0)), icon: DollarSign },
    { label: "This month", value: usd.format(Number(monthAgg._sum.amountUsd ?? 0)), icon: TrendingUp },
    { label: "Today", value: usd.format(Number(todayAgg._sum.amountUsd ?? 0)), icon: Receipt },
    { label: "Paying customers", value: payingUsers.length.toLocaleString(), icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Revenue</h1>
        <p className="mt-1 text-sm text-text-muted">
          {totalAgg._count} completed payment{totalAgg._count === 1 ? "" : "s"} total, via NOWPayments (crypto).
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">{label}</span>
              <Icon className="size-5 text-primary" strokeWidth={1.5} />
            </div>
            <p className="mt-2 font-heading text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* By tier */}
      <div className="grid gap-4 sm:grid-cols-2">
        {byTier.length === 0 ? (
          <p className="text-sm text-text-muted sm:col-span-2">No completed payments yet.</p>
        ) : (
          byTier.map((t) => (
            <div key={t.tier} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="font-heading text-sm font-semibold">{t.tier}</span>
                <span className="text-xs text-text-muted">{t._count} payment{t._count === 1 ? "" : "s"}</span>
              </div>
              <p className="mt-1 font-heading text-xl font-bold text-primary">{usd.format(Number(t._sum.amountUsd ?? 0))}</p>
            </div>
          ))
        )}
      </div>

      {/* 30-day trend */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-heading text-sm font-semibold">Last 30 days</h2>
        <div className="flex h-32 items-end gap-1">
          {days.map((d) => (
            <div key={d.label} className="group relative flex-1">
              <div
                className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                style={{ height: `${Math.max(2, (d.total / maxDay) * 100)}%` }}
              />
              <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-bg px-2 py-1 text-[10px] text-foreground shadow-[0_4px_16px_rgb(0_0_0/0.4)] group-hover:block">
                {d.label}: {usd.format(d.total)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-bg-soft text-left text-text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Plan</th>
              <th className="px-4 py-2.5 font-medium">Amount</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-muted">No transactions yet.</td>
              </tr>
            ) : (
              transactions.map((p) => (
                <tr key={p.id} className="border-t border-border odd:bg-surface/40">
                  <td className="px-4 py-2.5 text-text-muted">{p.createdAt.toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">{p.user.name || p.user.email}</td>
                  <td className="px-4 py-2.5">{p.tier} · {p.months} mo</td>
                  <td className="px-4 py-2.5 font-medium">{usd.format(Number(p.amountUsd))}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        p.status === "finished"
                          ? "text-success"
                          : p.status === "failed" || p.status === "expired"
                            ? "text-danger"
                            : "text-text-muted"
                      }
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            {currentPage > 1 ? <Link href={pageHref(currentPage - 1)} className={btnSecondary}>Previous</Link> : null}
            {currentPage < totalPages ? <Link href={pageHref(currentPage + 1)} className={btnSecondary}>Next</Link> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
